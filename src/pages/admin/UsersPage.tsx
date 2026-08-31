import {
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'

import {
  useEffect,
  useState,
} from 'react'

import { supabase } from '../../services/supabaseClient'

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
}

export default function UsersPage() {
  const [
    users,
    setUsers,
  ] = useState<Profile[]>([])

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [error, setError] =
    useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error: queryError } =
        await supabase
          .from('profiles')
          .select('*')
          .order('created_at', {
            ascending: true,
          })

      if (queryError) {
        setError(
          'No se pudieron cargar los usuarios. Intenta nuevamente en unos minutos.',
        )
      } else {
        setUsers(
          (data ?? []) as Profile[],
        )
      }

      setLoading(false)
    }

    void load()
  }, [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[var(--accent)]">
          Administración
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          Usuarios
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Gestión de usuarios y roles del sistema.
        </p>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5">
          <Users size={19} className="text-[var(--accent)]" />
          <p className="font-semibold text-white">
            Usuarios registrados
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--text-muted)]">
            No hay usuarios registrados todavia.
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-4 border-b border-[var(--border-soft)] p-5 last:border-0"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                {user.role === 'admin' ? (
                  <ShieldCheck size={18} />
                ) : (
                  <UserCog size={18} />
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {user.full_name ?? user.email}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {user.email}
                </p>
              </div>

              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
                {user.role === 'admin'
                  ? 'Administrador'
                  : 'Trabajador'}
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
