import { ChevronDown, ChevronUp, ShieldCheck, UserCog, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'
import { actions, emptyPermissions, modules, type AppModule, type PermissionAction, type PermissionMap } from '../../types/permission.types'
import type { UserRole } from '../../types/auth.types'

interface Profile { id: string; email: string; full_name: string | null; role: UserRole }

const moduleLabels: Record<AppModule, string> = {
  dashboard: 'Dashboard', clients: 'Clientes', sales: 'Ventas', products: 'Productos',
  shipments: 'Envíos', activities: 'Actividades', insights: 'Insights', documentation: 'Documentación',
}
const actionLabels: Record<PermissionAction, string> = { view: 'Ver', create: 'Crear / subir', update: 'Editar', delete: 'Eliminar' }

export default function UsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [permissions, setPermissions] = useState<Record<string, PermissionMap>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      const [{ data: profileData, error }, { data: permissionData }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at'),
        supabase.from('user_permissions').select('*'),
      ])
      if (error) setMessage('No se pudieron cargar los usuarios.')
      const next: Record<string, PermissionMap> = {}
      for (const profile of profileData ?? []) next[profile.id] = emptyPermissions()
      for (const row of permissionData ?? []) {
        if (next[row.user_id]?.[row.module as AppModule]) next[row.user_id][row.module as AppModule] = {
          view: row.can_view, create: row.can_create, update: row.can_update, delete: row.can_delete,
        }
      }
      setUsers((profileData ?? []) as Profile[]); setPermissions(next); setLoading(false)
    }
    void load()
  }, [])

  const changeRole = async (user: Profile, role: UserRole) => {
    setSaving(user.id); setMessage('')
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id)
    if (error) setMessage('No se pudo cambiar el rol.')
    else setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item))
    setSaving('')
  }

  const toggle = async (userId: string, module: AppModule, action: PermissionAction) => {
    const current = permissions[userId]?.[module] ?? emptyPermissions()[module]
    const updated = { ...current, [action]: !current[action] }
    if (action !== 'view' && updated[action]) updated.view = true
    if (action === 'view' && !updated.view) { updated.create = false; updated.update = false; updated.delete = false }
    setPermissions((all) => ({ ...all, [userId]: { ...all[userId], [module]: updated } }))
    setSaving(`${userId}-${module}`); setMessage('')
    const { error } = await supabase.from('user_permissions').upsert({
      user_id: userId, module, can_view: updated.view, can_create: updated.create,
      can_update: updated.update, can_delete: updated.delete,
    }, { onConflict: 'user_id,module' })
    if (error) {
      setPermissions((all) => ({ ...all, [userId]: { ...all[userId], [module]: current } }))
      setMessage('No se pudo guardar el permiso.')
    } else setMessage('Permisos guardados.')
    setSaving('')
  }

  return <div className="space-y-6">
    <section><p className="text-sm font-medium text-[var(--accent)]">Administración</p><h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Usuarios y permisos</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Asigna un rol y define qué puede hacer cada persona en cada módulo.</p></section>
    {message && <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">{message}</div>}
    <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--border-soft)] p-5"><Users size={19} className="text-[var(--accent)]"/><p className="font-semibold text-[var(--text-primary)]">Usuarios registrados</p></div>
      {loading ? <p className="p-10 text-center text-sm text-[var(--text-muted)]">Cargando usuarios...</p> : users.map((user) => <div key={user.id} className="border-b border-[var(--border-soft)] last:border-0">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-[var(--text-secondary)]">{user.role === 'admin' ? <ShieldCheck size={18}/> : <UserCog size={18}/>}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.full_name ?? user.email}</p><p className="mt-1 truncate text-xs text-[var(--text-muted)]">{user.email}</p></div>
          <select aria-label={`Rol de ${user.email}`} value={user.role} disabled={saving === user.id} onChange={(event) => void changeRole(user, event.target.value as UserRole)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"><option value="admin">Administrador</option><option value="analyst">Analista</option><option value="worker">Trabajador</option></select>
          {user.role !== 'admin' && <button type="button" onClick={() => setExpanded(expanded === user.id ? null : user.id)} className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]">Permisos {expanded === user.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>}
        </div>
        {expanded === user.id && user.role !== 'admin' && <div className="overflow-x-auto border-t border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5"><table className="w-full min-w-[620px] text-sm"><thead><tr><th className="pb-3 text-left font-medium text-[var(--text-muted)]">Módulo</th>{actions.map((action) => <th key={action} className="pb-3 text-center font-medium text-[var(--text-muted)]">{actionLabels[action]}</th>)}</tr></thead><tbody>{modules.map((module) => <tr key={module} className="border-t border-[var(--border-soft)]"><td className="py-3 font-medium text-[var(--text-primary)]">{moduleLabels[module]}</td>{actions.map((action) => <td key={action} className="text-center"><input type="checkbox" aria-label={`${actionLabels[action]} ${moduleLabels[module]}`} checked={permissions[user.id]?.[module]?.[action] ?? false} disabled={saving === `${user.id}-${module}`} onChange={() => void toggle(user.id, module, action)} className="h-4 w-4 accent-[var(--accent)]"/></td>)}</tr>)}</tbody></table></div>}
      </div>)}
    </section>
  </div>
}
