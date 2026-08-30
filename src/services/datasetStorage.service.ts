import { supabase } from '../lib/supabase'

import type {
  DatasetColumn,
  DatasetRecord,
  DatasetRow,
  DatasetTable,
} from '../types/dataset.types'

const INSERT_BATCH_SIZE = 500
const PREVIEW_ROW_LIMIT = 200
const STORAGE_BUCKET = 'datasets'

function safeFileName(name: string) {
  return name.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function insertRows(table: DatasetTable) {
  for (let start = 0; start < table.rows.length; start += INSERT_BATCH_SIZE) {
    const rows = table.rows.slice(start, start + INSERT_BATCH_SIZE).map(
      (data, index) => ({
        table_id: table.id,
        row_number: start + index,
        data,
      }),
    )

    const { error } = await supabase.from('dataset_rows').insert(rows)
    if (error) throw new Error(`No se pudieron guardar las filas: ${error.message}`)
  }
}

export async function createDataset(dataset: DatasetRecord, file: File): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error(
      'La sesión de Supabase no es válida. Cierra sesión, vuelve a iniciar sesión e intenta nuevamente.',
    )
  }

  const storagePath = `${dataset.id}/${safeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    const policyHint = uploadError.message.toLowerCase().includes('row-level security')
      ? ` La solicitud sí tiene un usuario autenticado (${userData.user.id}) y apunta al bucket "${STORAGE_BUCKET}"; revisa que la política INSERT esté creada en el mismo proyecto Supabase configurado en VITE_SUPABASE_URL.`
      : ''

    throw new Error(
      `No se pudo subir el archivo a Storage: ${uploadError.message}.${policyHint}`,
    )
  }

  try {
    const { error: datasetError } = await supabase.from('datasets').insert({
      id: dataset.id,
      name: dataset.name,
      extension: dataset.extension,
      size_bytes: dataset.sizeBytes,
      created_at: dataset.createdAt,
      storage_path: storagePath,
      total_rows: dataset.totalRows,
      total_columns: dataset.totalColumns,
    })
    if (datasetError) throw new Error(datasetError.message)

    const { error: tablesError } = await supabase.from('dataset_tables').insert(
      dataset.tables.map((table) => ({
        id: table.id,
        dataset_id: dataset.id,
        name: table.name,
        columns: table.columns,
      })),
    )
    if (tablesError) throw new Error(tablesError.message)

    for (const table of dataset.tables) await insertRows(table)
  } catch (exception) {
    await supabase.from('datasets').delete().eq('id', dataset.id)
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    throw exception
  }
}

export async function getDatasets(): Promise<DatasetRecord[]> {
  const [{ data, error }, { data: tables, error: tablesError }] =
    await Promise.all([
      supabase
        .from('datasets')
        .select('id, name, extension, size_bytes, created_at, total_rows, total_columns')
        .order('created_at', { ascending: false }),
      supabase.from('dataset_tables').select('id, dataset_id, name, columns'),
    ])

  if (error) throw new Error(error.message)
  if (tablesError) throw new Error(tablesError.message)

  return (data ?? []).map((row) => mapDataset(
    row,
    (tables ?? [])
      .filter((table) => table.dataset_id === row.id)
      .map((table) => ({
        id: table.id,
        name: table.name,
        columns: (table.columns ?? []) as DatasetColumn[],
        rows: [],
      })),
  ))
}

async function getTableRows(tableId: string) {
  return getDatasetTablePage(tableId, 0, PREVIEW_ROW_LIMIT)
}

export async function getDatasetTablePage(
  tableId: string,
  page: number,
  pageSize: number,
) {
  const start = page * pageSize
  const { data, error, count } = await supabase
    .from('dataset_rows')
    .select('row_number, data', { count: 'exact' })
    .eq('table_id', tableId)
    .order('row_number', { ascending: true })
    .range(start, start + pageSize - 1)

  if (error) throw new Error(error.message)

  return {
    rows: (data ?? []).map((row) => ({
      ...(row.data as DatasetRow),
      __rowNumber: row.row_number,
    })),
    totalRows: count ?? data?.length ?? 0,
  }
}

export async function getDataset(id: string): Promise<DatasetRecord | undefined> {
  const [{ data: dataset, error }, { data: tables, error: tablesError }] =
    await Promise.all([
      supabase.from('datasets').select('*').eq('id', id).maybeSingle(),
      supabase.from('dataset_tables').select('*').eq('dataset_id', id),
    ])

  if (error) throw new Error(error.message)
  if (tablesError) throw new Error(tablesError.message)
  if (!dataset) return undefined

  const loadedTables = await Promise.all(
    (tables ?? []).map(async (table): Promise<DatasetTable> => {
      const result = await getTableRows(table.id)

      return {
        id: table.id,
        name: table.name,
        columns: (table.columns ?? []) as DatasetColumn[],
        rows: result.rows,
        totalRows: result.totalRows,
      }
    }),
  )

  return mapDataset(dataset, loadedTables)
}

export async function updateDatasetColumns(
  tableId: string,
  columns: DatasetColumn[],
): Promise<void> {
  const { error } = await supabase
    .from('dataset_tables')
    .update({ columns })
    .eq('id', tableId)
  if (error) throw new Error(error.message)
}

export async function updateDatasetRow(
  tableId: string,
  rowNumber: number,
  data: DatasetRow,
): Promise<void> {
  const storedData = { ...data }
  delete storedData.__rowNumber

  const { error } = await supabase
    .from('dataset_rows')
    .update({ data: storedData })
    .eq('table_id', tableId)
    .eq('row_number', rowNumber)
  if (error) throw new Error(error.message)
}

export async function deleteDataset(id: string): Promise<void> {
  const { data } = await supabase
    .from('datasets')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('datasets').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (data?.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([data.storage_path])
    if (storageError) throw new Error(storageError.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDataset(row: any, tables: DatasetTable[]): DatasetRecord {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    tables,
    totalRows: row.total_rows ?? 0,
    totalColumns: row.total_columns ?? 0,
  }
}
