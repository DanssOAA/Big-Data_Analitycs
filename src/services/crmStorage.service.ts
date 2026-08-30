import { supabase } from '../lib/supabase'

import type {
  CrmClient,
  CrmSale,
} from '../types/crm.types'

// ── CLIENTES ────────────────────────────────────────────────

export async function getClients(): Promise<CrmClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapClient)
}

export async function saveClient(client: CrmClient): Promise<void> {
  const row = toClientRow(client)

  const { error } = await supabase
    .from('clients')
    .upsert(row, { onConflict: 'id' })

  if (error) throw new Error(error.message)
}

export async function deleteClient(clientId: string): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) throw new Error(error.message)
}

// ── VENTAS ──────────────────────────────────────────────────

export async function getSales(): Promise<CrmSale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map(mapSale)
}

export async function saveSale(sale: CrmSale): Promise<void> {
  const row = toSaleRow(sale)

  const { error } = await supabase
    .from('sales')
    .upsert(row, { onConflict: 'id' })

  if (error) throw new Error(error.message)
}

export async function deleteSale(saleId: string): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)

  if (error) throw new Error(error.message)
}

// ── MAPPERS (snake_case ↔ camelCase) ────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any): CrmClient {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone ?? '',
    status: row.status,
    createdAt: row.created_at,
  }
}

function toClientRow(client: CrmClient) {
  return {
    id: client.id,
    code: client.code,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    status: client.status,
    created_at: client.createdAt,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSale(row: any): CrmSale {
  return {
    id: row.id,
    code: row.code,
    clientId: row.client_id,
    product: row.product,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    amount: row.amount,
    date: row.date,
    status: row.status,
    createdAt: row.created_at,
  }
}

function toSaleRow(sale: CrmSale) {
  return {
    id: sale.id,
    code: sale.code,
    client_id: sale.clientId,
    product: sale.product,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
    amount: sale.amount,
    date: sale.date,
    status: sale.status,
    created_at: sale.createdAt,
  }
}
