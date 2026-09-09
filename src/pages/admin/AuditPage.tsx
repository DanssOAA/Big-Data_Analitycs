import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabaseClient'

interface AuditEntry {
  id: number
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW'
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
}

const actionLabels: Record<AuditEntry['action'], string> = {
  INSERT: 'Creación', UPDATE: 'Actualización', DELETE: 'Eliminación', VIEW: 'Visualización',
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data, error: queryError } = await supabase
        .from('audit_log').select('*').order('changed_at', { ascending: false }).limit(200)

      if (queryError) setError(`No se pudo cargar la auditoría: ${queryError.message}`)
      else setRows((data ?? []) as AuditEntry[])
      setLoading(false)
    }
    void load()
  }, [])

  return <div className="space-y-5">
    <div><p className="text-sm font-medium text-[var(--accent)]">Administración</p><h2 className="text-2xl font-semibold">Auditoría</h2><p className="mt-1 text-sm text-[var(--text-muted)]">Últimos 200 eventos registrados.</p></div>
    {error && <p className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-500">{error}</p>}
    <div className="overflow-x-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      {loading ? <p className="p-6 text-sm text-[var(--text-muted)]">Cargando auditoría...</p>
        : rows.length === 0 ? <p className="p-6 text-sm text-[var(--text-muted)]">Todavía no hay eventos registrados.</p>
          : <table className="w-full min-w-[850px] text-sm">
            <thead><tr className="text-left text-[var(--text-muted)]"><th className="p-4">Fecha</th><th className="p-4">Acción</th><th className="p-4">Módulo</th><th className="p-4">Registro</th><th className="p-4">Usuario</th><th className="p-4">Detalle</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[var(--border-soft)] align-top">
              <td className="whitespace-nowrap p-4">{new Date(row.changed_at).toLocaleString()}</td>
              <td className="p-4 font-medium">{actionLabels[row.action]}</td>
              <td className="p-4"><code>{row.table_name}</code></td>
              <td className="max-w-48 truncate p-4" title={row.record_id}>{row.record_id || '—'}</td>
              <td className="max-w-40 truncate p-4" title={row.changed_by ?? ''}>{row.changed_by ?? 'Sistema'}</td>
              <td className="p-4"><details><summary className="cursor-pointer text-[var(--accent)]">Ver cambios</summary><pre className="mt-2 max-h-72 max-w-xl overflow-auto rounded-lg bg-[var(--surface-elevated)] p-3 text-xs">{JSON.stringify({ before: row.old_data, after: row.new_data }, null, 2)}</pre></details></td>
            </tr>)}</tbody>
          </table>}
    </div>
  </div>
}
