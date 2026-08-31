import {
  parseDateValue,
  parseNumericValue,
} from './datasetParser.service'

import { toError } from './errors'

import {
  getClients,
  saveClient,
} from './crmStorage.service'

import { supabase } from './supabaseClient'

import type {
  CrmClient,
  Shipment,
  ShipmentStatus,
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

// =========================================================
// Importar un dataset (CSV/Excel) directamente como Envios
// reales del CRM, creando los Clientes que hagan falta.
// =========================================================

const BULK_INSERT_BATCH_SIZE = 500

const VALID_STATUSES: ShipmentStatus[] = [
  'En transito',
  'Entregado',
  'Retrasado',
  'Cancelado',
]

const ACCENTED_CHARS: Record<string, string> = {
  á: 'a',
  é: 'e',
  í: 'i',
  ó: 'o',
  ú: 'u',
  ñ: 'n',
  ü: 'u',
}

function normalizeLabel(label: string) {
  let result = label.toLowerCase()

  for (const [
    accented,
    plain,
  ] of Object.entries(
    ACCENTED_CHARS,
  )) {
    result = result.split(
      accented,
    ).join(plain)
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

interface ShipmentColumnMapping {
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
 * poder importarla directo al modulo de Envios del CRM.
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

function normalizeStatus(
  value: unknown,
): ShipmentStatus {
  const text = String(value ?? '')
    .trim()

  const match = VALID_STATUSES.find(
    (status) =>
      status.toLowerCase() ===
      text.toLowerCase(),
  )

  return match ?? 'Entregado'
}

function toIsoDate(
  value: unknown,
): string {
  const parsed = parseDateValue(
    value as string | number | boolean | null,
  )

  if (parsed === null) {
    return new Date()
      .toISOString()
      .slice(0, 10)
  }

  return new Date(parsed)
    .toISOString()
    .slice(0, 10)
}

function chunk<T>(
  items: T[],
  size: number,
): T[][] {
  const chunks: T[][] = []

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(
      items.slice(
        index,
        index + size,
      ),
    )
  }

  return chunks
}

export interface ShipmentImportResult {
  matched: boolean
  imported: number
  clientsCreated: number
}

/**
 * Importa una tabla de dataset directamente como filas reales de
 * la tabla `shipments` (y crea los `clients` que hagan falta por
 * nombre). Pensado para que un CSV historico (como el generado en
 * sample-data/) pueda llenar el CRM real, no solo quedar como un
 * dataset para IA.
 */
export async function importShipmentsFromTable(
  table: DatasetTable,
): Promise<ShipmentImportResult> {
  const mapping =
    detectShipmentColumns(table)

  if (!mapping) {
    return {
      matched: false,
      imported: 0,
      clientsCreated: 0,
    }
  }

  const existingClients =
    await getClients()

  const clientIndex = new Map<
    string,
    string
  >(
    existingClients.map(
      (client) => [
        normalizeLabel(
          client.company ||
            client.name,
        ),
        client.id,
      ],
    ),
  )

  const newClientNames = new Map<
    string,
    string
  >()

  if (mapping.client) {
    for (const row of table.rows) {
      const raw = row[mapping.client]

      if (!raw) {
        continue
      }

      const name = String(raw).trim()
      const key = normalizeLabel(name)

      if (
        !clientIndex.has(key) &&
        !newClientNames.has(key)
      ) {
        newClientNames.set(key, name)
      }
    }
  }

  for (const [
    key,
    name,
  ] of newClientNames) {
    const newClient: CrmClient = {
      id: crypto.randomUUID(),
      code: `CLI-${Date.now()
        .toString(36)
        .toUpperCase()}${Math.floor(
        Math.random() * 900 + 100,
      )}`,
      name,
      company: name,
      email: `contacto@${normalizeLabel(name) || 'cliente'}.com`,
      phone: '',
      status: 'Activo',
      createdAt:
        new Date().toISOString(),
    }

    await saveClient(newClient)

    clientIndex.set(key, newClient.id)
  }

  const stamp = Date.now()
    .toString(36)
    .toUpperCase()

  const shipmentRows = table.rows
    .map((row, rowIndex) => {
      const origin = String(
        row[mapping.origin] ?? '',
      ).trim()

      const destination = String(
        row[mapping.destination] ?? '',
      ).trim()

      if (!origin || !destination) {
        return null
      }

      const clientRaw = mapping.client
        ? row[mapping.client]
        : null

      const clientId = clientRaw
        ? (clientIndex.get(
            normalizeLabel(
              String(clientRaw),
            ),
          ) ?? null)
        : null

      return {
        id: crypto.randomUUID(),
        code: `ENV-${stamp}-${rowIndex + 1}`,
        client_id: clientId,
        origin,
        destination,
        carrier: mapping.carrier
          ? String(
              row[mapping.carrier] ??
                'Sin transportista',
            )
          : 'Sin transportista',
        cargo_type: mapping.cargoType
          ? String(
              row[
                mapping.cargoType
              ] ?? 'General',
            )
          : 'General',
        weight_kg: mapping.weight
          ? (parseNumericValue(
              row[mapping.weight],
            ) ?? 0)
          : 0,
        distance_km: mapping.distance
          ? (parseNumericValue(
              row[mapping.distance],
            ) ?? 0)
          : 0,
        cost: mapping.cost
          ? (parseNumericValue(
              row[mapping.cost],
            ) ?? 0)
          : 0,
        delivery_days:
          mapping.deliveryDays
            ? Math.round(
                parseNumericValue(
                  row[
                    mapping
                      .deliveryDays
                  ],
                ) ?? 0,
              )
            : 0,
        status: normalizeStatus(
          mapping.status
            ? row[mapping.status]
            : null,
        ),
        shipped_date: mapping.date
          ? toIsoDate(
              row[mapping.date],
            )
          : new Date()
              .toISOString()
              .slice(0, 10),
        created_at:
          new Date().toISOString(),
      }
    })
    .filter(
      (
        row,
      ): row is NonNullable<
        typeof row
      > => row !== null,
    )

  let imported = 0

  for (const batch of chunk(
    shipmentRows,
    BULK_INSERT_BATCH_SIZE,
  )) {
    const { error } = await supabase
      .from('shipments')
      .insert(batch)

    if (error) {
      throw toError(error)
    }

    imported += batch.length
  }

  return {
    matched: true,
    imported,
    clientsCreated:
      newClientNames.size,
  }
}
