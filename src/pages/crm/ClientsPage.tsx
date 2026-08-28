import {
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'

import ClientDetailModal from '../../components/crm/ClientDetailModal'

import {
  deleteClient,
  getClients,
  getSales,
  saveClient,
} from '../../services/crmStorage.service'

import type {
  ClientStatus,
  CrmClient,
  CrmSale,
} from '../../types/crm.types'

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

interface ClientForm {
  name: string
  company: string
  email: string
  phone: string
  status: ClientStatus
}

function emptyForm(): ClientForm {
  return {
    name: '',
    company: '',
    email: '',
    phone: '',
    status: 'Activo',
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<CrmClient[]>([])
  const [sales, setSales] = useState<CrmSale[]>([])

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const [
    selectedClient,
    setSelectedClient,
  ] = useState<CrmClient | null>(null)

  const [saving, setSaving] = useState(false)

  const [form, setForm] =
    useState<ClientForm>(
      emptyForm(),
    )

  const loadData = async () => {
    const [
      storedClients,
      storedSales,
    ] = await Promise.all([
      getClients(),
      getSales(),
    ])

    setClients(storedClients)
    setSales(storedSales)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const filteredClients =
    useMemo(() => {
      const term = search
        .trim()
        .toLowerCase()

      if (!term) {
        return clients
      }

      return clients.filter(
        (client) =>
          [
            client.code,
            client.name,
            client.company,
            client.email,
            client.phone,
            client.status,
          ].some((value) =>
            value
              .toLowerCase()
              .includes(term),
          ),
      )
    }, [clients, search])

  const salesSummary =
    useMemo(() => {
      const result =
        new Map<
          string,
          {
            count: number
            total: number
          }
        >()

      for (const sale of sales) {
        const current =
          result.get(
            sale.clientId,
          ) ?? {
            count: 0,
            total: 0,
          }

        current.count += 1

        if (
          sale.status ===
          'Completada'
        ) {
          current.total +=
            sale.amount
        }

        result.set(
          sale.clientId,
          current,
        )
      }

      return result
    }, [sales])

  const createClient = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !form.name.trim() ||
      !form.company.trim() ||
      !form.email.trim()
    ) {
      return
    }

    setSaving(true)

    try {
      const client: CrmClient = {
        id:
          crypto.randomUUID(),

        code:
          `CLI-${Date.now()
            .toString()
            .slice(-6)}`,

        name:
          form.name.trim(),

        company:
          form.company.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim(),

        status:
          form.status,

        createdAt:
          new Date()
            .toISOString(),
      }

      await saveClient(
        client,
      )

      setClients(
        (current) => [
          client,
          ...current,
        ],
      )

      setCreateOpen(false)
      setForm(emptyForm())
    } finally {
      setSaving(false)
    }
  }

  const updateClient =
    async (
      updated: CrmClient,
    ) => {
      await saveClient(
        updated,
      )

      setClients(
        (current) =>
          current.map(
            (client) =>
              client.id ===
              updated.id
                ? updated
                : client,
          ),
      )

      setSelectedClient(
        updated,
      )
    }

  const removeClient =
    async (
      client: CrmClient,
    ) => {
      const related =
        sales.filter(
          (sale) =>
            sale.clientId ===
            client.id,
        )

      if (
        related.length > 0
      ) {
        return
      }

      await deleteClient(
        client.id,
      )

      setClients(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              client.id,
          ),
      )

      setSelectedClient(
        null,
      )
    }

  const openFromKeyboard = (
    event: KeyboardEvent,
    client: CrmClient,
  ) => {
    if (
      event.key ===
        'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()

      setSelectedClient(
        client,
      )
    }
  }

  const selectedSummary =
    selectedClient
      ? salesSummary.get(
          selectedClient.id,
        ) ?? {
          count: 0,
          total: 0,
        }
      : null

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">
            CRM
          </p>

          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
            Clientes
          </h2>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {clients.length}{' '}
            clientes registrados.
            Selecciona una fila para
            ver o editar su información.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setForm(
              emptyForm(),
            )
            setCreateOpen(
              true,
            )
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
        >
          <Plus size={17} />
          Nuevo cliente
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users
              size={19}
              className="text-[var(--accent)]"
            />

            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Base de clientes
              </p>

              <p className="text-xs text-[var(--text-muted)]">
                Haz clic sobre un registro para abrir su ficha.
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
                  event.target.value,
                )
              }
              placeholder="Buscar..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] py-2.5 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] sm:w-72"
            />
          </div>
        </div>

        {filteredClients.length ===
        0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No hay clientes registrados
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-[var(--border-soft)]">
                  {[
                    'Codigo',
                    'Cliente',
                    'Empresa',
                    'Estado',
                    'Ventas',
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
                {filteredClients.map(
                  (client) => {
                    const summary =
                      salesSummary.get(
                        client.id,
                      ) ?? {
                        count: 0,
                        total: 0,
                      }

                    return (
                      <tr
                        key={
                          client.id
                        }
                        tabIndex={0}
                        onClick={() =>
                          setSelectedClient(
                            client,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) =>
                          openFromKeyboard(
                            event,
                            client,
                          )
                        }
                        className="cursor-pointer border-b border-[var(--border-soft)] transition last:border-0 hover:bg-[var(--surface-hover)] focus:bg-[var(--surface-hover)] focus:outline-none"
                      >
                        <td className="px-5 py-4 text-xs text-[var(--text-muted)]">
                          {
                            client.code
                          }
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-[var(--text-primary)]">
                            {
                              client.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {
                              client.email
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                          {
                            client.company
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                            {
                              client.status
                            }
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {money.format(
                              summary.total,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {
                              summary.count
                            }{' '}
                            registros
                          </p>
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
                Nuevo cliente
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
                createClient
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
                    name:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <input
                required
                placeholder="Empresa"
                value={
                  form.company
                }
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    company:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <input
                required
                type="email"
                placeholder="Correo"
                value={form.email}
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    email:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
              />

              <input
                placeholder="Telefono"
                value={form.phone}
                onChange={(
                  event,
                ) =>
                  setForm({
                    ...form,
                    phone:
                      event
                        .target
                        .value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
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
                        .value as ClientStatus,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)]"
              >
                <option value="Activo">
                  Activo
                </option>

                <option value="Prospecto">
                  Prospecto
                </option>

                <option value="Inactivo">
                  Inactivo
                </option>
              </select>

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
                  Crear cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedClient &&
        selectedSummary && (
          <ClientDetailModal
            client={
              selectedClient
            }
            salesCount={
              selectedSummary.count
            }
            salesTotal={
              selectedSummary.total
            }
            onClose={() =>
              setSelectedClient(
                null,
              )
            }
            onSave={
              updateClient
            }
            onDelete={
              removeClient
            }
          />
        )}
    </div>
  )
}
