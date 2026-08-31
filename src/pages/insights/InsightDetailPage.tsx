import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lightbulb,
  ListChecks,
  Sparkles,
  Swords,
  TrendingDown,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  Link,
  useParams,
} from 'react-router'

import { useAuth } from '../../context/AuthContext'

import {
  getInsight,
  publishInsight,
} from '../../services/aiInsights.service'

import type { InsightRecord } from '../../types/insight.types'

interface DatasetsSnapshot {
  internalBreakdown: Array<{
    product: string
    total: number
    units: number
  }>
  externalBreakdown: Array<{
    product: string
    total: number
    units: number
  }>
}

function isDatasetsSnapshot(
  value: unknown,
): value is DatasetsSnapshot {
  return (
    !!value &&
    typeof value === 'object' &&
    'internalBreakdown' in value &&
    'externalBreakdown' in value
  )
}

export default function InsightDetailPage() {
  const { analysisId } =
    useParams()

  const { isAdmin } = useAuth()

  const [
    insight,
    setInsight,
  ] = useState<
    InsightRecord | null
  >(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    publishing,
    setPublishing,
  ] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!analysisId) {
        setLoading(false)
        return
      }

      const result =
        await getInsight(
          analysisId,
        )

      setInsight(
        result ?? null,
      )
      setLoading(false)
    }

    void load()
  }, [analysisId])

  const chartData = useMemo(() => {
    if (
      !insight ||
      insight.comparisonMode !==
        'datasets' ||
      !isDatasetsSnapshot(
        insight.externalSnapshot,
      )
    ) {
      return []
    }

    const {
      internalBreakdown,
      externalBreakdown,
    } = insight.externalSnapshot

    const externalMap = new Map(
      externalBreakdown.map(
        (item) => [
          item.product
            .trim()
            .toLowerCase(),
          item,
        ],
      ),
    )

    return internalBreakdown
      .map((item) => {
        const match =
          externalMap.get(
            item.product
              .trim()
              .toLowerCase(),
          )

        if (!match) {
          return null
        }

        return {
          producto: item.product,
          nosotros: item.total,
          competencia:
            match.total,
        }
      })
      .filter(
        (
          item,
        ): item is NonNullable<
          typeof item
        > => item !== null,
      )
      .slice(0, 10)
  }, [insight])

  const togglePublish =
    async () => {
      if (!insight) {
        return
      }

      setPublishing(true)

      try {
        const next =
          !insight.published

        await publishInsight(
          insight.id,
          next,
        )

        setInsight({
          ...insight,
          published: next,
          publishedAt: next
            ? new Date().toISOString()
            : null,
        })
      } finally {
        setPublishing(false)
      }
    }

  const backHref = isAdmin
    ? '/admin/insights'
    : '/app/insights'

  if (loading) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Cargando insight...
      </p>
    )
  }

  if (!insight) {
    return (
      <div>
        <p className="text-sm text-[var(--text-muted)]">
          Insight no encontrado.
        </p>

        <Link
          to={backHref}
          className="mt-4 inline-block text-sm font-medium text-[var(--accent)]"
        >
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section>
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
          Insights
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  insight.published
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-amber-400/10 text-amber-400'
                }`}
              >
                {insight.published
                  ? 'Publicado'
                  : 'Borrador'}
              </span>

              <span className="text-xs text-[var(--text-muted)]">
                {new Date(
                  insight.createdAt,
                ).toLocaleDateString(
                  'es-PE',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  },
                )}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {insight.title}
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              disabled={
                publishing
              }
              onClick={
                togglePublish
              }
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                insight.published
                  ? 'border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
                  : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
              }`}
            >
              {insight.published ? (
                <EyeOff size={16} />
              ) : (
                <Eye size={16} />
              )}

              {insight.published
                ? 'Despublicar'
                : 'Publicar para trabajadores'}
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--border-soft)] md:grid-cols-3">
        <div className="bg-[var(--surface)] p-6">
          <TrendingDown
            size={20}
            className="text-rose-400"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Brecha
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {insight.gap ||
              'Sin informacion.'}
          </p>
        </div>

        <div className="bg-[var(--surface)] p-6">
          <ListChecks
            size={20}
            className="text-amber-300"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Causa probable
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {insight.probableCause ||
              'Sin informacion.'}
          </p>
        </div>

        <div className="bg-[var(--surface)] p-6">
          <Swords
            size={20}
            className="text-[var(--accent)]"
          />
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Ventaja de la competencia
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {insight.competitorAdvantage ||
              'Sin informacion.'}
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Comparacion por producto
          </h3>

          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Nosotros vs. la fuente comparada, para los productos en comun.
          </p>

          <div className="mt-5 h-[340px]">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={chartData}
              >
                <CartesianGrid
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 4"
                  vertical={false}
                />

                <XAxis
                  dataKey="producto"
                  tick={{
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(
                    value,
                  ) => {
                    const text =
                      String(value)

                    return text.length >
                      12
                      ? `${text.slice(0, 12)}...`
                      : text
                  }}
                />

                <YAxis
                  tick={{
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip />
                <Legend />

                <Bar
                  dataKey="nosotros"
                  name="Nosotros"
                  fill="#7c5cff"
                  radius={[
                    5, 5, 0, 0,
                  ]}
                />

                <Bar
                  dataKey="competencia"
                  name="Comparado"
                  fill="#fb7185"
                  radius={[
                    5, 5, 0, 0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {insight.comparison.length >
        0 && (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border-soft)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Comparacion de indicadores
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  {[
                    'Indicador',
                    'Nosotros',
                    'Comparado',
                  ].map(
                    (column) => (
                      <th
                        key={
                          column
                        }
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {insight.comparison.map(
                  (row, index) => (
                    <tr
                      key={index}
                      className="border-b border-[var(--border-soft)] last:border-0"
                    >
                      <td className="px-5 py-3 text-sm font-medium text-[var(--text-primary)]">
                        {
                          row.indicador
                        }
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                        {row.mio}
                      </td>
                      <td className="px-5 py-3 text-sm text-[var(--text-secondary)]">
                        {
                          row.externo
                        }
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-2">
            <Lightbulb
              size={18}
              className="text-[var(--accent)]"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Recomendaciones
            </h3>
          </div>

          {insight.recommendations
            .length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Sin recomendaciones.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {insight.recommendations.map(
                (item, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]"
                  >
                    <span className="text-[var(--accent)]">
                      •
                    </span>
                    {item}
                  </li>
                ),
              )}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-[var(--accent)]"
            />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Plan de mejora
            </h3>
          </div>

          {insight.improvementPlan
            .length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Sin plan de mejora.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {insight.improvementPlan.map(
                (item, index) => (
                  <li
                    key={index}
                    className="flex gap-2 text-sm leading-6 text-[var(--text-secondary)]"
                  >
                    <span className="font-semibold text-[var(--accent)]">
                      {index + 1}.
                    </span>
                    {item}
                  </li>
                ),
              )}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Conclusion estrategica
        </h3>

        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          {insight.conclusion ||
            'Sin conclusion.'}
        </p>
      </section>
    </div>
  )
}
