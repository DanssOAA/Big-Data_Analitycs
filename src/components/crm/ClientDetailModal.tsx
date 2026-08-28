import {
  Building2,
  Mail,
  Phone,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import {
  useEffect,
  useState,
  type FormEvent,
} from 'react'

import type {
  ClientStatus,
  CrmClient,
} from '../../types/crm.types'

interface ClientDetailModalProps {
  client: CrmClient
  salesCount: number
  salesTotal: number
  onClose: () => void
  onSave: (client: CrmClient) => Promise<void>
  onDelete: (client: CrmClient) => Promise<void>
}

const money = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
})

export default function ClientDetailModal({
  client,
  salesCount,
  salesTotal,
  onClose,
  onSave,
  onDelete,
}: ClientDetailModalProps) {
  const [draft, setDraft] = useState<CrmClient>(client)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setDraft(client)
  }, [client])

  const handleSave = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (
      !draft.name.trim() ||
      !draft.company.trim() ||
      !draft.email.trim()
    ) {
      return
    }

    setSaving(true)

    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        company: draft.company.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (salesCount > 0) {
      return
    }

    const confirmed = window.confirm(
      `¿Eliminar al cliente "${client.name}"?`,
    )

    if (!confirmed) {
      return
    }

    setDeleting(true)

    try {
      await onDelete(client)
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
              {client.code}
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {client.name}
            </h2>

            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Registro almacenado en el CRM
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
          <section className="mb-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Ventas asociadas
              </p>

              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                {salesCount}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Total vendido
              </p>

              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                {money.format(salesTotal)}
              </p>
            </div>
          </section>

          <form
            id="client-detail-form"
            onSubmit={handleSave}
            className="space-y-5"
          >
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <UserRound size={15} />
                Nombre
              </label>

              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    name: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <Building2 size={15} />
                Empresa
              </label>

              <input
                value={draft.company}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    company: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <Mail size={15} />
                Correo
              </label>

              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    email: event.target.value,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]">
                <Phone size={15} />
                Telefono
              </label>

              <input
                value={draft.phone}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    phone: event.target.value,
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
                    status: event.target.value as ClientStatus,
                  })
                }
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
            </div>

            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4">
              <p className="text-xs text-[var(--text-muted)]">
                Creado
              </p>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {new Date(
                  client.createdAt,
                ).toLocaleString('es-PE')}
              </p>
            </div>
          </form>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border-soft)] p-5">
          <div>
            <button
              type="button"
              disabled={
                salesCount > 0 ||
                deleting
              }
              onClick={() =>
                void handleDelete()
              }
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 size={16} />
              {deleting
                ? 'Eliminando...'
                : 'Eliminar'}
            </button>

            {salesCount > 0 && (
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                No se puede eliminar porque tiene ventas asociadas.
              </p>
            )}
          </div>

          <button
            type="submit"
            form="client-detail-form"
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
