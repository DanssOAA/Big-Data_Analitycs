import {
  CircleDollarSign,
  ContactRound,
  MessageSquareMore,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import { getActivities } from '../../services/activitiesStorage.service'
import {
  getClients,
  getSales,
} from '../../services/crmStorage.service'

import type {
  CrmActivity,
  CrmClient,
  CrmSale,
} from '../../types/crm.types'

const iconMap = {
  sale: CircleDollarSign,
  activity: MessageSquareMore,
  client: ContactRound,
}

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

function relativeTime(
  isoDate: string,
) {
  const diffMs =
    Date.now() -
    new Date(isoDate).getTime()

  const minutes = Math.round(
    diffMs / 60000,
  )

  if (minutes < 1) {
    return 'Hace instantes'
  }

  if (minutes < 60) {
    return `Hace ${minutes} minuto${minutes === 1 ? '' : 's'}`
  }

  const hours = Math.round(
    minutes / 60,
  )

  if (hours < 24) {
    return `Hace ${hours} hora${hours === 1 ? '' : 's'}`
  }

  const days = Math.round(
    hours / 24,
  )

  return `Hace ${days} dia${days === 1 ? '' : 's'}`
}

interface FeedItem {
  id: string
  type: keyof typeof iconMap
  title: string
  description: string
  timestamp: number
}

export default function RecentActivity() {
  const [
    activities,
    setActivities,
  ] = useState<CrmActivity[]>([])

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
        storedActivities,
        storedSales,
        storedClients,
      ] = await Promise.all([
        getActivities().catch(
          () => [],
        ),
        getSales().catch(
          () => [],
        ),
        getClients().catch(
          () => [],
        ),
      ])

      setActivities(
        storedActivities,
      )
      setSales(storedSales)
      setClients(storedClients)
    }

    void load()
  }, [])

  const clientMap = useMemo(
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

  const feed = useMemo<
    FeedItem[]
  >(() => {
    const items: FeedItem[] = []

    for (const activity of activities) {
      items.push({
        id: `activity-${activity.id}`,
        type: 'activity',
        title: activity.type,
        description:
          activity.description,
        timestamp: new Date(
          activity.activityDate,
        ).getTime(),
      })
    }

    for (const sale of sales) {
      const client =
        clientMap.get(
          sale.clientId,
        )

      items.push({
        id: `sale-${sale.id}`,
        type: 'sale',
        title: `Venta ${sale.status.toLowerCase()} - ${client?.name ?? 'Cliente'}`,
        description: `${sale.product} - ${money.format(sale.amount)}`,
        timestamp: new Date(
          sale.createdAt,
        ).getTime(),
      })
    }

    for (const client of clients) {
      items.push({
        id: `client-${client.id}`,
        type: 'client',
        title:
          'Nuevo cliente registrado',
        description:
          client.company,
        timestamp: new Date(
          client.createdAt,
        ).getTime(),
      })
    }

    return items
      .sort(
        (a, b) =>
          b.timestamp -
          a.timestamp,
      )
      .slice(0, 6)
  }, [
    activities,
    sales,
    clients,
    clientMap,
  ])

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

      {feed.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--text-muted)]">
          Todavia no hay movimientos registrados.
        </p>
      ) : (
        <div className="space-y-2">
          {feed.map((item) => {
            const Icon =
              iconMap[item.type]

            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-xl p-3 transition hover:bg-[var(--surface-hover)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--accent)]">
                  <Icon
                    size={18}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--text-secondary)]">
                    {
                      item.description
                    }
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    {relativeTime(
                      new Date(
                        item.timestamp,
                      ).toISOString(),
                    )}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
