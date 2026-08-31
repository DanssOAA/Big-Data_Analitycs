import {
  parseDateValue,
  parseNumericValue,
} from './datasetParser.service'

import type {
  DatasetCell,
  DatasetColumn,
  DatasetTable,
} from '../types/dataset.types'

export interface ColumnSummary {
  key: string
  label: string
  main: string
  secondary: string
  tertiary?: string
}

export function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'es-PE',
    {
      maximumFractionDigits: 2,
    },
  ).format(value)
}

export function formatDate(
  timestamp: number,
) {
  return new Intl.DateTimeFormat(
    'es-PE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
  ).format(
    new Date(timestamp),
  )
}

/**
 * Heuristica original: una columna numerica que "parece" un
 * identificador (id, codigo, dni, telefono, etc.) no debe tratarse
 * como una metrica sumable.
 */
export function isIdentifierColumn(
  column: DatasetColumn,
) {
  const name =
    `${column.label} ${column.originalLabel}`
      .toLowerCase()

  return /(^|\b)(id|codigo|código|cod|dni|ruc|documento|pedido|nro|numero|número|telefono|teléfono|phone|serie)(\b|_|\.|$)/i.test(
    name,
  )
}

/**
 * Resuelve una columna por su rol semantico explicito
 * (`DatasetColumn.role`) y, si no hay ninguna marcada, cae en la
 * misma heuristica por `type` que ya usaba el dashboard.
 */
export function pickColumnByRole(
  columns: DatasetColumn[],
  role: 'product' | 'amount' | 'date' | 'category',
): DatasetColumn | undefined {
  const explicit = columns.find(
    (column) => column.role === role,
  )

  if (explicit) {
    return explicit
  }

  if (role === 'amount') {
    return columns.find(
      (column) =>
        column.type === 'number' &&
        !isIdentifierColumn(column),
    )
  }

  if (role === 'date') {
    return columns.find(
      (column) => column.type === 'date',
    )
  }

  if (
    role === 'product' ||
    role === 'category'
  ) {
    return columns.find(
      (column) => column.type === 'text',
    )
  }

  return undefined
}

export function summarizeColumn(
  column: DatasetColumn,
  values: DatasetCell[],
): ColumnSummary | null {
  const populated = values.filter(
    (value) =>
      value !== null &&
      value !== undefined &&
      String(value).trim() !== '',
  )

  if (populated.length === 0) {
    return null
  }

  if (column.type === 'number') {
    const numericValues = populated
      .map(parseNumericValue)
      .filter(
        (value): value is number =>
          value !== null,
      )

    if (numericValues.length === 0) {
      return null
    }

    if (isIdentifierColumn(column)) {
      const unique = new Set(
        populated.map(String),
      )

      return {
        key: column.key,
        label: column.label,
        main: String(populated[0]),
        secondary: 'Ejemplo de valor',
        tertiary: `${unique.size.toLocaleString('es-PE')} valores distintos`,
      }
    }

    const sum = numericValues.reduce(
      (total, value) => total + value,
      0,
    )

    const average =
      sum / numericValues.length

    const minimum = Math.min(
      ...numericValues,
    )

    const maximum = Math.max(
      ...numericValues,
    )

    return {
      key: column.key,
      label: column.label,
      main: formatNumber(sum),
      secondary: `Promedio ${formatNumber(average)}`,
      tertiary: `Min ${formatNumber(minimum)} · Max ${formatNumber(maximum)}`,
    }
  }

  if (column.type === 'date') {
    const dates = populated
      .map(parseDateValue)
      .filter(
        (value): value is number =>
          value !== null,
      )

    if (dates.length === 0) {
      return null
    }

    const earliest = Math.min(
      ...dates,
    )

    const latest = Math.max(
      ...dates,
    )

    return {
      key: column.key,
      label: column.label,
      main: formatDate(latest),
      secondary: 'Fecha más reciente',
      tertiary: `Desde ${formatDate(earliest)}`,
    }
  }

  if (column.type === 'boolean') {
    const positives = populated.filter(
      (value) =>
        value === true ||
        String(value).toLowerCase() ===
          'true' ||
        String(value).toLowerCase() ===
          'si' ||
        String(value).toLowerCase() ===
          'sí',
    ).length

    const percentage =
      (positives / populated.length) *
      100

    return {
      key: column.key,
      label: column.label,
      main: `${percentage.toFixed(1)}%`,
      secondary: 'Valores positivos',
      tertiary: `${positives} de ${populated.length}`,
    }
  }

  const frequencies = new Map<
    string,
    number
  >()

  for (const value of populated) {
    const key = String(value)

    frequencies.set(
      key,
      (frequencies.get(key) ?? 0) + 1,
    )
  }

  const ordered = Array.from(
    frequencies.entries(),
  ).sort((a, b) => b[1] - a[1])

  const top = ordered[0]

  if (!top) {
    return null
  }

  return {
    key: column.key,
    label: column.label,
    main: top[0],
    secondary: `${top[1].toLocaleString('es-PE')} apariciones`,
    tertiary: `${frequencies.size.toLocaleString('es-PE')} valores distintos`,
  }
}

export interface ProductBreakdownItem {
  product: string
  total: number
  units: number
}

/**
 * Agrupa las filas de una tabla por la columna "Producto" (rol
 * explicito o, en su defecto, la primera columna de texto) y suma
 * la columna "Monto" (rol explicito o la primera columna numerica
 * no identificadora). Se usa para comparar dos datasets producto a
 * producto en el analista de IA.
 */
export function buildProductBreakdown(
  table: DatasetTable,
): ProductBreakdownItem[] {
  const productColumn =
    pickColumnByRole(
      table.columns,
      'product',
    )

  const amountColumn =
    pickColumnByRole(
      table.columns,
      'amount',
    )

  if (!productColumn) {
    return []
  }

  const grouped = new Map<
    string,
    { total: number; units: number }
  >()

  for (const row of table.rows) {
    const productValue =
      row[productColumn.key]

    if (
      productValue === null ||
      productValue === undefined ||
      String(productValue).trim() === ''
    ) {
      continue
    }

    const key = String(productValue)
      .trim()

    const amount = amountColumn
      ? (parseNumericValue(
          row[amountColumn.key],
        ) ?? 0)
      : 0

    const current = grouped.get(
      key,
    ) ?? { total: 0, units: 0 }

    current.total += amount
    current.units += 1

    grouped.set(key, current)
  }

  return Array.from(
    grouped.entries(),
  )
    .map(([product, value]) => ({
      product,
      total: value.total,
      units: value.units,
    }))
    .sort(
      (a, b) => b.total - a.total,
    )
}
