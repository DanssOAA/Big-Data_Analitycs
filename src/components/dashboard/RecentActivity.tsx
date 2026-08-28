import {
  CircleDollarSign,
  ContactRound,
  MessageSquareMore,
} from 'lucide-react'

import { recentActivities } from '../../data/crm.mock'

const iconMap = {
  sale: CircleDollarSign,
  activity: MessageSquareMore,
  client: ContactRound,
}

export default function RecentActivity() {
  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Actividad
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">
          Movimientos recientes
        </h2>
      </div>

      <div className="space-y-2">
        {recentActivities.map((activity) => {
          const Icon = iconMap[activity.type as keyof typeof iconMap]

          return (
            <div
              key={activity.id}
              className="flex gap-4 rounded-xl p-3 transition hover:bg-[var(--surface-hover)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                <Icon size={18} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {activity.title}
                </p>
                <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                  {activity.description}
                </p>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  {activity.time}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
