import {
  CircleDollarSign,
  ContactRound,
  MessageSquareMore,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { getSales } from '../../services/crmStorage.service'
import type { CrmSale } from '../../types/crm.types'

const iconMap = {
  Completada: CircleDollarSign,
  Pendiente: MessageSquareMore,
  Cancelada: ContactRound,
}

export default function RecentActivity() {
  const [sales, setSales] = useState<CrmSale[]>([])

  useEffect(() => {
    getSales()
      .then((data) => setSales(data.slice(0, 5)))
      .catch(console.error)
  }, [])

  if (sales.length === 0) {
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
        <p className="text-center text-sm text-[var(--text-muted)] py-6">
          Aún no hay ventas registradas.
        </p>
      </section>
    )
  }

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
        {sales.map((sale) => {
          const Icon = iconMap[sale.status] ?? CircleDollarSign

          return (
            <div
              key={sale.id}
              className="flex gap-4 rounded-xl p-3 transition hover:bg-[var(--surface-hover)]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                <Icon size={18} strokeWidth={1.8} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {sale.product}
                </p>
                <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                  {sale.code} · S/ {sale.amount.toLocaleString('es-PE')}
                </p>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  {sale.date} · {sale.status}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
