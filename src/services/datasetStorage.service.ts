import { toError } from './errors'

import { supabase } from './supabaseClient'

import { parseDatasetFile } from './datasetParser.service'

import type {
  DatasetColumn,
  DatasetRecord,
  DatasetRow,
  DatasetSourceType,
  DatasetTable,
} from '../types/dataset.types'

const STORAGE_BUCKET = 'datasets'

/**
 * Tope de filas que se traen al navegador por tabla al abrir un
 * dataset. Datasets muy pesados (el `sales.csv` de prueba tiene
 * 425,796 filas) no se cargan completos: se usa `truncated` para
 * que la UI avise que solo se muestra una parte.
 */
const ROW_LOAD_CAP = 5000

const INSERT_BATCH_SIZE = 500

interface DatasetRow_ {
  id: string
  name: string
  extension: string
  size_bytes: number
  created_at: string
  storage_path: string | null
  total_rows: number
  total_columns: number
  source_type: DatasetSourceType
}

interface DatasetTableRow {
  id: string
  dataset_id: string
  name: string
  columns: DatasetColumn[]
}

function chunk<T>(
  items: T[],
  size: number,
): T[][] {
  const chunks: T[][] = []

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(
        index,
        index + size,
      ),
    )
  }

  return chunks
}

function toDatasetRecord(
  row: DatasetRow_,
  tables: DatasetTable[],
  truncated: boolean,
): DatasetRecord {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    storagePath: row.storage_path,
    sourceType: row.source_type,
    totalRows: row.total_rows,
    totalColumns:
      row.total_columns,
    tables,
    truncated,
  }
}

export async function uploadDataset(
  file: File,
  sourceType: DatasetSourceType = 'external',
): Promise<DatasetRecord> {
  const parsed =
    await parseDatasetFile(file)

  const { error: datasetError } =
    await supabase
      .from('datasets')
      .insert({
        id: parsed.id,
        name: parsed.name,
        extension:
          parsed.extension,
        size_bytes:
          parsed.sizeBytes,
        created_at:
          parsed.createdAt,
        storage_path: null,
        total_rows:
          parsed.totalRows,
        total_columns:
          parsed.totalColumns,
        source_type: sourceType,
      })

  if (datasetError) {
    throw toError(datasetError)
  }

  try {
    for (const table of parsed.tables) {
      const { error: tableError } =
        await supabase
          .from('dataset_tables')
          .insert({
            id: table.id,
            dataset_id: parsed.id,
            name: table.name,
            columns: table.columns,
          })

      if (tableError) {
        throw toError(tableError)
      }

      const batches = chunk(
        table.rows,
        INSERT_BATCH_SIZE,
      )

      let rowNumber = 0

      for (const batch of batches) {
        const payload =
          batch.map((row) => {
            rowNumber += 1

            return {
              table_id: table.id,
              row_number: rowNumber,
              data: row,
            }
          })

        const { error: rowsError } =
          await supabase
            .from('dataset_rows')
            .insert(payload)

        if (rowsError) {
          throw toError(rowsError)
        }
      }
    }
  } catch (exception) {
    try {
      await supabase
        .from('datasets')
        .delete()
        .eq('id', parsed.id)
    } catch {
      // best-effort cleanup, se ignora el error
    }

    throw exception
  }

  return {
    ...parsed,
    storagePath: null,
    sourceType,
    truncated: false,
  }
}

async function fetchPreviewTable(
  datasetId: string,
): Promise<DatasetTable | null> {
  const { data: tableRows } =
    await supabase
      .from('dataset_tables')
      .select('*')
      .eq(
        'dataset_id',
        datasetId,
      )
      .order('name', {
        ascending: true,
      })
      .limit(1)

  const table = (
    tableRows as
      | DatasetTableRow[]
      | null
  )?.[0]

  if (!table) {
    return null
  }

  const { data: rows } =
    await supabase
      .from('dataset_rows')
      .select('data')
      .eq('table_id', table.id)
      .order('row_number', {
        ascending: true,
      })
      .limit(3)

  return {
    id: table.id,
    name: table.name,
    columns: table.columns,
    rows: (
      (rows ?? []) as {
        data: DatasetRow
      }[]
    ).map((item) => item.data),
  }
}

export async function getDatasets(): Promise<
  DatasetRecord[]
> {
  const { data, error } =
    await supabase
      .from('datasets')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw toError(error)
  }

  const rows =
    data as DatasetRow_[]

  const previews =
    await Promise.all(
      rows.map((row) =>
        fetchPreviewTable(
          row.id,
        ),
      ),
    )

  return rows.map((row, index) =>
    toDatasetRecord(
      row,
      previews[index]
        ? [previews[index]]
        : [],
      false,
    ),
  )
}

export async function getDataset(
  id: string,
): Promise<
  DatasetRecord | undefined
> {
  const { data: datasetRow, error } =
    await supabase
      .from('datasets')
      .select('*')
      .eq('id', id)
      .maybeSingle()

  if (error) {
    throw toError(error)
  }

  if (!datasetRow) {
    return undefined
  }

  const { data: tableRows, error: tablesError } =
    await supabase
      .from('dataset_tables')
      .select('*')
      .eq('dataset_id', id)
      .order('name', {
        ascending: true,
      })

  if (tablesError) {
    throw toError(tablesError)
  }

  let truncated = false

  const tables: DatasetTable[] =
    await Promise.all(
      (
        tableRows as DatasetTableRow[]
      ).map(async (table) => {
        const {
          data: rows,
          error: rowsError,
          count,
        } = await supabase
          .from('dataset_rows')
          .select('data', {
            count: 'exact',
          })
          .eq(
            'table_id',
            table.id,
          )
          .order(
            'row_number',
            {
              ascending: true,
            },
          )
          .limit(ROW_LOAD_CAP)

        if (rowsError) {
          throw toError(rowsError)
        }

        if (
          (count ?? 0) >
          ROW_LOAD_CAP
        ) {
          truncated = true
        }

        return {
          id: table.id,
          name: table.name,
          columns:
            table.columns,
          rows: (
            (rows ?? []) as {
              data: DatasetRow
            }[]
          ).map(
            (item) => item.data,
          ),
        }
      }),
    )

  return toDatasetRecord(
    datasetRow as DatasetRow_,
    tables,
    truncated,
  )
}

export async function deleteDataset(
  id: string,
) {
  const { data: datasetRow } =
    await supabase
      .from('datasets')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle()

  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', id)

  if (error) {
    throw toError(error)
  }

  const storagePath = (
    datasetRow as {
      storage_path: string | null
    } | null
  )?.storage_path

  if (storagePath) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath])
      .catch(() => undefined)
  }
}

export async function setDatasetSourceType(
  id: string,
  sourceType: DatasetSourceType,
) {
  const { error } = await supabase
    .from('datasets')
    .update({
      source_type: sourceType,
    })
    .eq('id', id)

  if (error) {
    throw toError(error)
  }
}

export async function updateTableColumns(
  tableId: string,
  columns: DatasetColumn[],
) {
  const { error } = await supabase
    .from('dataset_tables')
    .update({ columns })
    .eq('id', tableId)

  if (error) {
    throw toError(error)
  }
}

export async function updateCell(
  tableId: string,
  rowId: string,
  columnKey: string,
  value: DatasetRow[string],
) {
  const { data: existing, error: findError } =
    await supabase
      .from('dataset_rows')
      .select('id, data')
      .eq('table_id', tableId)
      .contains('data', {
        __rowId: rowId,
      })
      .maybeSingle()

  if (findError) {
    throw toError(findError)
  }

  if (!existing) {
    return
  }

  const current = (
    existing as {
      id: number
      data: DatasetRow
    }
  ).data

  const { error: updateError } =
    await supabase
      .from('dataset_rows')
      .update({
        data: {
          ...current,
          [columnKey]: value,
        },
      })
      .eq(
        'id',
        (
          existing as {
            id: number
          }
        ).id,
      )

  if (updateError) {
    throw toError(updateError)
  }
}
