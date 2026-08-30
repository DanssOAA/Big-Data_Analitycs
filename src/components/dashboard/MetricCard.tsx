import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  description: string
  icon: LucideIcon
  trend?: string
  trendPositive?: boolean
}

export default function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  trend,
  trendPositive = true,
}: MetricCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface-hover)]">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[var(--accent-soft)] blur-3xl transition group-hover:scale-125" />

      <div className="relative">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
            <Icon size={20} strokeWidth={1.8} />
          </div>

          {trend && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                trendPositive
                  ? 'bg-emerald-400/10 text-emerald-400'
                  : 'bg-rose-400/10 text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </p>

        <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {value}
        </p>

        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {description}
        </p>
      </div>
    </article>
  )
}
