import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, History, Pencil, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { listAuditLog, type AuditAction, type AuditLogEntry } from '../../services/auditLog.service'

interface Profile {
  id: string
  email: string
  full_name: string | null
}

const actionMeta: Record<AuditAction, { label: string; icon: typeof Plus; className: string }> = {
  INSERT: { label: 'Creación', icon: Plus, className: 'bg-emerald-500/10 text-emerald-500' },
  UPDATE: { label: 'Edición', icon: Pencil, className: 'bg-amber-500/10 text-amber-500' },
  DELETE: { label: 'Eliminación', icon: Trash2, className: 'bg-rose-500/10 text-rose-500' },
  VIEW: { label: 'Visualización', icon: Eye, className: 'bg-sky-500/10 text-sky-500' },
}

const tableLabels: Record<string, string> = {
  clients: 'Clientes',
  sales: 'Ventas',
  products: 'Productos',
  shipments: 'Envíos',
  documents: 'Documentos',
  documentation_projects: 'Proyectos de documentación',
  documentation_project_members: 'Miembros de proyecto',
  documentation_milestones: 'Avances',
  documentation_milestone_versions: 'Versiones de documento',
  user_permissions: 'Permisos',
  profiles: 'Usuarios',
}

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [tableFilter, setTableFilter] = useState('')
  const [actionFilter, setActionFilter] = useState<AuditAction | ''>('')

  useEffect(() => {
    setLoading(true)
    void Promise.all([
      listAuditLog({ tableName: tableFilter || undefined, action: actionFilter || undefined }),
      supabase.from('profiles').select('id, email, full_name'),
    ])
      .then(([auditRows, profileResult]) => {
        setEntries(auditRows)
        const map: Record<string, Profile> = {}
        for (const profile of (profileResult.data ?? []) as Profile[]) map[profile.id] = profile
        setProfiles(map)
      })
      .catch(() => setError('No se pudo cargar el registro de auditoría.'))
      .finally(() => setLoading(false))
  }, [tableFilter, actionFilter])

  const tableOptions = useMemo(() => Object.keys(tableLabels), [])

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-[var(--accent)]">Seguridad</p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Auditoría</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Historial de cambios importantes del sistema: quién hizo qué y cuándo.</p>
      </section>

      <section className="flex flex-wrap gap-3">
        <select
          value={tableFilter}
          onChange={(event) => setTableFilter(event.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">Todas las tablas</option>
          {tableOptions.map((table) => <option key={table} value={table}>{tableLabels[table]}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value as AuditAction | '')}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(actionMeta).map(([action, meta]) => <option key={action} value={action}>{meta.label}</option>)}
        </select>
      </section>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        {loading ? (
          <p className="p-10 text-center text-sm text-[var(--text-muted)]">Cargando auditoría...</p>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <History className="mx-auto text-[var(--text-muted)]" size={38} />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Todavía no hay movimientos registrados.</p>
          </div>
        ) : (
          entries.map((entry) => {
            const meta = actionMeta[entry.action]
            const Icon = meta.icon
            const actor = entry.changed_by ? profiles[entry.changed_by] : null
            const isExpanded = expanded === entry.id
            return (
              <article key={entry.id} className="border-b border-[var(--border-soft)] last:border-0">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : entry.id)}
                  className="flex w-full items-center gap-4 p-4 text-left hover:bg-[var(--surface-hover)]"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.className}`}><Icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {actor?.full_name ?? actor?.email ?? 'Sistema'} · {meta.label} en {tableLabels[entry.table_name] ?? entry.table_name}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">{new Date(entry.changed_at).toLocaleString('es-PE')}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isExpanded && (
                  <div className="grid gap-3 border-t border-[var(--border-soft)] bg-[var(--surface-elevated)] p-4 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-semibold text-[var(--text-muted)]">Antes</p>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-[var(--text-secondary)]">
                        {entry.old_data ? JSON.stringify(entry.old_data, null, 2) : '—'}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 font-semibold text-[var(--text-muted)]">Después</p>
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--background)] p-3 text-[var(--text-secondary)]">
                        {entry.new_data ? JSON.stringify(entry.new_data, null, 2) : '—'}
                      </pre>
                    </div>
                  </div>
                )}
              </article>
            )
          })
        )}
      </section>
    </div>
  )
}
