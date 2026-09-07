import { useId, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface DoubleConfirmDeleteModalProps {
  itemLabel: string
  confirmWord?: string
  description?: string
  error?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * Borrado permanente en dos pasos: primero una advertencia normal, luego un
 * campo que exige tipear una palabra exacta para habilitar el botón
 * destructivo (patrón "escribe ELIMINAR", igual que GitHub al borrar un
 * repositorio). Pensado para acciones que no se pueden deshacer.
 */
export default function DoubleConfirmDeleteModal({
  itemLabel,
  confirmWord = 'ELIMINAR',
  description,
  error,
  busy = false,
  onCancel,
  onConfirm,
}: DoubleConfirmDeleteModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')
  const titleId = useId()
  const inputId = useId()

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-rose-500/30 bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertTriangle size={20} />
            <h3 id={titleId} className="text-lg font-semibold">Eliminar definitivamente</h3>
          </div>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Cancelar" className="text-[var(--text-secondary)] disabled:opacity-40">
            <X size={20} />
          </button>
        </div>

        {step === 1 ? (
          <>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              Vas a eliminar <strong className="text-[var(--text-primary)]">&quot;{itemLabel}&quot;</strong> de forma
              permanente. {description ?? 'Esta acción no se puede deshacer y el archivo no se podrá recuperar.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] disabled:opacity-40">
                Cancelar
              </button>
              <button type="button" onClick={() => setStep(2)} disabled={busy} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                Continuar
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 break-words text-sm text-[var(--text-secondary)]">Eliminarás <strong className="text-[var(--text-primary)]">{itemLabel}</strong>.</p>
            <label htmlFor={inputId} className="mt-3 block text-sm text-[var(--text-secondary)]">
              Para confirmar, escribe <strong className="text-[var(--text-primary)]">{confirmWord}</strong> abajo.
            </label>
            <input
              id={inputId}
              value={typed}
              disabled={busy}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-rose-500"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={onCancel} disabled={busy} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] disabled:opacity-40">
                Cancelar
              </button>
              <button
                type="button"
                disabled={typed !== confirmWord || busy}
                onClick={onConfirm}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </>
        )}
        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-500">{error}</p>}
      </div>
    </div>
  )
}
