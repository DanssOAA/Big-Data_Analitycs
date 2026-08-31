import {
  ArrowUpRight,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  Sparkles,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { Link } from 'react-router'

import BulkUploadCard from '../../components/dashboard/BulkUploadCard'
import MetricCard from '../../components/dashboard/MetricCard'
import RecentActivity from '../../components/dashboard/RecentActivity'
import SalesChart from '../../components/dashboard/SalesChart'

import { useAuth } from '../../context/AuthContext'

import { computeCrmMetrics } from '../../services/crmMetrics.service'

import {
  getClients,
  getSales,
} from '../../services/crmStorage.service'

import type {
  CrmClient,
  CrmSale,
} from '../../types/crm.types'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  },
)

function parseLocalDate(
  value: string,
) {
  return new Date(
    `${value}T00:00:00`,
  )
}

export default function DashboardPage() {
  const {
    user,
    isAdmin,
  } = useAuth()

  const [
    sales,
    setSales,
  ] = useState<CrmSale[]>([])

  const [
    clients,
    setClients,
  ] = useState<CrmClient[]>([])

  useEffect(() => {
    const load = async () => {
      const [
        storedSales,
        storedClients,
      ] = await Promise.all([
        getSales(),
        getClients(),
      ])

      setSales(storedSales)
      setClients(storedClients)
    }

    void load()
  }, [])

  const metrics = useMemo(() => {
    const crmMetrics =
      computeCrmMetrics(sales)

    const now = new Date()

    const cutoff = new Date(now)
    cutoff.setDate(
      cutoff.getDate() - 30,
    )

    const periodSales =
      sales.filter((sale) => {
        if (
          sale.status !==
          'Completada'
        ) {
          return false
        }

        return (
          parseLocalDate(
            sale.date,
          ) >= cutoff
        )
      })

    const grouped =
      new Map<string, number>()

    for (
      const sale
      of periodSales
    ) {
      grouped.set(
        sale.date,
        (
          grouped.get(
            sale.date,
          ) ?? 0
        ) + sale.amount,
      )
    }

    const trend =
      Array.from(
        grouped.entries(),
      )
        .sort(
          (a, b) =>
            parseLocalDate(
              a[0],
            ).getTime() -
            parseLocalDate(
              b[0],
            ).getTime(),
        )
        .map(
          ([
            date,
            amount,
          ]) => {
            const parsed =
              parseLocalDate(
                date,
              )

            return {
              day:
                parsed.toLocaleDateString(
                  'es-PE',
                  {
                    day: '2-digit',
                    month: '2-digit',
                  },
                ),

              sales:
                amount,
            }
          },
        )

    return {
      totalSales:
        crmMetrics.totalSales30Days,

      averageTicket:
        crmMetrics.averageTicket,

      topProduct:
        crmMetrics.topProduct,

      trend,
    }
  }, [sales])

  const clientMap =
    useMemo(
      () =>
        new Map(
          clients.map(
            (client) => [
              client.id,
              client,
            ],
          ),
        ),
      [clients],
    )

  const recentSales =
    sales.slice(0, 5)

  return (
    <div className="space-y-7">
      <section>
        <p className="mb-2 text-sm font-medium text-[var(--accent)]">
          Resumen comercial
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Buenos días,{' '}
          {user?.name.split(' ')[0]}
        </h2>

        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Indicadores calculados con la información registrada en el CRM.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Ventas últimos 30 días"
          value={money.format(
            metrics.totalSales,
          )}
          description="Ventas completadas durante el periodo."
          icon={CircleDollarSign}
        />

        <MetricCard
          label="Ticket promedio"
          value={money.format(
            metrics.averageTicket,
          )}
          description="Promedio por venta completada."
          icon={ReceiptText}
        />

        <MetricCard
          label="Producto más vendido"
          value={
            metrics.topProduct?.name ??
            'Sin datos'
          }
          description={
            metrics.topProduct
              ? `${metrics.topProduct.units} unidades vendidas en los últimos 30 días.`
              : 'Registra ventas para calcular esta métrica.'
          }
          icon={PackageCheck}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <SalesChart
            data={metrics.trend}
          />
        </div>

        <RecentActivity />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-soft)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Ventas recientes
          </h3>
        </div>

        {recentSales.length ===
        0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            Todavía no hay ventas registradas.
          </div>
        ) : (
          <div>
            {recentSales.map(
              (sale) => {
                const client =
                  clientMap.get(
                    sale.clientId,
                  )

                return (
                  <div
                    key={sale.id}
                    className="flex flex-col justify-between gap-3 border-b border-[var(--border-soft)] px-5 py-4 last:border-0 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {
                          sale.product
                        }
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {client?.name ??
                          'Cliente'}{' '}
                        ·{' '}
                        {
                          sale.quantity
                        }{' '}
                        unidades
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {money.format(
                          sale.amount,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {sale.date}
                      </p>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {isAdmin
                  ? 'Datasets'
                  : 'Insights Estratégicos'}
              </p>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {isAdmin
                  ? 'Gestiona los archivos externos que posteriormente compararemos contra estas métricas.'
                  : 'Consulta los análisis publicados para el equipo.'}
              </p>
            </div>
          </div>

          <Link
            to={
              isAdmin
                ? '/admin/insights'
                : '/app/insights'
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]"
          >
            Abrir
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>

      {isAdmin && <BulkUploadCard />}
    </div>
  )
}
