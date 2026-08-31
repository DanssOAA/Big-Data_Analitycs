import {
  parseNumericValue,
  parseDatasetFile,
} from './datasetParser.service'

import { toError } from './errors'
import { getProducts } from './productsStorage.service'
import { supabase } from './supabaseClient'

import type { Product } from '../types/crm.types'
import type {
  DatasetCell,
  DatasetTable,
} from '../types/dataset.types'

const INSERT_BATCH_SIZE = 500

interface ProductColumnMapping {
  code: string | null
  name: string
  category: string | null
  unit: string | null
  unitPrice: string | null
  active: string | null
}

export interface ProductImportProgress {
  imported: number
  total: number
}

export interface ProductImportResult {
  created: number
  updated: number
  skipped: number
  total: number
}

function normalizeLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
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

export function detectProductColumns(
  table: DatasetTable,
): ProductColumnMapping | null {
  const name = findColumnKey(table, [
    'producto',
    'product',
    'nombre',
    'name',
    'nombre producto',
    'product name',
    'descripcion',
    'description',
  ])

  if (!name) {
    return null
  }

  return {
    name,
    code: findColumnKey(table, [
      'codigo',
      'code',
      'sku',
      'codigo producto',
      'product code',
    ]),
    category: findColumnKey(table, [
      'categoria',
      'category',
      'familia',
      'linea',
      'line',
    ]),
    unit: findColumnKey(table, [
      'unidad',
      'unit',
      'unidad medida',
      'unit of measure',
      'uom',
    ]),
    unitPrice: findColumnKey(table, [
      'precio',
      'price',
      'precio unitario',
      'unit price',
      'unit_price',
      'costo',
    ]),
    active: findColumnKey(table, [
      'activo',
      'active',
      'estado',
      'status',
    ]),
  }
}

function readText(
  row: DatasetTable['rows'][number],
  key: string | null,
) {
  if (!key) {
    return ''
  }

  return String(row[key] ?? '').trim()
}

function parseActive(
  value: DatasetCell,
): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  const normalized = normalizeLabel(
    String(value ?? ''),
  )

  if (
    [
      'false',
      'no',
      'inactivo',
      'inactive',
      '0',
    ].includes(normalized)
  ) {
    return false
  }

  return true
}

function stableProductCode(name: string) {
  let hash = 2166136261

  for (const character of normalizeLabel(name)) {
    hash ^= character.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }

  return `PRD-${(hash >>> 0)
    .toString(36)
    .toUpperCase()}`
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function collectProducts(
  tables: DatasetTable[],
  existingProducts: Product[],
) {
  const existingByCode = new Map(
    existingProducts.map((product) => [
      normalizeLabel(product.code),
      product,
    ]),
  )

  const existingByName = new Map(
    existingProducts.map((product) => [
      normalizeLabel(product.name),
      product,
    ]),
  )

  const importedByCode = new Map<
    string,
    Product
  >()

  let skipped = 0
  let created = 0
  let updated = 0

  for (const table of tables) {
    const mapping = detectProductColumns(table)

    if (!mapping) {
      continue
    }

    for (const row of table.rows) {
      const name = readText(row, mapping.name)

      if (!name) {
        skipped += 1
        continue
      }

      const suppliedCode = readText(
        row,
        mapping.code,
      )

      const code =
        suppliedCode || stableProductCode(name)

      const codeKey = normalizeLabel(code)
      const nameKey = normalizeLabel(name)

      const previousImport =
        importedByCode.get(codeKey)

      const existing =
        previousImport ??
        existingByCode.get(codeKey) ??
        existingByName.get(nameKey)

      const category =
        readText(row, mapping.category) ||
        'Sin categoría'

      const unit =
        readText(row, mapping.unit) ||
        'unidad'

      const unitPrice = mapping.unitPrice
        ? (parseNumericValue(
            row[mapping.unitPrice],
          ) ?? 0)
        : 0

      const product: Product = {
        id: existing?.id ?? crypto.randomUUID(),
        code,
        name,
        category,
        unit,
        unitPrice,
        active: mapping.active
          ? parseActive(row[mapping.active])
          : true,
        createdAt:
          existing?.createdAt ??
          new Date().toISOString(),
      }

      if (!previousImport) {
        if (existing) {
          updated += 1
        } else {
          created += 1
        }
      }

      importedByCode.set(codeKey, product)
    }
  }

  return {
    products: Array.from(
      importedByCode.values(),
    ),
    created,
    updated,
    skipped,
  }
}

export async function importProductsFromFile(
  file: File,
  onProgress?: (
    progress: ProductImportProgress,
  ) => void,
): Promise<ProductImportResult> {
  const parsed = await parseDatasetFile(file)

  const matchingTables = parsed.tables.filter(
    (table) =>
      detectProductColumns(table) !== null,
  )

  if (matchingTables.length === 0) {
    throw new Error(
      'No se encontró una columna Producto o Nombre. Revisa los encabezados del archivo.',
    )
  }

  const existingProducts = await getProducts()
  const collected = collectProducts(
    matchingTables,
    existingProducts,
  )

  if (collected.products.length === 0) {
    throw new Error(
      'No se encontraron productos válidos para importar.',
    )
  }

  let imported = 0

  onProgress?.({
    imported,
    total: collected.products.length,
  })

  for (const batch of chunk(
    collected.products,
    INSERT_BATCH_SIZE,
  )) {
    const { error } = await supabase
      .from('products')
      .upsert(
        batch.map((product) => ({
          id: product.id,
          code: product.code,
          name: product.name,
          category: product.category,
          unit: product.unit,
          unit_price: product.unitPrice,
          active: product.active,
          created_at: product.createdAt,
        })),
      )

    if (error) {
      throw toError(error)
    }

    imported += batch.length
    onProgress?.({
      imported,
      total: collected.products.length,
    })
  }

  return {
    created: collected.created,
    updated: collected.updated,
    skipped: collected.skipped,
    total: collected.products.length,
  }
}
