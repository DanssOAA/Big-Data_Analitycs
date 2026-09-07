import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { listAllUsers, type DirectoryUser, type DocProjectRole } from '../../services/documentationProjects.service'

interface InviteExistingUserModalProps {
  existingMemberIds: string[]
  busy?: boolean
  onCancel: () => void
  onAdd: (userId: string, role: DocProjectRole) => void
}

/**
 * A diferencia del módulo "Proyectos" genérico (que invita por email libre
 * y el invitado acepta después), aquí el administrador elige directamente
 * entre usuarios ya registrados en el sistema. No hay paso de aceptación.
 */
export default function InviteExistingUserModal({
  existingMemberIds,
  busy = false,
  onCancel,
  onAdd,
}: InviteExistingUserModalProps) {
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<DocProjectRole>('viewer')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void listAllUsers()
      .then((all) => {
        const available = all.filter((user) => !existingMemberIds.includes(user.id))
        setUsers(available)
        setUserId(available[0]?.id ?? '')
      })
      .catch(() => setError('No se pudo cargar la lista de usuarios.'))
      .finally(() => setLoading(false))
  }, [existingMemberIds])

  // Agrupado por área (Ventas, Logística, etc.) para que sea fácil ubicar a
  // alguien dentro de una empresa con muchos usuarios; quienes no tienen
  // área asignada caen en un grupo aparte.
  const groups = users.reduce<Record<string, DirectoryUser[]>>((acc, candidate) => {
    const key = candidate.area?.trim() || 'Sin área asignada'
    acc[key] = acc[key] ?? []
    acc[key].push(candidate)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Agregar persona al proyecto</h3>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-[var(--text-secondary)]">
            <X size={20} />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--text-muted)]">Cargando usuarios...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Todos los usuarios registrados ya son miembros de este proyecto.</p>
          ) : (
            <>
              <label className="block text-sm text-[var(--text-secondary)]">
                Usuario
                <select
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
                >
                  {Object.entries(groups).map(([area, people]) => (
                    <optgroup key={area} label={area}>
                      {people.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name ?? user.email} ({user.email})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                Rol en el proyecto
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as DocProjectRole)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
                >
                  <option value="viewer">Solo lectura</option>
                  <option value="editor">Puede editar</option>
                </select>
              </label>
            </>
          )}
          {error && <p className="text-sm text-rose-500">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
            Cancelar
          </button>
          {users.length > 0 && (
            <button
              type="button"
              disabled={busy || !userId}
              onClick={() => onAdd(userId, role)}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Agregando...' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
