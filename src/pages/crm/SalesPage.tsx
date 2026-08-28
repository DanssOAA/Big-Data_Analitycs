import {
  Plus,
  ReceiptText,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

import { Link } from 'react-router'

import SaleDetailModal from '../../components/crm/SaleDetailModal'

import {
  deleteSale,
  getClients,
  getSales,
  saveSale,
} from '../../services/crmStorage.service'

import type {
  CrmClient,
  CrmSale,
  SaleStatus,
} from '../../types/crm.types'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

function today() {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

interface SaleForm {
  clientId: string
  product: string
  quantity: number
  unitPrice: number
  date: string
  status: SaleStatus
}

function emptyForm(): SaleForm {
  return {
    clientId: '',
    product: '',
    quantity: 1,
    unitPrice: 0,
    date: today(),
    status: 'Completada',
  }
}

export default function SalesPage() {
  const [
    clients,
    setClients,
  ] = useState<CrmClient[]>([])

  const [
    sales,
    setSales,
  ] = useState<CrmSale[]>([])

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false)

  const [
    selectedSale,
    setSelectedSale,
  ] = useState<CrmSale | null>(null)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    form,
    setForm,
  ] = useState<SaleForm>(
    emptyForm(),
  )

  const loadData =
    async () => {
      const [
        storedClients,
        storedSales,
      ] = await Promise.all([
        getClients(),
        getSales(),
      ])

      setClients(
        storedClients,
      )

      setSales(
        storedSales,
      )
    }

  useEffect(() => {
    void loadData()
  }, [])

  const clientMap =
    useMemo(
      () =>
        new Map(
          clients.map(
            (client) => [
              client.id,
              client,
            ],
          ),
        ),
      [clients],
    )

  const amount =
    Math.max(
      0,
      form.quantity,
    ) *
    Math.max(
      0,
      form.unitPrice,
    )

  const openCreate = () => {
    if (
      clients.length ===
      0
    ) {
      return
    }

    setForm({
      ...emptyForm(),

      clientId:
        clients[0]?.id ??
        '',
    })

    setCreateOpen(
      true,
    )
  }

  const createSale =
    async (
      event: FormEvent,
    ) => {
      event.preventDefault()

      if (
        !form.clientId ||
        !form.product.trim() ||
        form.quantity <= 0 ||
        form.unitPrice < 0
      ) {
        return
      }

      setSaving(true)

      try {
        const sale:
          CrmSale = {
          id:
            crypto.randomUUID(),

          code:
            `VTA-${Date.now()
              .toString()
              .slice(-6)}`,

          clientId:
            form.clientId,

          product:
            form.product.trim(),

          quantity:
            form.quantity,

          unitPrice:
            form.unitPrice,

          amount,

          date:
            form.date,

          status:
            form.status,

          createdAt:
            new Date()
              .toISOString(),
        }

        await saveSale(
          sale,
        )

        setSales(
          (current) => [
            sale,
            ...current,
          ],
        )

        setCreateOpen(
          false,
        )
      } finally {
        setSaving(false)
      }
    }

  const updateSale =
    async (
      updated:
        CrmSale,
    ) => {
      await saveSale(
        updated,
      )

      setSales(
        (current) =>
          current.map(
            (sale) =>
              sale.id ===
              updated.id
                ? updated
                : sale,
          ),
      )

      setSelectedSale(
        updated,
      )
    }

  const removeSale =
    async (
      sale: CrmSale,
    ) => {
      await deleteSale(
        sale.id,
      )

      setSales(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              sale.id,
          ),
      )

      setSelectedSale(
        null,
      )
    }

  const openFromKeyboard = (
    event:
      KeyboardEvent,
    sale: CrmSale,
  ) => {
    if (
      event.key ===
        'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()

      setSelectedSale(
        sale,
      )
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            CRM
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Ventas
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {sales.length}{' '}
            registros almacenados.
            Selecciona una venta para
            consultar o modificar sus datos.
          </p>
        </div>

        <button
          type="button"
          disabled={
            clients.length ===
            0
          }
          onClick={
            openCreate
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={17} />
          Registrar venta
        </button>
      </section>

      {clients.length ===
        0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
          Primero debes crear un cliente.{' '}

          <Link
            to="/app/clientes"
            className="font-semibold underline"
          >
            Ir a Clientes
          </Link>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5">
          <ReceiptText
            size={19}
            className="text-[var(--accent)]"
          />

          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Operaciones
            </p>

            <p className="text-xs text-[var(--text-muted)]">
              Haz clic sobre un registro para abrirlo.
            </p>
          </div>
        </div>

        {sales.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No hay ventas registradas
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  {[
                    'Venta',
                    'Cliente',
                    'Producto',
                    'Cantidad',
                    'Total',
                    'Fecha',
                    'Estado',
                  ].map(
                    (column) => (
                      <th
                        key={
                          column
                        }
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {sales.map(
                  (sale) => {
                    const client =
                      clientMap.get(
                        sale.clientId,
                      )

                    return (
                      <tr
                        key={
                          sale.id
                        }
                        tabIndex={0}
                        onClick={() =>
                          setSelectedSale(
                            sale,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) =>
                          openFromKeyboard(
                            event,
                            sale,
                          )
                        }
                        className="cursor-pointer border-b border-[var(--border-soft)] transition last:border-0 hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:outline-none"
                      >
                        <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                          {
                            sale.code
                          }
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {client?.name ??
                              'Cliente no encontrado'}
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {client?.company ??
                              ''}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            sale.product
                          }
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            sale.quantity
                          }
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                          {money.format(
                            sale.amount,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            sale.date
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              sale.status ===
                              'Completada'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : sale.status ===
                                    'Pendiente'
                                  ? 'bg-amber-500/10 text-amber-600'
                                  : 'bg-rose-500/10 text-rose-500'
                            }`}
                          >
                            {
                              sale.status
                            }
                          </span>
                        </td>
                      </tr>
                    )
                  },
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
                Registrar venta
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
                createSale
              }
              className="space-y-4 p-6"
            >
              <select
                value={
                  form.clientId
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    clientId:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                {clients.map(
                  (client) => (
                    <option
                      key={
                        client.id
                      }
                      value={
                        client.id
                      }
                    >
                      {
                        client.name
                      }{' '}
                      -{' '}
                      {
                        client.company
                      }
                    </option>
                  ),
                )}
              </select>

              <input
                required
                placeholder="Producto"
                value={
                  form.product
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    product:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              />

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  min="1"
                  value={
                    form.quantity
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      quantity:
                        Number(
                          event
                            .target
                            .value,
                        ),
                    })
                  }
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
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
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
                <p className="text-xs text-[var(--text-muted)]">
                  Total
                </p>

                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {money.format(
                    amount,
                  )}
                </p>
              </div>

              <input
                type="date"
                value={
                  form.date
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    date:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              />

              <select
                value={
                  form.status
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    status:
                      event
                        .target
                        .value as SaleStatus,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                <option value="Completada">
                  Completada
                </option>

                <option value="Pendiente">
                  Pendiente
                </option>

                <option value="Cancelada">
                  Cancelada
                </option>
              </select>

              <div className="flex justify-end gap-2">
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
                  className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={
            selectedSale
          }
          clients={
            clients
          }
          onClose={() =>
            setSelectedSale(
              null,
            )
          }
          onSave={
            updateSale
          }
          onDelete={
            removeSale
          }
        />
      )}
    </div>
  )
}
