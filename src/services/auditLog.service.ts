import { toError } from './errors'
import { supabase } from './supabaseClient'

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW'

export interface AuditLogEntry {
  id: number
  table_name: string
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  changed_at: string
}

export interface AuditLogFilters {
  tableName?: string
  action?: AuditAction
  userId?: string
  limit?: number
}

export async function listAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(filters.limit ?? 200)

  if (filters.tableName) query = query.eq('table_name', filters.tableName)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.userId) query = query.eq('changed_by', filters.userId)

  const { data, error } = await query
  if (error) throw toError(error)
  return (data ?? []) as AuditLogEntry[]
}
