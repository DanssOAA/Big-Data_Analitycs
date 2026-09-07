import { parseDateValue, parseNumericValue } from '../../services/datasetParser.service'
import { isIdentifierColumn } from '../../services/datasetSummary.service'
import type { DatasetCell, DatasetColumn, DatasetRow } from '../../types/dataset.types'

export type Aggregation = 'sum' | 'average'
export interface ChartPoint { label: string; value: number }

const numberFormat = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })
const compactFormat = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })
const rangeFormat = new Intl.NumberFormat('es-PE', { maximumSignificantDigits: 6 })
export const formatChartNumber = (value: number) => numberFormat.format(value)
export const compactChartNumber = (value: number) => compactFormat.format(value)

function normalizedName(column: DatasetColumn) {
  return `${column.label} ${column.originalLabel}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function chartNumber(value: DatasetCell) {
  if (typeof value === 'string') {
    const cleaned = value.trim().replace(/^(USD|EUR|PEN|S\/\.?|US\$)\s*/i, '')
      .replace(/\s*(USD|EUR|PEN)$/i, '').replace(/[$€£¥%\s]/g, '')
    if (!/^-?(?:\d[\d.,]*|[.,]\d+)$/.test(cleaned)) return null
    return parseNumericValue(cleaned)
  }
  return parseNumericValue(value)
}

export function getChartColumns(columns: DatasetColumn[], rows: DatasetRow[]) {
  const profiles = new Map<string, { populated: number; unique: number }>()
  const visible = columns.filter(column => column.visible !== false).flatMap(column => {
    // Sample across the table, so detection is not tied to its first records.
    const sample = Array.from({ length: Math.min(rows.length, 1000) }, (_, index) =>
      rows[Math.floor(index * rows.length / Math.min(rows.length, 1000))][column.key])
      .filter(value => value !== null && value !== undefined && String(value).trim() !== '')
    if (!sample.length) return []
    const numericCount = sample.filter(value => chartNumber(value) !== null).length
    const dateCount = sample.filter(value => typeof value === 'string' && /\d[\s/\-T:]\d|\d{4}-\d/.test(value)
      && parseDateValue(value) !== null).length
    const booleanCount = sample.filter(value => typeof value === 'boolean'
      || /^(true|false|si|sí|no)$/i.test(String(value).trim())).length
    const type = booleanCount >= sample.length * 0.9 ? 'boolean'
      : numericCount >= sample.length * 0.9 ? 'number'
      : dateCount >= sample.length * 0.9 ? 'date' : column.type === 'empty' ? 'text' : column.type
    profiles.set(column.key, { populated: sample.length, unique: new Set(sample.map(String)).size })
    return [{ ...column, type } as DatasetColumn]
  })
  const isCode = (column: DatasetColumn) => isIdentifierColumn(column)
    || /(^|[\s_])(id|dni|ruc|telefono|phone|guia|uuid|email|correo|zip|postal|sku|code|codigo|identificador)([\s_]|$)/.test(normalizedName(column))
  const numeric = visible.filter(column => column.type === 'number' && !isIdentifierColumn(column)
    && !isCode(column) && column.role !== 'category' && column.role !== 'product'
    && !/(^|[\s_])(anio|ano|year)([\s_]|$)/.test(normalizedName(column)))
  const categories = visible.filter(column => (column.type === 'text' || column.type === 'boolean'
    || column.role === 'category' || column.role === 'product') && !isCode(column))
    .sort((a, b) => {
      const first = profiles.get(a.key)!
      const second = profiles.get(b.key)!
      return first.unique / first.populated - second.unique / second.populated
    })
  const dates = visible.filter(column => column.type === 'date')
  return {
    numeric, categories, dates,
    defaultMetric: numeric.find(column => column.role === 'amount')
      ?? numeric.find(column => /costo|importe|monto|venta|ingreso|total|amount|revenue/.test(normalizedName(column)))
      ?? numeric[0],
    defaultCategory: categories.find(column => column.role === 'category' || column.role === 'product')
      ?? categories.find(column => /estado|categoria|category|status|tipo/.test(normalizedName(column)))
      ?? categories[0],
    defaultDate: dates.find(column => column.role === 'date') ?? dates[0],
  }
}

function categoryLabel(value: DatasetCell) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  return typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value).trim()
}

export function buildDatasetCharts(
  rows: DatasetRow[], metric?: DatasetColumn, category?: DatasetColumn,
  date?: DatasetColumn, secondary?: DatasetColumn, aggregation: Aggregation = 'sum',
) {
  const categories = new Map<string, { count: number; sum: number; valid: number }>()
  const periods = new Map<string, { count: number; sum: number; valid: number }>()
  const values: number[] = []
  const pairs: { x: number; y: number }[] = []
  const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    .map(label => ({ label, value: 0 }))
  let minimum = Infinity
  let maximum = -Infinity

  for (const row of rows) {
    const value = metric ? chartNumber(row[metric.key]) : null
    if (value !== null) {
      values.push(value)
      minimum = Math.min(minimum, value)
      maximum = Math.max(maximum, value)
    }
    const label = category ? categoryLabel(row[category.key]) : null
    if (label !== null) {
      const group = categories.get(label) ?? { count: 0, sum: 0, valid: 0 }
      group.count++
      if (value !== null) { group.sum += value; group.valid++ }
      categories.set(label, group)
    }
    const timestamp = date ? parseDateValue(row[date.key]) : null
    if (timestamp !== null) {
      const parsed = new Date(timestamp)
      weekdays[(parsed.getDay() + 6) % 7].value++
      const period = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
      const group = periods.get(period) ?? { count: 0, sum: 0, valid: 0 }
      group.count++
      if (value !== null) { group.sum += value; group.valid++ }
      periods.set(period, group)
    }
    const second = secondary ? chartNumber(row[secondary.key]) : null
    if (value !== null && second !== null) pairs.push({ x: value, y: second })
  }

  const aggregate = (group: { sum: number; valid: number }) => aggregation === 'average' ? group.sum / group.valid : group.sum
  const ranked = Array.from(categories, ([label, group]) => ({ label, ...group }))
  const ranking = ranked.filter(group => group.valid > 0)
    .map(group => ({ label: group.label, value: aggregate(group) }))
    .sort((a, b) => b.value - a.value)
  const frequencies = ranked.map(group => ({ label: group.label, value: group.count }))
    .sort((a, b) => b.value - a.value)
  const distribution = frequencies.length > 6
    ? [...frequencies.slice(0, 5), { label: 'Otras categorías (agrupadas)', value: frequencies.slice(5).reduce((sum, point) => sum + point.value, 0) }]
    : frequencies
  const sortedPeriods = [...periods.entries()].sort(([a], [b]) => a.localeCompare(b))
  const trend = sortedPeriods.map(([label, group]) => ({ label, value: group.valid ? aggregate(group) : null }))
  const volume = sortedPeriods.map(([label, group]) => ({ label, value: group.count }))

  const histogram: ChartPoint[] = []
  const quantiles: ChartPoint[] = []
  if (values.length) {
    const sorted = [...values].sort((a, b) => a - b)
    for (const [label, percentile] of [['Mínimo', 0], ['Percentil 25', 0.25], ['Mediana', 0.5], ['Percentil 75', 0.75], ['Máximo', 1]] as const) {
      const position = (sorted.length - 1) * percentile
      const lower = Math.floor(position)
      const fraction = position - lower
      quantiles.push({ label, value: sorted[lower] * (1 - fraction) + sorted[Math.ceil(position)] * fraction })
    }
    const bins = minimum === maximum ? 1 : Math.min(10, Math.ceil(Math.sqrt(values.length)))
    const width = (maximum - minimum) / bins
    for (let index = 0; index < bins; index++) {
      histogram.push({
        label: bins === 1 ? rangeFormat.format(minimum)
          : `${rangeFormat.format(minimum + index * width)} – ${rangeFormat.format(index === bins - 1 ? maximum : minimum + (index + 1) * width)}`,
        value: 0,
      })
    }
    for (const value of values) {
      const index = width === 0 ? 0 : Math.min(bins - 1, Math.floor((value - minimum) / width))
      histogram[index].value++
    }
  }
  // Keep the chart responsive while taking a sample across the full set of valid pairs.
  const scatter = pairs.length > 600
    ? Array.from({ length: 600 }, (_, index) => pairs[Math.floor(index * (pairs.length - 1) / 599)])
    : pairs
  return {
    trend, volume, ranking: ranking.slice(0, 10), rankingCount: ranking.length,
    frequencies: frequencies.slice(0, 10), categoryCount: frequencies.length, distribution,
    histogram, quantiles, weekdays: periods.size ? weekdays : [], scatter, pairCount: pairs.length, numericCount: values.length,
    categoryRows: frequencies.reduce((sum, point) => sum + point.value, 0),
  }
}
