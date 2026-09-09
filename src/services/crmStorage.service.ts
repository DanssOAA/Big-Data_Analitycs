import { toError } from './errors'

import { fetchAllPages } from './pagination'

import { supabase } from './supabaseClient'

import type {
  CrmClient,
  CrmSale,
} from '../types/crm.types'

interface ClientRow {
  project_id: string
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
  project_id: string
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

function toClientRow(projectId: string, client: CrmClient): ClientRow {
  return {
    id: client.id, project_id: projectId,
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

function toSaleRow(projectId: string, sale: CrmSale): SaleRow {
  return {
    id: sale.id, project_id: projectId,
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

export async function getClients(projectId: string): Promise<CrmClient[]> {
  const rows = await fetchAllPages<ClientRow>(
    (from, to) =>
      supabase
        .from('clients')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', {
          ascending: false,
        })
        .range(from, to),
  )

  return rows.map(fromClientRow)
}

export async function saveClient(
  projectId: string,
  client: CrmClient,
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .upsert(toClientRow(projectId, client))

  if (error) {
    throw toError(error)
  }
}

export async function deleteClient(
  projectId: string,
  clientId: string,
): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('project_id', projectId)
    .eq('id', clientId)

  if (error) {
    throw toError(error)
  }
}

export async function getSales(projectId: string): Promise<CrmSale[]> {
  const rows = await fetchAllPages<SaleRow>(
    (from, to) =>
      supabase
        .from('sales')
        .select('*')
        .eq('project_id', projectId)
        .order('date', {
          ascending: false,
        })
        .order('created_at', {
          ascending: false,
        })
        .range(from, to),
  )

  return rows.map(fromSaleRow)
}

export async function saveSale(
  projectId: string,
  sale: CrmSale,
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .upsert(toSaleRow(projectId, sale))

  if (error) {
    throw toError(error)
  }
}

export async function deleteSale(
  projectId: string,
  saleId: string,
): Promise<void> {
  const { error } = await supabase
    .from('sales')
    .delete()
    .eq('project_id', projectId)
    .eq('id', saleId)

  if (error) {
    throw toError(error)
  }
}
