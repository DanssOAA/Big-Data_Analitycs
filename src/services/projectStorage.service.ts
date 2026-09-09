import { supabase } from './supabaseClient'
import { toError } from './errors'
import type { Project, ProjectMember } from '../types/project.types'

interface ProjectRow { id: string; name: string; description: string | null; owner_id: string; created_at: string }

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from('projects').select('id,name,description,owner_id,created_at').order('created_at', { ascending: false })
  if (error) throw toError(error)
  const projects = (data ?? []) as ProjectRow[]
  if (!projects.length) return []
  const { data: members } = await supabase.from('project_members').select('project_id').in('project_id', projects.map((project) => project.id))
  const counts = new Map<string, number>()
  for (const member of members ?? []) counts.set(member.project_id, (counts.get(member.project_id) ?? 0) + 1)
  return projects.map((project) => ({ id: project.id, name: project.name, description: project.description ?? '', ownerId: project.owner_id, createdAt: project.created_at, memberCount: counts.get(project.id) ?? 0 }))
}

export async function createProject(userId: string, name: string, description: string): Promise<Project> {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  const { error } = await supabase.from('projects').insert({ id, name: name.trim(), description: description.trim(), owner_id: userId, created_at: createdAt })
  if (error) throw toError(error)
  const { error: memberError } = await supabase.from('project_members').insert({ project_id: id, user_id: userId, added_by: userId })
  if (memberError) throw toError(memberError)
  return { id, name: name.trim(), description: description.trim(), ownerId: userId, createdAt, memberCount: 1 }
}

export async function updateProject(projectId: string, name: string, description: string) {
  const { error } = await supabase.from('projects').update({ name: name.trim(), description: description.trim() }).eq('id', projectId)
  if (error) throw toError(error)
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.rpc('delete_empty_project', { requested_project_id: projectId })
  if (error) throw toError(error)
}

export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase.from('project_members').select('user_id,joined_at').eq('project_id', projectId).order('joined_at')
  if (error) throw toError(error)
  const ids = (data ?? []).map((member) => member.user_id)
  if (!ids.length) return []
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,email,full_name').in('id', ids)
  if (profileError) throw toError(profileError)
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return (data ?? []).map((member) => ({ userId: member.user_id, email: profileMap.get(member.user_id)?.email ?? '', fullName: profileMap.get(member.user_id)?.full_name ?? null, joinedAt: member.joined_at }))
}

export async function getAssignableUsers(projectId: string) {
  const [profilesResult, membersResult] = await Promise.all([
    supabase.from('profiles').select('id,email,full_name,role').neq('role', 'admin').order('email'),
    supabase.from('project_members').select('user_id').eq('project_id', projectId),
  ])
  if (profilesResult.error) throw toError(profilesResult.error)
  const memberIds = new Set((membersResult.data ?? []).map((member) => member.user_id))
  return (profilesResult.data ?? []).filter((profile) => !memberIds.has(profile.id))
}

export async function addMember(projectId: string, userId: string) {
  const { data } = await supabase.auth.getUser()
  const { error } = await supabase.from('project_members').insert({ project_id: projectId, user_id: userId, added_by: data.user?.id })
  if (error) throw toError(error)
}

export async function removeMember(projectId: string, userId: string) {
  const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId)
  if (error) throw toError(error)
}
