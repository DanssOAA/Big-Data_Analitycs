import { ShieldCheck, UserCog, Users } from 'lucide-react'

const users = [
  {
    name: 'Administrador Demo',
    email: 'admin@crminsights.local',
    role: 'Administrador',
  },
  {
    name: 'Trabajador Demo',
    email: 'trabajador@crminsights.local',
    role: 'Trabajador',
  },
]

export default function UsersPage() {
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

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5">
          <Users size={19} className="text-[var(--accent)]" />
          <p className="font-semibold text-white">
            Usuarios registrados
          </p>
        </div>

        {users.map((user) => (
          <div
            key={user.email}
            className="flex items-center gap-4 border-b border-[var(--border-soft)] p-5 last:border-0"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
              {user.role === 'Administrador' ? (
                <ShieldCheck size={18} />
              ) : (
                <UserCog size={18} />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {user.email}
              </p>
            </div>

            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--accent)]">
              {user.role}
            </span>
          </div>
        ))}
      </section>
    </div>
  )
}
