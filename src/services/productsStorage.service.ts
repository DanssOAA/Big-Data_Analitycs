import { toError } from './errors'

import { supabase } from './supabaseClient'

import type { Product } from '../types/crm.types'

interface ProductRow {
  id: string
  code: string
  name: string
  category: string
  unit: string
  unit_price: number
  active: boolean
  created_at: string
}

function fromRow(row: ProductRow): Product {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    unit: row.unit,
    unitPrice: Number(
      row.unit_price,
    ),
    active: row.active,
    createdAt: row.created_at,
  }
}

export async function getProducts(): Promise<
  Product[]
> {
  const { data, error } =
    await supabase
      .from('products')
      .select('*')
      .order('created_at', {
        ascending: false,
      })

  if (error) {
    throw toError(error)
  }

  return (data as ProductRow[]).map(
    fromRow,
  )
}

export async function saveProduct(
  product: Product,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .upsert({
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category,
      unit: product.unit,
      unit_price:
        product.unitPrice,
      active: product.active,
      created_at:
        product.createdAt,
    })

  if (error) {
    throw toError(error)
  }
}

export async function deleteProduct(
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    throw toError(error)
  }
}
