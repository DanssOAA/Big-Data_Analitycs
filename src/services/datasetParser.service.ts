import Papa from 'papaparse'
import { read, utils } from 'xlsx'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetColumnType,
  DatasetRecord,
  DatasetRow,
  DatasetTable,
} from '../types/dataset.types'

function isEmpty(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ''
  )
}

function normalizeCell(value: unknown): DatasetCell {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null
  }

  if (typeof value === 'boolean') {
    return value
  }

  const text = String(value)
    .replace(/^\uFEFF/, '')
    .trim()

  return text === ''
    ? null
    : text
}

export function parseNumericValue(
  value: DatasetCell,
): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null
  }

  if (typeof value !== 'string') {
    return null
  }

  let text = value.trim()

  if (!text) {
    return null
  }

  text = text
    .replace(/\s/g, '')
    .replace(/[^\d,.\-]/g, '')

  if (!text || text === '-') {
    return null
  }

  const commaIndex = text.lastIndexOf(',')
  const dotIndex = text.lastIndexOf('.')

  if (
    commaIndex !== -1 &&
    dotIndex !== -1
  ) {
    if (commaIndex > dotIndex) {
      text = text
        .replace(/\./g, '')
        .replace(',', '.')
    } else {
      text = text.replace(/,/g, '')
    }
  } else if (commaIndex !== -1) {
    const decimalPlaces =
      text.length - commaIndex - 1

    if (
      decimalPlaces > 0 &&
      decimalPlaces <= 2
    ) {
      text = text.replace(',', '.')
    } else {
      text = text.replace(/,/g, '')
    }
  }

  const parsed = Number(text)

  return Number.isFinite(parsed)
    ? parsed
    : null
}

export function parseDateValue(
  value: DatasetCell,
): number | null {
  if (typeof value !== 'string') {
    return null
  }

  const text = value.trim()

  if (!text) {
    return null
  }

  const latinDate = text.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/,
  )

  if (latinDate) {
    const day = Number(latinDate[1])
    const month = Number(latinDate[2])
    const year = Number(latinDate[3])

    const date = new Date(
      year,
      month - 1,
      day,
    )

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date.getTime()
    }
  }

  const isoDate = text.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})/,
  )

  if (isoDate) {
    const year = Number(isoDate[1])
    const month = Number(isoDate[2])
    const day = Number(isoDate[3])

    const date = new Date(
      year,
      month - 1,
      day,
    )

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date.getTime()
    }
  }

  const native = Date.parse(text)

  return Number.isNaN(native)
    ? null
    : native
}

function inferType(
  values: DatasetCell[],
): DatasetColumnType {
  const populated = values
    .filter((value) => !isEmpty(value))
    .slice(0, 300)

  if (populated.length === 0) {
    return 'empty'
  }

  const booleanCount = populated.filter(
    (value) => {
      if (typeof value === 'boolean') {
        return true
      }

      if (typeof value !== 'string') {
        return false
      }

      return [
        'true',
        'false',
        'si',
        'sí',
        'no',
      ].includes(
        value.trim().toLowerCase(),
      )
    },
  ).length

  const dateCount = populated.filter(
    (value) =>
      parseDateValue(value) !== null,
  ).length

  const numericCount = populated.filter(
    (value) =>
      parseNumericValue(value) !== null,
  ).length

  const threshold =
    populated.length * 0.75

  if (booleanCount >= threshold) {
    return 'boolean'
  }

  if (dateCount >= threshold) {
    return 'date'
  }

  if (numericCount >= threshold) {
    return 'number'
  }

  return 'text'
}

function convertValue(
  value: DatasetCell,
  type: DatasetColumnType,
): DatasetCell {
  if (isEmpty(value)) {
    return null
  }

  if (type === 'number') {
    return (
      parseNumericValue(value) ??
      value
    )
  }

  if (type === 'boolean') {
    if (typeof value === 'boolean') {
      return value
    }

    const text =
      String(value)
        .trim()
        .toLowerCase()

    if (
      ['true', 'si', 'sí'].includes(text)
    ) {
      return true
    }

    if (
      ['false', 'no'].includes(text)
    ) {
      return false
    }
  }

  return value
}

function normalizeMatrix(
  source: unknown[][],
): DatasetCell[][] {
  return source.map(
    (row) =>
      row.map(normalizeCell),
  )
}

function splitIntoBlocks(
  matrix: DatasetCell[][],
) {
  const blocks: DatasetCell[][][] = []

  let current: DatasetCell[][] = []

  const pushBlock = () => {
    if (current.length > 0) {
      blocks.push(current)
      current = []
    }
  }

  for (const row of matrix) {
    if (row.every(isEmpty)) {
      pushBlock()
    } else {
      current.push(row)
    }
  }

  pushBlock()

  return blocks
}

function detectHeaderRowIndex(
  block: DatasetCell[][],
) {
  const firstNonEmpty =
    block.findIndex(
      (row) =>
        row.some(
          (value) =>
            !isEmpty(value),
        ),
    )

  if (firstNonEmpty === -1) {
    return -1
  }

  /*
   * Una fila con un solo valor puede ser
   * un titulo del reporte.
   *
   * Buscamos inmediatamente despues una
   * fila con dos o mas encabezados.
   */
  const firstCount =
    block[firstNonEmpty].filter(
      (value) =>
        !isEmpty(value),
    ).length

  if (firstCount > 1) {
    return firstNonEmpty
  }

  for (
    let index =
      firstNonEmpty + 1;
    index <
      Math.min(
        block.length,
        firstNonEmpty + 12,
      );
    index += 1
  ) {
    const count =
      block[index].filter(
        (value) =>
          !isEmpty(value),
      ).length

    if (count >= 2) {
      return index
    }
  }

  return firstNonEmpty
}

function createTable(
  block: DatasetCell[][],
  name: string,
): DatasetTable | null {
  if (block.length === 0) {
    return null
  }

  const headerIndex =
    detectHeaderRowIndex(block)

  if (headerIndex < 0) {
    return null
  }

  const headerRow =
    block[headerIndex]

  const dataRows =
    block
      .slice(headerIndex + 1)
      .filter(
        (row) =>
          row.some(
            (value) =>
              !isEmpty(value),
          ),
      )

  if (dataRows.length === 0) {
    return null
  }

  /*
   * REGLA PRINCIPAL:
   *
   * Solo existe una columna si el archivo
   * realmente tiene un encabezado en esa
   * posicion.
   *
   * Ya NO creamos:
   *
   * Columna 8
   * Columna 9
   * Columna 10
   *
   * solamente porque alguna fila sea mas
   * ancha que el encabezado.
   */
  const sourceIndexes =
    headerRow
      .map(
        (value, index) => ({
          value,
          index,
        }),
      )
      .filter(
        ({ value }) =>
          !isEmpty(value),
      )
      .map(
        ({ index }) =>
          index,
      )

  if (sourceIndexes.length === 0) {
    return null
  }

  const columns:
    DatasetColumn[] =
    sourceIndexes.map(
      (sourceIndex) => {
        const originalLabel =
          String(
            headerRow[sourceIndex],
          ).trim()

        const values =
          dataRows.map(
            (row) =>
              row[sourceIndex] ??
              null,
          )

        return {
          key: `c${sourceIndex}`,
          label: originalLabel,
          originalLabel,
          index: sourceIndex,
          type: inferType(values),
          visible: true,
        }
      },
    )

  const rows:
    DatasetRow[] =
    dataRows.map(
      (sourceRow) => {
        const row:
          DatasetRow = {
          __rowId:
            crypto.randomUUID(),
        }

        for (
          const column
          of columns
        ) {
          row[column.key] =
            convertValue(
              sourceRow[
                column.index
              ] ?? null,
              column.type,
            )
        }

        return row
      },
    )

  return {
    id: crypto.randomUUID(),
    name,
    columns,
    rows,
  }
}

function createTablesFromMatrix(
  source: unknown[][],
  sourceName: string,
): DatasetTable[] {
  const matrix =
    normalizeMatrix(source)

  const blocks =
    splitIntoBlocks(matrix)

  const tables:
    DatasetTable[] = []

  blocks.forEach(
    (block, index) => {
      const table =
        createTable(
          block,
          blocks.length === 1
            ? sourceName
            : `${sourceName} - Tabla ${index + 1}`,
        )

      if (table) {
        tables.push(table)
      }
    },
  )

  return tables
}

async function parseCsv(
  file: File,
): Promise<DatasetTable[]> {
  const text =
    await file.text()

  const result =
    Papa.parse(text, {
      skipEmptyLines: false,

      delimitersToGuess: [
        ',',
        ';',
        '\t',
        '|',
      ],
    })

  if (
    result.errors.length > 0 &&
    result.data.length === 0
  ) {
    throw new Error(
      result.errors[0].message,
    )
  }

  return createTablesFromMatrix(
    result.data as unknown[][],
    'Datos',
  )
}

async function parseExcel(
  file: File,
): Promise<DatasetTable[]> {
  const buffer =
    await file.arrayBuffer()

  const workbook =
    read(buffer)

  const tables:
    DatasetTable[] = []

  for (
    const sheetName
    of workbook.SheetNames
  ) {
    const worksheet =
      workbook.Sheets[sheetName]

    const matrix =
      utils.sheet_to_json<unknown[]>(
        worksheet,
        {
          header: 1,
          defval: null,
          raw: false,
          blankrows: true,
        },
      )

    tables.push(
      ...createTablesFromMatrix(
        matrix,
        sheetName,
      ),
    )
  }

  return tables
}

export async function parseDatasetFile(
  file: File,
): Promise<DatasetRecord> {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase() ?? ''

  let tables: DatasetTable[]

  if (extension === 'csv') {
    tables =
      await parseCsv(file)
  } else if (
    extension === 'xlsx' ||
    extension === 'xls'
  ) {
    tables =
      await parseExcel(file)
  } else {
    throw new Error(
      'Formato no soportado. Usa CSV, XLS o XLSX.',
    )
  }

  if (tables.length === 0) {
    throw new Error(
      'No se encontraron tablas validas dentro del archivo.',
    )
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    extension,
    sizeBytes: file.size,
    createdAt:
      new Date().toISOString(),
    tables,

    totalRows:
      tables.reduce(
        (total, table) =>
          total +
          table.rows.length,
        0,
      ),

    totalColumns:
      Math.max(
        ...tables.map(
          (table) =>
            table.columns.length,
        ),
      ),
  }
}
