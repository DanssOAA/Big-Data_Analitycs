import { toError } from './errors'

import { supabase } from './supabaseClient'

import type { Shipment } from '../types/crm.types'

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
  const { data, error } =
    await supabase
      .from('shipments')
      .select('*')
      .order('shipped_date', {
        ascending: false,
      })

  if (error) {
    throw toError(error)
  }

  return (data as ShipmentRow[]).map(
    fromRow,
  )
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
