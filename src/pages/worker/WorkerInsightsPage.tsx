import {
  ArrowUpRight,
  CalendarDays,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { Link } from 'react-router'

import { listInsights } from '../../services/aiInsights.service'

import type { InsightRecord } from '../../types/insight.types'

export default function WorkerInsightsPage() {
  const [
    insights,
    setInsights,
  ] = useState<InsightRecord[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const result =
          await listInsights({
            onlyPublished: true,
          })

        setInsights(result)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            Inteligencia
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-white">
            Insights Estratégicos
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Consulta los análisis estratégicos que el administrador publicó para el equipo.
          </p>
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">
          Cargando insights...
        </p>
      ) : insights.length ===
        0 ? (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-16 text-center">
          <Sparkles
            size={28}
            className="mx-auto text-[var(--text-muted)]"
          />

          <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
            Todavia no hay insights
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Cuando el administrador publique un análisis, aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map(
            (insight) => (
              <article
                key={
                  insight.id
                }
                className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]"
              >
                <div className="p-6">
                  <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                    <div>
                      <div className="mb-4 flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            insight.published
                              ? 'bg-emerald-400/10 text-emerald-400'
                              : 'bg-amber-400/10 text-amber-400'
                          }`}
                        >
                          {insight.published
                            ? 'Publicado'
                            : 'Mi borrador'}
                        </span>

                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <CalendarDays
                            size={13}
                          />
                          {new Date(
                            insight.publishedAt ??
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

                      <h3 className="text-xl font-semibold text-white">
                        {
                          insight.title
                        }
                      </h3>

                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {insight.gap}
                      </p>
                    </div>

                    <Link
                      to={`/app/insights/${insight.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-white"
                    >
                      Ver detalle
                      <ArrowUpRight
                        size={16}
                      />
                    </Link>
                  </div>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </div>
  )
}
