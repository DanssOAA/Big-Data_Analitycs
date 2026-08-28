import {
  Calculator,
  CalendarDays,
  Package,
  Save,
  Trash2,
  X,
} from 'lucide-react'

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import type {
  CrmClient,
  CrmSale,
  SaleStatus,
} from '../../types/crm.types'

interface SaleDetailModalProps {
  sale: CrmSale
  clients: CrmClient[]
  onClose: () => void
  onSave: (sale: CrmSale) => Promise<void>
  onDelete: (sale: CrmSale) => Promise<void>
}

const money = new Intl.NumberFormat(
  'es-PE',
  {
    style: 'currency',
    currency: 'PEN',
  },
)

export default function SaleDetailModal({
  sale,
  clients,
  onClose,
  onSave,
  onDelete,
}: SaleDetailModalProps) {
  const [draft, setDraft] = useState<CrmSale>(sale)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setDraft(sale)
  }, [sale])

  const amount =
    Math.max(
      0,
      Number(draft.quantity),
    ) *
    Math.max(
      0,
      Number(draft.unitPrice),
    )

  const handleSave = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !draft.clientId ||
      !draft.product.trim() ||
      draft.quantity <= 0 ||
      draft.unitPrice < 0
    ) {
      return
    }

    setSaving(true)

    try {
      await onSave({
        ...draft,
        product:
          draft.product.trim(),
        quantity:
          Number(draft.quantity),
        unitPrice:
          Number(draft.unitPrice),
        amount,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed =
      window.confirm(
        `¿Eliminar la venta "${sale.code}"?`,
      )

    if (!confirmed) {
      return
    }

    setDeleting(true)

    try {
      await onDelete(sale)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/35 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Cerrar detalle"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <header className="flex items-start justify-between border-b border-[var(--border-soft)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              {sale.code}
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              Detalle de venta
            </h2>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Consulta y modifica el registro almacenado.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)]"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
              <Calculator size={14} />
              Total actual
            </p>

            <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
              {money.format(amount)}
            </p>
          </div>

          <form
            id="sale-detail-form"
            onSubmit={handleSave}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Cliente
              </label>

              <select
                value={draft.clientId}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    clientId:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {clients.map(
                  (client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name} -{' '}
                      {client.company}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <Package size={15} />
                Producto
              </label>

              <input
                value={draft.product}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    product:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Cantidad
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.quantity}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      quantity:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Precio unitario
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.unitPrice}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      unitPrice:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <CalendarDays size={15} />
                Fecha
              </label>

              <input
                type="date"
                value={draft.date}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    date:
                      event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Estado
              </label>

              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status:
                      event.target.value as SaleStatus,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
            </div>

            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Registro creado
              </p>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {new Date(
                  sale.createdAt,
                ).toLocaleString(
                  'es-PE',
                )}
              </p>
            </div>
          </form>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] p-5">
          <button
            type="button"
            disabled={deleting}
            onClick={() =>
              void handleDelete()
            }
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-500/10 disabled:opacity-50"
          >
            <Trash2 size={16} />

            {deleting
              ? 'Eliminando...'
              : 'Eliminar'}
          </button>

          <button
            type="submit"
            form="sale-detail-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Save size={16} />

            {saving
              ? 'Guardando...'
              : 'Guardar cambios'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
