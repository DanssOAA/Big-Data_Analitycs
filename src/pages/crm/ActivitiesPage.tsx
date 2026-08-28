import {
  Activity,
} from 'lucide-react'

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[var(--accent)]">
          CRM
        </p>

        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          Actividades
        </h2>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          0 actividades registradas.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] px-6 py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-muted)]">
          <Activity size={21} />
        </div>

        <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
          Sin actividades
        </p>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
          Este modulo se definira posteriormente cuando se establezca el flujo de seguimiento del CRM.
        </p>
      </section>
    </div>
  )
}
