import { useState } from 'react'
import { UserPlus, X, Info } from 'lucide-react'
import { inviteMember } from '../../services/projectStorage.service'
import { useAuth } from '../../context/AuthContext'
import type { ProjectRole } from '../../types/project.types'

interface InviteMemberModalProps {
  projectId: string
  projectName: string
  onClose: () => void
  onInvited: () => void
}

const roleDescriptions: Record<ProjectRole, string> = {
  owner: 'Control total — no se puede asignar por invitación',
  admin: 'Gestiona miembros y edita datasets',
  editor: 'Sube y edita datasets, no gestiona miembros',
  viewer: 'Solo lectura',
}

const assignableRoles: ProjectRole[] = ['admin', 'editor', 'viewer']

export default function InviteMemberModal({
  projectId,
  projectName,
  onClose,
  onInvited,
}: InviteMemberModalProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('editor')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Ingresa un email válido.')
      return
    }
    if (trimmed === user?.email?.toLowerCase()) {
      setError('No puedes invitarte a ti mismo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await inviteMember(projectId, user!.id, trimmed, role)
      setSuccess(`Invitación enviada a ${trimmed}`)
      setEmail('')
      onInvited()
    } catch {
      setError('No se pudo enviar la invitación. El email puede no estar registrado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
              <UserPlus size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Invitar colaborador</p>
              <p className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Email del colaborador <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSuccess('') }}
              placeholder="colega@empresa.com"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
              Rol en el proyecto
            </label>
            <div className="space-y-2">
              {assignableRoles.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                    role === r
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border-soft)] hover:border-[var(--border)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-sm font-medium capitalize text-[var(--text-primary)]">{r}</p>
                    <p className="text-xs text-[var(--text-muted)]">{roleDescriptions[r]}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Info sobre flujo de invitación */}
          <div className="flex items-start gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2.5">
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-muted)]">
              La invitación aparecerá en la página de Proyectos del colaborador para que la acepte o rechace.
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              {success}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60 hover:opacity-90"
            >
              {saving ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
