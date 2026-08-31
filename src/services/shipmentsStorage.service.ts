import { toError } from './errors'

import { fetchAllPages } from './pagination'

import { supabase } from './supabaseClient'

import type {
  Shipment,
} from '../types/crm.types'

import type { DatasetTable } from '../types/dataset.types'

interface ShipmentRow {
  id: string
  code: string
  client_id: string | null
  origin: string
  destination: string
  carrier: string
  cargo_type: string
  weight_kg: number
  distance_km: number
  cost: number
  delivery_days: number
  status: string
  shipped_date: string
  created_at: string
}

function fromRow(
  row: ShipmentRow,
): Shipment {
  return {
    id: row.id,
    code: row.code,
    clientId: row.client_id,
    origin: row.origin,
    destination: row.destination,
    carrier: row.carrier,
    cargoType: row.cargo_type,
    weightKg: Number(
      row.weight_kg,
    ),
    distanceKm: Number(
      row.distance_km,
    ),
    cost: Number(row.cost),
    deliveryDays:
      row.delivery_days,
    status:
      row.status as Shipment['status'],
    shippedDate:
      row.shipped_date,
    createdAt: row.created_at,
  }
}

export async function getShipments(): Promise<
  Shipment[]
> {
  const rows =
    await fetchAllPages<ShipmentRow>(
      (from, to) =>
        supabase
          .from('shipments')
          .select('*')
          .order(
            'shipped_date',
            {
              ascending: false,
            },
          )
          .range(from, to),
    )

  return rows.map(fromRow)
}

export async function saveShipment(
  shipment: Shipment,
): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .upsert({
      id: shipment.id,
      code: shipment.code,
      client_id:
        shipment.clientId || null,
      origin: shipment.origin,
      destination:
        shipment.destination,
      carrier: shipment.carrier,
      cargo_type:
        shipment.cargoType,
      weight_kg:
        shipment.weightKg,
      distance_km:
        shipment.distanceKm,
      cost: shipment.cost,
      delivery_days:
        shipment.deliveryDays,
      status: shipment.status,
      shipped_date:
        shipment.shippedDate,
      created_at:
        shipment.createdAt,
    })

  if (error) {
    throw toError(error)
  }
}

export async function deleteShipment(
  shipmentId: string,
): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', shipmentId)

  if (error) {
    throw toError(error)
  }
}

// =========================================================
// Deteccion de columnas: reconocer si una tabla de un dataset
// tiene forma de historico de envios/ventas logisticas, para que
// bulkImport.service.ts pueda importarla al CRM real.
// =========================================================

const ACCENTED_CHARS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
  ü: 'u',
}

export function normalizeLabel(
  label: string,
) {
  let result = label.toLowerCase()

  for (const [
    accented,
    plain,
  ] of Object.entries(
    ACCENTED_CHARS,
  )) {
    result = result
      .split(accented)
      .join(plain)
  }

  return result.replace(
    /[^a-z0-9]/g,
    '',
  )
}

function findColumnKey(
  table: DatasetTable,
  aliases: string[],
): string | null {
  const normalizedAliases = aliases.map(
    normalizeLabel,
  )

  const column = table.columns.find(
    (candidate) =>
      normalizedAliases.includes(
        normalizeLabel(
          candidate.originalLabel,
        ),
      ) ||
      normalizedAliases.includes(
        normalizeLabel(candidate.label),
      ),
  )

  return column?.key ?? null
}

export interface ShipmentColumnMapping {
  date: string | null
  client: string | null
  origin: string
  destination: string
  carrier: string | null
  cargoType: string | null
  weight: string | null
  distance: string | null
  cost: string | null
  deliveryDays: string | null
  status: string | null
}

/**
 * Reconoce si una tabla de un dataset tiene la forma de un
 * historico de envios (columnas Origen/Destino como minimo) para
 * poder importarla directo al CRM real (Clientes, Productos,
 * Ventas y Envios).
 */
export function detectShipmentColumns(
  table: DatasetTable,
): ShipmentColumnMapping | null {
  const origin = findColumnKey(table, [
    'origen',
    'origin',
  ])

  const destination = findColumnKey(
    table,
    ['destino', 'destination'],
  )

  if (!origin || !destination) {
    return null
  }

  return {
    date: findColumnKey(table, [
      'fecha',
      'date',
      'shipped_date',
    ]),
    client: findColumnKey(table, [
      'cliente',
      'client',
      'empresa',
      'company',
    ]),
    origin,
    destination,
    carrier: findColumnKey(table, [
      'transportista',
      'carrier',
    ]),
    cargoType: findColumnKey(table, [
      'tipo_carga',
      'tipo de carga',
      'cargo_type',
      'tipocarga',
    ]),
    weight: findColumnKey(table, [
      'peso_kg',
      'peso',
      'weight_kg',
      'weight',
    ]),
    distance: findColumnKey(table, [
      'distancia_km',
      'distancia',
      'distance_km',
      'distance',
    ]),
    cost: findColumnKey(table, [
      'costo_flete',
      'costo',
      'cost',
      'flete',
    ]),
    deliveryDays: findColumnKey(table, [
      'dias_entrega',
      'delivery_days',
      'tiempo_entrega',
    ]),
    status: findColumnKey(table, [
      'estado',
      'status',
    ]),
  }
}
