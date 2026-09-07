import { useMemo, useState, type ReactNode } from 'react'
import { Activity, BarChart3, ChartNoAxesCombined, ChartPie, SlidersHorizontal } from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import { summarizeColumn, type ColumnSummary } from '../../services/datasetSummary.service'
import type { DatasetColumn, DatasetRecord, DatasetTable } from '../../types/dataset.types'
import {
  buildDatasetCharts, compactChartNumber, formatChartNumber, getChartColumns,
  type Aggregation, type ChartPoint,
} from './datasetChartData'

interface DatasetDashboardProps { dataset: DatasetRecord; table: DatasetTable }
const colors = ['#7c5cff', '#14b8a6', '#3b82f6', '#f59e0b', '#ec4899', '#94a3b8']
const tick = { fill: 'var(--text-muted)', fontSize: 11 }
const tooltipStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 12, color: 'var(--text-primary)', fontSize: 12,
}
const shortLabel = (value: string) => value.length > 18 ? `${value.slice(0, 18)}…` : value

function ChartCard({ title, description, icon, children }: {
  title: string; description: string; icon: ReactNode; children: ReactNode
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">{icon}</span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      {children}
    </article>
  )
}

function ColumnSelect({ label, columns, value, onChange }: {
  label: string; columns: DatasetColumn[]; value?: string; onChange: (value: string) => void
}) {
  if (!columns.length) return null
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
      {label}
      <select value={value ?? ''} onChange={event => onChange(event.target.value)}
        className="w-full min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-[var(--accent)]">
        {columns.map(column => <option key={column.key} value={column.key}>{column.label}</option>)}
      </select>
    </label>
  )
}

function Bars({ data, name, color, horizontal = false }: {
  data: ChartPoint[]; name: string; color: string; horizontal?: boolean
}) {
  return (
    <div className="mt-5 h-[280px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 0, right: 12, bottom: 10 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? <>
            <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={compactChartNumber} />
            <YAxis type="category" dataKey="label" width={110} tick={tick} tickLine={false} axisLine={false} tickFormatter={shortLabel} />
          </> : <>
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} tickFormatter={shortLabel} minTickGap={20} />
            <YAxis tick={tick} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={compactChartNumber} width={55} />
          </>}
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--accent-soft)' }} formatter={value => formatChartNumber(Number(value))} />
          <Bar dataKey="value" name={name} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={32} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Reset chart selections when switching tables; nothing is persisted to the dataset.
export default function DatasetDashboard(props: DatasetDashboardProps) {
  return <DatasetDashboardContent key={`${props.dataset.id}:${props.table.id}`} {...props} />
}

function DatasetDashboardContent({ dataset, table }: DatasetDashboardProps) {
  const columns = useMemo(() => getChartColumns(table.columns, table.rows), [table.columns, table.rows])
  const [metricKey, setMetricKey] = useState('')
  const [categoryKey, setCategoryKey] = useState('')
  const [dateKey, setDateKey] = useState('')
  const [secondaryKey, setSecondaryKey] = useState('')
  const [aggregation, setAggregation] = useState<Aggregation>('sum')
  const metric = columns.numeric.find(column => column.key === metricKey) ?? columns.defaultMetric
  const category = columns.categories.find(column => column.key === categoryKey) ?? columns.defaultCategory
  const date = columns.dates.find(column => column.key === dateKey) ?? columns.defaultDate
  const secondaryColumns = columns.numeric.filter(column => column.key !== metric?.key)
  const secondary = secondaryColumns.find(column => column.key === secondaryKey) ?? secondaryColumns[0]
  const charts = useMemo(() => buildDatasetCharts(table.rows, metric, category, date, secondary, aggregation),
    [table.rows, metric, category, date, secondary, aggregation])
  const summaries = useMemo(() => table.columns.filter(column => column.visible !== false)
    .map(column => summarizeColumn(column, table.rows.map(row => row[column.key])))
    .filter((summary): summary is ColumnSummary => summary !== null).slice(0, 8), [table.columns, table.rows])
  const aggregateLabel = aggregation === 'sum' ? 'Suma' : 'Promedio'
  const hasTrend = charts.trend.some(point => point.value !== null)
  const chartCount = Number(hasTrend) + Number(charts.volume.length > 0)
    + Number(charts.ranking.length > 0 || charts.frequencies.length > 0)
    + Number(charts.distribution.length > 0) + Number(charts.histogram.length > 0) + Number(charts.scatter.length > 0)
    + Number(charts.quantiles.length > 0) + Number(charts.weekdays.length > 0)

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resumen automático</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Información calculada directamente desde los valores del dataset.</p>
        {summaries.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaries.map(summary => (
            <article key={summary.key} className="min-w-0 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
              <p title={summary.label} className="truncate text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{summary.label}</p>
              <p title={summary.main} className="mt-4 truncate text-xl font-semibold text-[var(--text-primary)]">{summary.main}</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{summary.secondary}</p>
              {summary.tertiary && <p className="mt-1 text-xs text-[var(--text-muted)]">{summary.tertiary}</p>}
            </article>
          ))}
        </div> : <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--text-muted)]">
          No se encontraron columnas con datos suficientes para generar indicadores.
        </p>}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Explora tus datos</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Distintas perspectivas de la tabla {table.name}. Cambia las columnas para explorar los gráficos.</p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">{chartCount} gráficos disponibles</span>
        </div>

        {(columns.numeric.length > 0 || columns.categories.length > 0 || columns.dates.length > 0) && <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]"><SlidersHorizontal size={14} />Personaliza los gráficos</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ColumnSelect label="Métrica" columns={columns.numeric} value={metric?.key} onChange={setMetricKey} />
            <ColumnSelect label="Agrupar por" columns={columns.categories} value={category?.key} onChange={setCategoryKey} />
            <ColumnSelect label="Fecha" columns={columns.dates} value={date?.key} onChange={setDateKey} />
            {metric && <label className="flex flex-col gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
              Cálculo de la métrica
              <select value={aggregation} onChange={event => setAggregation(event.target.value as Aggregation)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-[var(--accent)]">
                <option value="sum">Suma</option><option value="average">Promedio</option>
              </select>
            </label>}
            <ColumnSelect label="Relacionar con" columns={secondaryColumns} value={secondary?.key} onChange={setSecondaryKey} />
          </div>
        </div>}

        <div className="grid gap-4 xl:grid-cols-2">
          {hasTrend && <ChartCard title="Evolución de la métrica" description={`${aggregateLabel} de ${metric?.label} por mes · ${date?.label}`} icon={<Activity size={18} />}>
            <div className="mt-5 h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.trend} margin={{ right: 16, bottom: 10 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} minTickGap={35} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} width={60} tickFormatter={compactChartNumber} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => formatChartNumber(Number(value))} />
                  <Line type="linear" dataKey="value" name={`${aggregateLabel} de ${metric?.label}`} stroke={colors[0]} strokeWidth={2.5} dot={charts.trend.length < 20} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>}

          {charts.ranking.length > 0 || charts.frequencies.length > 0 ? <ChartCard title="Ranking por categoría"
            description={charts.ranking.length ? `${aggregateLabel} de ${metric?.label} por ${category?.label} · ${Math.min(10, charts.rankingCount)} de ${charts.rankingCount} categorías`
              : `Registros por ${category?.label} · ${Math.min(10, charts.categoryCount)} de ${charts.categoryCount} categorías`}
            icon={<BarChart3 size={18} />}>
            <Bars data={charts.ranking.length ? charts.ranking : charts.frequencies} name={charts.ranking.length ? `${aggregateLabel} de ${metric?.label}` : 'Registros'} color={colors[1]} horizontal />
          </ChartCard> : null}

          {charts.distribution.length > 0 && <ChartCard title="Participación por categoría"
            description={`Porcentaje de registros por ${category?.label} · ${formatChartNumber(charts.categoryRows)} registros con categoría`} icon={<ChartPie size={18} />}>
            <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row">
              <div className="h-[255px] w-full min-w-0 sm:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.distribution} dataKey="value" nameKey="label" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="var(--surface)" isAnimationActive={false}>
                      {charts.distribution.map((point, index) => <Cell key={`${index}:${point.label}`} fill={colors[index % colors.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={value => `${formatChartNumber(Number(value))} registros (${formatChartNumber(Number(value) / charts.categoryRows * 100)}%)`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="w-full min-w-0 space-y-3 pb-3 sm:w-1/2">
                {charts.distribution.map((point, index) => <li key={`${index}:${point.label}`} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} />
                  <span className="min-w-0 flex-1 truncate text-[var(--text-secondary)]" title={point.label}>{point.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--text-primary)]">{formatChartNumber(point.value / charts.categoryRows * 100)}%</span>
                </li>)}
              </ul>
            </div>
          </ChartCard>}

          {charts.histogram.length > 0 && <ChartCard title="Distribución de valores"
            description={`Frecuencia por rango de ${metric?.label} · ${formatChartNumber(charts.numericCount)} valores válidos`} icon={<BarChart3 size={18} />}>
            <Bars data={charts.histogram} name="Registros" color={colors[2]} />
            <p className="text-[10px] text-[var(--text-muted)]">Cada rango incluye el límite inferior; el último también incluye el máximo.</p>
          </ChartCard>}

          {charts.volume.length > 0 && <ChartCard title="Actividad en el tiempo"
            description={`Cantidad de registros por mes · ${date?.label}`} icon={<Activity size={18} />}>
            <div className="mt-5 h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.volume} margin={{ right: 16, bottom: 10 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} minTickGap={35} />
                  <YAxis tick={tick} axisLine={false} tickLine={false} width={55} allowDecimals={false} tickFormatter={compactChartNumber} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => formatChartNumber(Number(value))} />
                  <Area type="linear" dataKey="value" name="Registros" stroke={colors[3]} fill={colors[3]} fillOpacity={0.14} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>}

          {charts.quantiles.length > 0 && <ChartCard title="Resumen estadístico"
            description={`Mínimo, cuartiles, mediana y máximo de ${metric?.label}`} icon={<BarChart3 size={18} />}>
            <Bars data={charts.quantiles} name={metric?.label ?? 'Valor'} color={colors[0]} horizontal />
            <p className="text-[10px] text-[var(--text-muted)]">La mediana divide los valores en dos mitades; los percentiles 25 y 75 delimitan el 50% central.</p>
          </ChartCard>}

          {charts.weekdays.length > 0 && <ChartCard title="Actividad por día de la semana"
            description={`Cantidad de registros por día · ${date?.label}`} icon={<BarChart3 size={18} />}>
            <Bars data={charts.weekdays} name="Registros" color={colors[1]} />
          </ChartCard>}

          {charts.scatter.length > 0 && <ChartCard title="Relación entre variables"
            description={`${metric?.label} y ${secondary?.label} · ${charts.pairCount > 600 ? `Muestra de 600 de ${formatChartNumber(charts.pairCount)} pares válidos` : `${formatChartNumber(charts.pairCount)} pares válidos`}`} icon={<ChartNoAxesCombined size={18} />}>
            <div className="mt-5 h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ right: 16, bottom: 10 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 4" />
                  <XAxis type="number" dataKey="x" name={metric?.label} tick={tick} axisLine={false} tickLine={false} tickFormatter={compactChartNumber} />
                  <YAxis type="number" dataKey="y" name={secondary?.label} tick={tick} axisLine={false} tickLine={false} width={60} tickFormatter={compactChartNumber} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} formatter={value => formatChartNumber(Number(value))} />
                  <Scatter name="Registros" data={charts.scatter} fill={colors[4]} fillOpacity={0.6} isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">Eje X: {metric?.label} · Eje Y: {secondary?.label}</p>
          </ChartCard>}
        </div>

        {chartCount === 0 && <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
          <BarChart3 className="mx-auto text-[var(--text-muted)]" size={28} />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">No hay datos suficientes para generar gráficos.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Revisa que la tabla tenga filas y columnas visibles de números, categorías o fechas.</p>
        </div>}
        <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
          Fuente: {dataset.name} · {table.name} · {table.rows.length.toLocaleString('es-PE')} filas cargadas.
          {' '}Cada gráfico utiliza los valores válidos de las columnas seleccionadas.
          {dataset.truncated && ' Vista parcial: los gráficos se calculan únicamente con las filas cargadas, no con el dataset completo.'}
        </p>
      </section>
    </div>
  )
}
