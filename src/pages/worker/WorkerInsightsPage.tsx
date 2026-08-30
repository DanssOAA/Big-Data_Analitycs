import {
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Sparkles,
  TrendingDown,
} from 'lucide-react'

export default function WorkerInsightsPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[var(--accent)]">
          Inteligencia
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          Insights Estratégicos
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
          Consulta los análisis que el administrador haya aprobado y compartido
          con el equipo comercial.
        </p>
      </section>

      <article className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-soft)] p-6">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  Publicado
                </span>

                <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <CalendarDays size={13} />
                  27 Ago 2026
                </span>
              </div>

              <h3 className="text-xl font-semibold text-white">
                Comparativa comercial - Competencia Q3
              </h3>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                ventas_competencia_q3.csv
              </p>
            </div>

            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-medium text-white">
              Ver detalle
              <ArrowUpRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--border-soft)] md:grid-cols-3">
          <div className="bg-[var(--surface)] p-6">
            <TrendingDown
              size={20}
              className="text-rose-400"
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Brecha
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              -15.1%
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Nuestro volumen de ventas está por debajo del dataset comparado.
            </p>
          </div>

          <div className="bg-[var(--surface)] p-6">
            <CircleDollarSign
              size={20}
              className="text-amber-300"
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Causa detectada
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              Ticket promedio
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              El competidor registra un ticket promedio 12.6% superior.
            </p>
          </div>

          <div className="bg-[var(--surface)] p-6">
            <Sparkles
              size={20}
              className="text-[var(--accent)]"
            />
            <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Recomendación
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              Venta cruzada
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Incrementar paquetes comerciales sobre clientes de alto valor.
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
