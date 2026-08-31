import {
  Package,
  Plus,
  Search,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  deleteProduct,
  getProducts,
  saveProduct,
} from '../../services/productsStorage.service'

import type { Product } from '../../types/crm.types'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

interface ProductForm {
  name: string
  category: string
  unit: string
  unitPrice: number
}

function emptyForm(): ProductForm {
  return {
    name: '',
    category: '',
    unit: 'unidad',
    unitPrice: 0,
  }
}

export default function ProductsPage() {
  const [
    products,
    setProducts,
  ] = useState<Product[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [search, setSearch] =
    useState('')

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false)

  const [saving, setSaving] =
    useState(false)

  const [form, setForm] =
    useState<ProductForm>(
      emptyForm(),
    )

  useEffect(() => {
    const load = async () => {
      const stored =
        await getProducts()

      setProducts(stored)
      setLoading(false)
    }

    void load()
  }, [])

  const filteredProducts =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase()

      if (!term) {
        return products
      }

      return products.filter(
        (product) =>
          [
            product.code,
            product.name,
            product.category,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(term),
          ),
      )
    }, [products, search])

  const createProduct = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !form.name.trim() ||
      !form.category.trim()
    ) {
      return
    }

    setSaving(true)

    try {
      const product: Product = {
        id: crypto.randomUUID(),
        code: `PRD-${Date.now()
          .toString()
          .slice(-6)}`,
        name: form.name.trim(),
        category:
          form.category.trim(),
        unit: form.unit.trim() || 'unidad',
        unitPrice:
          form.unitPrice,
        active: true,
        createdAt:
          new Date().toISOString(),
      }

      await saveProduct(product)

      setProducts((current) => [
        product,
        ...current,
      ])

      setCreateOpen(false)
      setForm(emptyForm())
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (
    product: Product,
  ) => {
    const updated: Product = {
      ...product,
      active: !product.active,
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? updated
          : item,
      ),
    )

    await saveProduct(updated)
  }

  const removeProduct = async (
    product: Product,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el producto "${product.name}"?`,
      )

    if (!confirmed) {
      return
    }

    await deleteProduct(product.id)

    setProducts((current) =>
      current.filter(
        (item) =>
          item.id !== product.id,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            CRM
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Productos
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {products.length}{' '}
            {products.length === 1
              ? 'producto registrado'
              : 'productos registrados'}
            .
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(emptyForm())
            setCreateOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus size={17} />
          Nuevo producto
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Package
              size={19}
              className="text-[var(--accent)]"
            />

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Catalogo
              </p>

              <p className="text-xs text-[var(--text-muted)]">
                Productos y servicios que ofreces.
              </p>
            </div>
          </div>

          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value,
                )
              }
              placeholder="Buscar..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:w-72"
            />
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-[var(--text-muted)]">
            Cargando productos...
          </div>
        ) : filteredProducts.length ===
          0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No hay productos registrados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  {[
                    'Codigo',
                    'Producto',
                    'Categoria',
                    'Precio',
                    'Estado',
                    '',
                  ].map((column) => (
                    <th
                      key={column}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map(
                  (product) => (
                    <tr
                      key={
                        product.id
                      }
                      className="border-b border-[var(--border-soft)] last:border-0 hover:bg-[var(--surface-hover)]"
                    >
                      <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                        {
                          product.code
                        }
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)]">
                        {
                          product.name
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {
                          product.category
                        }
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                        {money.format(
                          product.unitPrice,
                        )}{' '}
                        <span className="text-xs font-normal text-[var(--text-muted)]">
                          /{' '}
                          {
                            product.unit
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            void toggleActive(
                              product,
                            )
                          }
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            product.active
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-[var(--surface-elevated)] text-[var(--text-muted)]'
                          }`}
                        >
                          {product.active
                            ? 'Activo'
                            : 'Inactivo'}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            void removeProduct(
                              product,
                            )
                          }
                          className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <X
                            size={14}
                          />
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-5">
              <h3 className="font-semibold text-[var(--text-primary)]">
                Nuevo producto
              </h3>

              <button
                type="button"
                onClick={() =>
                  setCreateOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 text-[var(--text-muted)]"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                createProduct
              }
              className="space-y-4 p-6"
            >
              <input
                required
                placeholder="Nombre"
                value={form.name}
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    name: event
                      .target
                      .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <input
                required
                placeholder="Categoria"
                value={
                  form.category
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    category:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="Unidad (ej. kg, servicio)"
                  value={
                    form.unit
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      unit: event
                        .target
                        .value,
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio"
                  value={
                    form.unitPrice
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      unitPrice:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCreateOpen(
                      false,
                    )
                  }
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Crear producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
