import { getSales } from './crmStorage.service'

import type { CrmSale } from '../types/crm.types'

export interface CrmMetricsSnapshot {
  totalSales30Days: number
  averageTicket: number
  topProduct: {
    name: string
    units: number
  } | null
  salesCount: number
}

function parseLocalDate(
  value: string,
) {
  return new Date(
    `${value}T00:00:00`,
  )
}

/**
 * Calcula las 3 metricas principales del CRM (Seccion 3 de
 * GUIA_PROYECTO.md): ventas de los ultimos 30 dias, ticket
 * promedio y producto mas vendido.
 *
 * Es la unica fuente de verdad: tanto el Dashboard como el
 * analista de IA usan exactamente este mismo calculo.
 */
export function computeCrmMetrics(
  sales: CrmSale[],
): CrmMetricsSnapshot {
  const now = new Date()

  const cutoff = new Date(now)
  cutoff.setDate(
    cutoff.getDate() - 30,
  )

  const periodSales = sales.filter(
    (sale) => {
      if (
        sale.status !== 'Completada'
      ) {
        return false
      }

      return (
        parseLocalDate(sale.date) >=
        cutoff
      )
    },
  )

  const totalSales =
    periodSales.reduce(
      (total, sale) =>
        total + sale.amount,
      0,
    )

  const averageTicket =
    periodSales.length === 0
      ? 0
      : totalSales /
        periodSales.length

  const products = new Map<
    string,
    number
  >()

  for (const sale of periodSales) {
    products.set(
      sale.product,
      (products.get(
        sale.product,
      ) ?? 0) + sale.quantity,
    )
  }

  const topProduct = Array.from(
    products.entries(),
  ).sort(
    (a, b) => b[1] - a[1],
  )[0]

  return {
    totalSales30Days: totalSales,
    averageTicket,
    topProduct: topProduct
      ? {
          name: topProduct[0],
          units: topProduct[1],
        }
      : null,
    salesCount: periodSales.length,
  }
}

export async function getCrmMetricsSnapshot(): Promise<CrmMetricsSnapshot> {
  const sales = await getSales()

  return computeCrmMetrics(sales)
}
