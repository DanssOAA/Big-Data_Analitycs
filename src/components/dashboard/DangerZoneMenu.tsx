import {
  AlertTriangle,
  LoaderCircle,
  MoreVertical,
  Trash2,
  X,
} from 'lucide-react'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { resetAllProductionData } from '../../services/dangerZone.service'

const CONFIRM_PHRASE = 'ELIMINAR TODO'

export default function DangerZoneMenu() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      closeMenu,
    )

    return () =>
      document.removeEventListener(
        'mousedown',
        closeMenu,
      )
  }, [])

  const openModal = () => {
    setMenuOpen(false)
    setModalOpen(true)
    setConfirmText('')
    setError('')
  }

  const closeModal = () => {
    if (deleting) {
      return
    }

    setModalOpen(false)
    setConfirmText('')
    setError('')
  }

  const handleDeleteAll = async () => {
    if (confirmText !== CONFIRM_PHRASE) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      await resetAllProductionData()
      window.location.reload()
    } catch (exception) {
      setDeleting(false)

      setError(
        exception instanceof Error
          ? exception.message
          : 'No se pudo eliminar la informacion.',
      )
    }
  }

  return (
    <>
      <div
        ref={menuRef}
        className="relative"
      >
        <button
          type="button"
          onClick={() =>
            setMenuOpen((current) => !current)
          }
          title="Mas opciones"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <MoreVertical size={17} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="border-b border-[var(--border-soft)] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Zona de peligro
              </p>
            </div>

            <button
              type="button"
              onClick={openModal}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-500 transition hover:bg-rose-500/10"
            >
              <Trash2 size={16} />
              Eliminar todos los datos
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[var(--surface)] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 py-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                  <AlertTriangle size={19} />
                </div>

                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    Eliminar todos los datos
                  </h3>

                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Esta accion es irreversible.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={deleting}
                className="rounded-lg p-2 text-[var(--text-muted)] disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                Se van a borrar de forma permanente <strong>todos</strong> los
                clientes, ventas, actividades, productos, envios, datasets e
                insights de esta aplicacion. Las cuentas de acceso (usuarios)
                no se ven afectadas.
              </p>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                  Escribe{' '}
                  <span className="font-mono font-semibold text-rose-500">
                    {CONFIRM_PHRASE}
                  </span>{' '}
                  para confirmar
                </span>

                <input
                  value={confirmText}
                  onChange={(event) =>
                    setConfirmText(
                      event.target.value,
                    )
                  }
                  disabled={deleting}
                  placeholder={CONFIRM_PHRASE}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-rose-500"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={deleting}
                  className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--text-secondary)] disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    confirmText !==
                      CONFIRM_PHRASE ||
                    deleting
                  }
                  onClick={() =>
                    void handleDeleteAll()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deleting ? (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <Trash2 size={15} />
                  )}

                  {deleting
                    ? 'Eliminando...'
                    : 'Eliminar todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
