import { supabase } from './supabaseClient'
import { toError } from './errors'
import type { Project, ProjectMember, ProjectInvite, ProjectRole } from '../types/project.types'

// ---------------------------------------------------------------------------
// Tipos internos que mapean las tablas de Supabase
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string
  name: string
  description: string
  owner_id: string
  created_at: string
}

interface InviteRow {
  id: string
  project_id: string
  email: string
  role: ProjectRole
  invited_at: string
  invited_by: string
  accepted: boolean | null
}

// ---------------------------------------------------------------------------
// Proyectos
// ---------------------------------------------------------------------------

/**
 * Devuelve todos los proyectos a los que pertenece el usuario autenticado
 * (como owner o como miembro invitado). Equivale a "tus repos" en GitHub.
 */
export async function getProjects(userId: string): Promise<Project[]> {
  // 1. IDs de proyectos donde el usuario es miembro
  const { data: memberRows, error: memberError } = await supabase
    .from('project_members')
    .select('project_id, role')
    .eq('user_id', userId)

  if (memberError) throw toError(memberError)

  const myRoleMap = new Map<string, ProjectRole>(
    (memberRows ?? []).map((r) => [r.project_id as string, r.role as ProjectRole]),
  )

  if (myRoleMap.size === 0) return []

  const projectIds = Array.from(myRoleMap.keys())

  // 2. Datos de los proyectos + conteo de miembros
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description, owner_id, created_at')
    .in('id', projectIds)
    .order('created_at', { ascending: false })

  if (projectError) throw toError(projectError)

  // 3. Conteo de miembros por proyecto
  const { data: counts } = await supabase
    .from('project_members')
    .select('project_id')
    .in('project_id', projectIds)

  const countMap = new Map<string, number>()
  for (const row of counts ?? []) {
    const pid = row.project_id as string
    countMap.set(pid, (countMap.get(pid) ?? 0) + 1)
  }

  return (projects as ProjectRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    ownerId: p.owner_id,
    createdAt: p.created_at,
    myRole: myRoleMap.get(p.id) ?? 'viewer',
    memberCount: countMap.get(p.id) ?? 1,
  }))
}

/**
 * Crea un proyecto nuevo y registra al creador como owner.
 */
export async function createProject(
  userId: string,
  name: string,
  description: string,
): Promise<Project> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const { error: insertError } = await supabase.from('projects').insert({
    id,
    name: name.trim(),
    description: description.trim(),
    owner_id: userId,
    created_at: now,
  })

  if (insertError) throw toError(insertError)

  // El owner también es miembro con rol 'owner'
  const { error: memberError } = await supabase.from('project_members').insert({
    project_id: id,
    user_id: userId,
    role: 'owner',
    joined_at: now,
  })

  if (memberError) throw toError(memberError)

  return {
    id,
    name: name.trim(),
    description: description.trim(),
    ownerId: userId,
    createdAt: now,
    myRole: 'owner',
    memberCount: 1,
  }
}

/**
 * Actualiza nombre y descripción de un proyecto.
 * Solo owner / admin pueden llamar esto (validar en UI).
 */
export async function updateProject(
  projectId: string,
  name: string,
  description: string,
): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ name: name.trim(), description: description.trim() })
    .eq('id', projectId)

  if (error) throw toError(error)
}

/**
 * Elimina el proyecto y en cascada sus miembros, invitaciones y datasets
 * asociados (las foreign keys deben tener ON DELETE CASCADE en Supabase).
 */
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId)
  if (error) throw toError(error)
}

// ---------------------------------------------------------------------------
// Miembros
// ---------------------------------------------------------------------------

/**
 * Devuelve la lista completa de miembros de un proyecto con sus perfiles.
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  // 1. Traer miembros del proyecto
  const { data: memberRows, error } = await supabase
    .from('project_members')
    .select('user_id, role, joined_at')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })

  if (error) throw toError(error)
  if (!memberRows || memberRows.length === 0) return []

  const userIds = memberRows.map((r) => r.user_id as string)

  // 2. Traer perfiles por separado (evita el join que falla si no hay FK declarada)
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const profileMap = new Map<string, { email: string; full_name: string | null }>(
    (profileRows ?? []).map((p) => [p.id as string, { email: p.email as string, full_name: p.full_name as string | null }]),
  )

  return memberRows.map((row) => {
    const profile = profileMap.get(row.user_id as string)
    return {
      userId: row.user_id as string,
      email: profile?.email ?? '',
      fullName: profile?.full_name ?? null,
      role: row.role as ProjectRole,
      joinedAt: row.joined_at as string,
    }
  })
}

/**
 * Cambia el rol de un miembro existente.
 */
export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw toError(error)
}

/**
 * Elimina a un miembro del proyecto (kick).
 */
export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) throw toError(error)
}

// ---------------------------------------------------------------------------
// Invitaciones
// ---------------------------------------------------------------------------

/**
 * Crea una invitación por email para un proyecto.
 * Si ya existe una pendiente para ese email en el mismo proyecto, la reemplaza.
 */
export async function inviteMember(
  projectId: string,
  invitedByUserId: string,
  email: string,
  role: ProjectRole,
): Promise<ProjectInvite> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  // Upsert: si ya había una invitación pendiente para ese email, la refresca
  const { error } = await supabase.from('project_invites').upsert(
    {
      id,
      project_id: projectId,
      email: email.trim().toLowerCase(),
      role,
      invited_at: now,
      invited_by: invitedByUserId,
      accepted: null,
    },
    { onConflict: 'project_id,email' },
  )

  if (error) throw toError(error)

  return {
    id,
    projectId,
    email: email.trim().toLowerCase(),
    role,
    invitedAt: now,
    invitedBy: invitedByUserId,
    accepted: null,
  }
}

/**
 * Devuelve las invitaciones pendientes de un proyecto.
 */
export async function getProjectInvites(projectId: string): Promise<ProjectInvite[]> {
  const { data, error } = await supabase
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .is('accepted', null)
    .order('invited_at', { ascending: false })

  if (error) throw toError(error)

  return (data as InviteRow[]).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    email: row.email,
    role: row.role,
    invitedAt: row.invited_at,
    invitedBy: row.invited_by,
    accepted: row.accepted,
  }))
}

/**
 * Cancela (elimina) una invitación pendiente.
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('project_invites').delete().eq('id', inviteId)
  if (error) throw toError(error)
}

/**
 * El usuario acepta una invitación: se marca como aceptada y se inserta
 * en project_members. Retorna el projectId para redirigir.
 */
export async function acceptInvite(
  inviteId: string,
  userId: string,
): Promise<string> {
  // 1. Obtener invitación
  const { data: inviteData, error: fetchError } = await supabase
    .from('project_invites')
    .select('project_id, role')
    .eq('id', inviteId)
    .maybeSingle()

  if (fetchError) throw toError(fetchError)
  if (!inviteData) throw new Error('Invitación no encontrada.')

  const invite = inviteData as { project_id: string; role: ProjectRole }

  // 2. Marcar como aceptada
  const { error: updateError } = await supabase
    .from('project_invites')
    .update({ accepted: true })
    .eq('id', inviteId)

  if (updateError) throw toError(updateError)

  // 3. Insertar miembro (ignora si ya existe)
  const { error: memberError } = await supabase.from('project_members').upsert(
    {
      project_id: invite.project_id,
      user_id: userId,
      role: invite.role,
      joined_at: new Date().toISOString(),
    },
    { onConflict: 'project_id,user_id' },
  )

  if (memberError) throw toError(memberError)

  return invite.project_id
}

/**
 * Devuelve las invitaciones pendientes para el email del usuario logueado.
 * Se usa en la página de proyectos para mostrar el badge de "tienes invitaciones".
 */
export async function getPendingInvitesForEmail(email: string): Promise<ProjectInvite[]> {
  const { data, error } = await supabase
    .from('project_invites')
    .select('*, projects(name)')
    .eq('email', email.toLowerCase())
    .is('accepted', null)
    .order('invited_at', { ascending: false })

  if (error) throw toError(error)

  return (data as (InviteRow & { projects: { name: string } | null })[]).map((row) => ({
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? '',
    email: row.email,
    role: row.role,
    invitedAt: row.invited_at,
    invitedBy: row.invited_by,
    accepted: row.accepted,
  }))
}

/**
 * El usuario rechaza una invitación.
 */
export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase
    .from('project_invites')
    .update({ accepted: false })
    .eq('id', inviteId)

  if (error) throw toError(error)
}
