import {
  parseDateValue,
  parseNumericValue,
} from './datasetParser.service'

import { toError } from './errors'

import {
  getClients,
  saveClient,
} from './crmStorage.service'

import { getProducts } from './productsStorage.service'

import {
  detectShipmentColumns,
  normalizeLabel,
} from './shipmentsStorage.service'

import { supabase } from './supabaseClient'

import type {
  CrmClient,
  Product,
  ShipmentStatus,
} from '../types/crm.types'

import type { DatasetTable } from '../types/dataset.types'

const BULK_INSERT_BATCH_SIZE = 500

const VALID_SHIPMENT_STATUSES: ShipmentStatus[] =
  [
    'En transito',
    'Entregado',
    'Retrasado',
    'Cancelado',
  ]

function normalizeShipmentStatus(
  value: unknown,
): ShipmentStatus {
  const text = String(value ?? '')
    .trim()

  const match =
    VALID_SHIPMENT_STATUSES.find(
      (status) =>
        status.toLowerCase() ===
        text.toLowerCase(),
    )

  return match ?? 'Entregado'
}

/**
 * Un envio tambien representa un ingreso (el flete cobrado), asi
 * que se refleja como una venta real en el CRM. El estado del
 * envio se traduce al vocabulario de ventas.
 */
function shipmentStatusToSaleStatus(
  status: ShipmentStatus,
): 'Completada' | 'Pendiente' | 'Cancelada' {
  if (status === 'Entregado') {
    return 'Completada'
  }

  if (status === 'Cancelado') {
    return 'Cancelada'
  }

  return 'Pendiente'
}

function toIsoDate(
  value: unknown,
): string {
  const parsed = parseDateValue(
    value as
      | string
      | number
      | boolean
      | null,
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

export interface BulkImportProgress {
  stage:
    | 'clients'
    | 'products'
    | 'sales'
    | 'shipments'
  imported: number
  total: number
}

export interface BulkImportResult {
  matched: boolean
  clientsCreated: number
  productsCreated: number
  salesImported: number
  shipmentsImported: number
}

/**
 * Importa una tabla de dataset con forma de historico de envios
 * directamente al CRM real: crea los Clientes que falten, crea un
 * Producto por cada tipo de carga distinto, y genera tanto la
 * Venta (el flete cobrado) como el Envio (el detalle logistico)
 * por cada fila. Este es el "dataset primordial": las ventas
 * reales de la empresa.
 */
export async function importHistoricalTable(
  table: DatasetTable,
  onProgress?: (
    progress: BulkImportProgress,
  ) => void,
): Promise<BulkImportResult> {
  const mapping =
    detectShipmentColumns(table)

  if (!mapping) {
    return {
      matched: false,
      clientsCreated: 0,
      productsCreated: 0,
      salesImported: 0,
      shipmentsImported: 0,
    }
  }

  // ---------------------------------------------------
  // 1. Clientes: crear los que falten por nombre
  // ---------------------------------------------------

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

  let clientsDone = 0

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

    clientsDone += 1

    onProgress?.({
      stage: 'clients',
      imported: clientsDone,
      total: newClientNames.size,
    })
  }

  // ---------------------------------------------------
  // 2. Construir filas base (una pasada sobre el CSV)
  // ---------------------------------------------------

  const stamp = Date.now()
    .toString(36)
    .toUpperCase()

  interface BaseRow {
    clientId: string | null
    origin: string
    destination: string
    carrier: string
    cargoType: string
    weightKg: number
    distanceKm: number
    cost: number
    deliveryDays: number
    shipmentStatus: ShipmentStatus
    isoDate: string
  }

  const baseRows: BaseRow[] = []

  for (const row of table.rows) {
    const origin = String(
      row[mapping.origin] ?? '',
    ).trim()

    const destination = String(
      row[mapping.destination] ?? '',
    ).trim()

    if (!origin || !destination) {
      continue
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

    baseRows.push({
      clientId,
      origin,
      destination,
      carrier: mapping.carrier
        ? String(
            row[mapping.carrier] ??
              'Sin transportista',
          )
        : 'Sin transportista',
      cargoType: mapping.cargoType
        ? String(
            row[mapping.cargoType] ??
              'General',
          )
        : 'General',
      weightKg: mapping.weight
        ? (parseNumericValue(
            row[mapping.weight],
          ) ?? 0)
        : 0,
      distanceKm: mapping.distance
        ? (parseNumericValue(
            row[mapping.distance],
          ) ?? 0)
        : 0,
      cost: mapping.cost
        ? (parseNumericValue(
            row[mapping.cost],
          ) ?? 0)
        : 0,
      deliveryDays:
        mapping.deliveryDays
          ? Math.round(
              parseNumericValue(
                row[
                  mapping.deliveryDays
                ],
              ) ?? 0,
            )
          : 0,
      shipmentStatus:
        normalizeShipmentStatus(
          mapping.status
            ? row[mapping.status]
            : null,
        ),
      isoDate: mapping.date
        ? toIsoDate(
            row[mapping.date],
          )
        : new Date()
            .toISOString()
            .slice(0, 10),
    })
  }

  // ---------------------------------------------------
  // 3. Productos: uno por cada tipo de carga distinto
  // ---------------------------------------------------

  const existingProducts =
    await getProducts()

  const productIndex = new Set(
    existingProducts.map((product) =>
      normalizeLabel(product.name),
    ),
  )

  const productStats = new Map<
    string,
    {
      name: string
      totalCost: number
      count: number
    }
  >()

  for (const row of baseRows) {
    const key = normalizeLabel(
      row.cargoType,
    )

    const current =
      productStats.get(key) ?? {
        name: row.cargoType,
        totalCost: 0,
        count: 0,
      }

    current.totalCost += row.cost
    current.count += 1

    productStats.set(key, current)
  }

  const newProducts: Product[] = []

  for (const [
    key,
    stats,
  ] of productStats) {
    if (productIndex.has(key)) {
      continue
    }

    newProducts.push({
      id: crypto.randomUUID(),
      code: `PRD-${stamp}-${newProducts.length + 1}`,
      name: stats.name,
      category: 'Logistica',
      unit: 'servicio',
      unitPrice:
        stats.count === 0
          ? 0
          : Math.round(
              (stats.totalCost /
                stats.count) *
                100,
            ) / 100,
      active: true,
      createdAt:
        new Date().toISOString(),
    })
  }

  if (newProducts.length > 0) {
    const { error } = await supabase
      .from('products')
      .insert(
        newProducts.map(
          (product) => ({
            id: product.id,
            code: product.code,
            name: product.name,
            category:
              product.category,
            unit: product.unit,
            unit_price:
              product.unitPrice,
            active: product.active,
            created_at:
              product.createdAt,
          }),
        ),
      )

    if (error) {
      throw toError(error)
    }

    onProgress?.({
      stage: 'products',
      imported: newProducts.length,
      total: newProducts.length,
    })
  }

  // ---------------------------------------------------
  // 4. Ventas: el flete cobrado en cada envio
  // ---------------------------------------------------

  const saleRows = baseRows.map(
    (row, index) => ({
      id: crypto.randomUUID(),
      code: `VTA-${stamp}-${index + 1}`,
      client_id: row.clientId,
      product: row.cargoType,
      quantity: 1,
      unit_price: row.cost,
      amount: row.cost,
      date: row.isoDate,
      status: shipmentStatusToSaleStatus(
        row.shipmentStatus,
      ),
      created_at:
        new Date().toISOString(),
    }),
  )

  let salesImported = 0

  for (const batch of chunk(
    saleRows,
    BULK_INSERT_BATCH_SIZE,
  )) {
    const { error } = await supabase
      .from('sales')
      .insert(batch)

    if (error) {
      throw toError(error)
    }

    salesImported += batch.length

    onProgress?.({
      stage: 'sales',
      imported: salesImported,
      total: saleRows.length,
    })
  }

  // ---------------------------------------------------
  // 5. Envios: el detalle logistico de cada fila
  // ---------------------------------------------------

  const shipmentRows = baseRows.map(
    (row, index) => ({
      id: crypto.randomUUID(),
      code: `ENV-${stamp}-${index + 1}`,
      client_id: row.clientId,
      origin: row.origin,
      destination: row.destination,
      carrier: row.carrier,
      cargo_type: row.cargoType,
      weight_kg: row.weightKg,
      distance_km: row.distanceKm,
      cost: row.cost,
      delivery_days:
        row.deliveryDays,
      status: row.shipmentStatus,
      shipped_date: row.isoDate,
      created_at:
        new Date().toISOString(),
    }),
  )

  let shipmentsImported = 0

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

    shipmentsImported += batch.length

    onProgress?.({
      stage: 'shipments',
      imported: shipmentsImported,
      total: shipmentRows.length,
    })
  }

  return {
    matched: true,
    clientsCreated:
      newClientNames.size,
    productsCreated:
      newProducts.length,
    salesImported,
    shipmentsImported,
  }
}
