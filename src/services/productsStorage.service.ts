import { toError } from './errors'

import { supabase } from './supabaseClient'

import type { Product } from '../types/crm.types'

interface ProductRow {
  project_id: string
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

export async function getProducts(projectId: string): Promise<
  Product[]
> {
  const pageSize = 1000
  const rows: ProductRow[] = []

  for (
    let start = 0;
    ;
    start += pageSize
  ) {
    const { data, error } =
      await supabase
        .from('products')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', {
          ascending: false,
        })
        .range(
          start,
          start + pageSize - 1,
        )

    if (error) {
      throw toError(error)
    }

    const page = data as ProductRow[]
    rows.push(...page)

    if (page.length < pageSize) {
      break
    }
  }

  return rows.map(fromRow)
}

export async function saveProduct(
  projectId: string,
  product: Product,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .upsert({
      id: product.id, project_id: projectId,
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
  projectId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('project_id', projectId)
    .eq('id', productId)

  if (error) {
    throw toError(error)
  }
}
