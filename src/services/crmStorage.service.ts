import { toError } from './errors'

import { supabase } from './supabaseClient'

import type {
  CrmClient,
  CrmSale,
} from '../types/crm.types'

interface ClientRow {
  id: string
  code: string
  name: string
  company: string
  email: string
  phone: string | null
  status: string
  created_at: string
}

interface SaleRow {
  id: string
  code: string
  client_id: string | null
  product: string
  quantity: number
  unit_price: number
  amount: number
  date: string
  status: string
  created_at: string
}

function fromClientRow(row: ClientRow): CrmClient {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone ?? '',
    status: row.status as CrmClient['status'],
    createdAt: row.created_at,
  }
}

function toClientRow(client: CrmClient): ClientRow {
  return {
    id: client.id,
    code: client.code,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone || null,
    status: client.status,
    created_at: client.createdAt,
  }
}

function fromSaleRow(row: SaleRow): CrmSale {
  return {
    id: row.id,
    code: row.code,
    clientId: row.client_id ?? '',
    product: row.product,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    amount: Number(row.amount),
    date: row.date,
    status: row.status as CrmSale['status'],
    createdAt: row.created_at,
  }
}

function toSaleRow(sale: CrmSale): SaleRow {
  return {
    id: sale.id,
    code: sale.code,
    client_id: sale.clientId || null,
    product: sale.product,
    quantity: sale.quantity,
    unit_price: sale.unitPrice,
    amount: sale.amount,
    date: sale.date,
    status: sale.status,
    created_at: sale.createdAt,
  }
}

export async function getClients(): Promise<CrmClient[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw toError(error)
  }

  return (data as ClientRow[]).map(
    fromClientRow,
  )
}

export async function saveClient(
  client: CrmClient,
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .upsert(toClientRow(client))

  if (error) {
    throw toError(error)
  }
}

export async function deleteClient(
  clientId: string,
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)

  if (error) {
    throw toError(error)
  }
}

export async function getSales(): Promise<CrmSale[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .order('date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw toError(error)
  }

  return (data as SaleRow[]).map(
    fromSaleRow,
  )
}

export async function saveSale(
  sale: CrmSale,
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .upsert(toSaleRow(sale))

  if (error) {
    throw toError(error)
  }
}

export async function deleteSale(
  saleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('id', saleId)

  if (error) {
    throw toError(error)
  }
}
