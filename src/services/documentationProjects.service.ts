import { toError } from './errors'
import { supabase } from './supabaseClient'

export type DocProjectRole = 'editor' | 'viewer'
export type MilestoneStatus = 'pendiente' | 'en_progreso' | 'hecho'

const BUCKET = 'documentation-projects'
// Mismo modelo que usa src/services/aiInsights.service.ts.
const GEMINI_MODEL = 'gemini-3.6-flash'

export interface DocumentationProject {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  myRole?: DocProjectRole
  memberCount?: number
  milestoneCount?: number
  doneCount?: number
}

export interface DocProjectMember {
  project_id: string
  user_id: string
  role: DocProjectRole
  added_by: string
  added_at: string
  email: string
  full_name: string | null
  area: string | null
}

export interface DocMilestone {
  id: string
  project_id: string
  title: string
  description: string | null
  status: MilestoneStatus
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface DocMilestoneVersion {
  id: string
  milestone_id: string
  version_number: number
  file_path: string
  file_size: number
  change_note: string | null
  ai_summary: string | null
  ai_keywords: string[] | null
  ai_diff_summary: string | null
  ai_analyzed_at: string | null
  created_by: string
  created_at: string
  deleted_at: string | null
  deleted_by: string | null
}

export interface DirectoryUser {
  id: string
  email: string
  full_name: string | null
  area: string | null
}

export async function listProjects(): Promise<DocumentationProject[]> {
  const { data: projects, error } = await supabase
    .from('documentation_projects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw toError(error)

  const list = (projects ?? []) as DocumentationProject[]
  if (list.length === 0) return list

  const ids = list.map((project) => project.id)
  const [{ data: session }, membersResult, milestonesResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('documentation_project_members').select('project_id, user_id, role').in('project_id', ids),
    supabase.from('documentation_milestones').select('project_id, status').in('project_id', ids),
  ])
  if (membersResult.error) throw toError(membersResult.error)
  if (milestonesResult.error) throw toError(milestonesResult.error)
  const members = membersResult.data
  const milestones = milestonesResult.data

  return list.map((project) => {
    const projectMembers = (members ?? []).filter((member) => member.project_id === project.id)
    const projectMilestones = (milestones ?? []).filter((milestone) => milestone.project_id === project.id)
    const mine = projectMembers.find((member) => member.user_id === session.user?.id)
    return {
      ...project,
      myRole: mine?.role as DocProjectRole | undefined,
      memberCount: projectMembers.length,
      milestoneCount: projectMilestones.length,
      doneCount: projectMilestones.filter((milestone) => milestone.status === 'hecho').length,
    }
  })
}

export async function getProject(id: string): Promise<DocumentationProject | null> {
  const { data, error } = await supabase.from('documentation_projects').select('*').eq('id', id).maybeSingle()
  if (error) throw toError(error)
  return data as DocumentationProject | null
}

export async function createProject(name: string, description: string): Promise<DocumentationProject> {
  const { data, error } = await supabase.rpc('create_documentation_project', {
    project_name: name,
    project_description: description,
  })
  if (error) throw toError(error)
  return data as DocumentationProject
}

export async function updateProject(id: string, name: string, description: string): Promise<DocumentationProject> {
  const { data, error } = await supabase
    .from('documentation_projects')
    .update({ name: name.trim(), description: description.trim() || null })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw toError(error)
  return data as DocumentationProject
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('documentation_projects').delete().eq('id', id)
  if (error) throw toError(error)
}

export async function listMembers(projectId: string): Promise<DocProjectMember[]> {
  const { data, error } = await supabase
    .from('documentation_project_members')
    .select('*')
    .eq('project_id', projectId)
  if (error) throw toError(error)

  const rows = data ?? []
  if (rows.length === 0) return []

  const ids = rows.map((row) => row.user_id)
  const { data: profiles } = await supabase.from('profiles').select('id, email, full_name, area').in('id', ids)
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  return rows.map((row) => ({
    ...row,
    email: byId.get(row.user_id)?.email ?? '',
    full_name: byId.get(row.user_id)?.full_name ?? null,
    area: byId.get(row.user_id)?.area ?? null,
  })) as DocProjectMember[]
}

export async function listAllUsers(): Promise<DirectoryUser[]> {
  const { data, error } = await supabase.from('profiles').select('id, email, full_name, area').order('email')
  if (error) throw toError(error)
  return (data ?? []) as DirectoryUser[]
}

export async function addMember(projectId: string, userId: string, role: DocProjectRole): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  const { error } = await supabase.from('documentation_project_members').insert({
    project_id: projectId,
    user_id: userId,
    role,
    added_by: session.user?.id,
  })
  if (error) throw toError(error)
}

export async function updateMemberRole(projectId: string, userId: string, role: DocProjectRole): Promise<void> {
  const { error } = await supabase
    .from('documentation_project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw toError(error)
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('documentation_project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw toError(error)
}

export async function listMilestones(projectId: string): Promise<DocMilestone[]> {
  const { data, error } = await supabase
    .from('documentation_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('position')
  if (error) throw toError(error)
  return (data ?? []) as DocMilestone[]
}

export async function createMilestone(projectId: string, title: string, description: string): Promise<DocMilestone> {
  const { data: session } = await supabase.auth.getUser()
  const { data: existing } = await supabase
    .from('documentation_milestones')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('documentation_milestones')
    .insert({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
      created_by: session.user?.id,
      position: nextPosition,
    })
    .select('*')
    .single()
  if (error) throw toError(error)
  return data as DocMilestone
}

export async function updateMilestoneStatus(id: string, status: MilestoneStatus): Promise<void> {
  const { error } = await supabase.from('documentation_milestones').update({ status }).eq('id', id)
  if (error) throw toError(error)
}

export async function deleteMilestone(id: string): Promise<void> {
  // Se limpian los archivos de Storage de TODAS las versiones (incluidas
  // las que ya estaban en la papelera) antes de borrar el avance, porque el
  // ON DELETE CASCADE de la fila no borra los objetos del bucket.
  const { data: versions } = await supabase
    .from('documentation_milestone_versions')
    .select('file_path')
    .eq('milestone_id', id)

  const { error } = await supabase.from('documentation_milestones').delete().eq('id', id)
  if (error) throw toError(error)

  const paths = (versions ?? []).map((version) => version.file_path)
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths).catch(() => undefined)
  }
}

export async function listVersions(
  milestoneId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<DocMilestoneVersion[]> {
  let query = supabase
    .from('documentation_milestone_versions')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('version_number', { ascending: false })
  if (!options.includeDeleted) query = query.is('deleted_at', null)
  const { data, error } = await query
  if (error) throw toError(error)
  return (data ?? []) as DocMilestoneVersion[]
}

export async function uploadVersion(
  milestoneId: string,
  projectId: string,
  file: File,
  changeNote: string,
): Promise<DocMilestoneVersion> {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('La sesión no es válida.')

  const versionId = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${projectId}/${milestoneId}/${versionId}_${safeName}`

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' })
  if (uploadError) throw toError(uploadError)

  const { data, error } = await supabase
    .from('documentation_milestone_versions')
    .insert({
      id: versionId,
      milestone_id: milestoneId,
      file_path: path,
      file_size: file.size,
      change_note: changeNote.trim() || null,
      created_by: session.user.id,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw toError(error)
  }

  // El análisis con IA corre aparte, en el navegador (misma VITE_GEMINI_API_KEY
  // que ya usa el módulo de Insights), y no debe bloquear la subida: si
  // falla (sin key configurada, Gemini caído, etc.) la versión ya quedó
  // guardada igual.
  void analyzeVersionWithAI(data as DocMilestoneVersion).catch(() => undefined)

  return data as DocMilestoneVersion
}

// Codifica en base64 por bloques: convertir un archivo de hasta 20MB entero
// con String.fromCharCode(...bytes) de una sola vez puede exceder el
// límite de argumentos del motor de JS.
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

async function downloadAsBase64(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error || !data) return null
  return toBase64(await data.arrayBuffer())
}

/**
 * Analiza el PDF recién subido con Gemini directamente desde el navegador
 * (igual patrón que aiInsights.service.ts): idea principal + palabras
 * clave, y si existe una versión anterior del mismo avance, además un
 * resumen de qué cambió entre una y otra. Es best-effort: cualquier fallo
 * se ignora en silencio, la versión ya quedó guardada de todos modos.
 */
async function analyzeVersionWithAI(version: DocMilestoneVersion): Promise<void> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) return

  const currentBase64 = await downloadAsBase64(version.file_path)
  if (!currentBase64) return

  const { data: previousVersion } = await supabase
    .from('documentation_milestone_versions')
    .select('file_path')
    .eq('milestone_id', version.milestone_id)
    .lt('version_number', version.version_number)
    .is('deleted_at', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const previousBase64 = previousVersion ? await downloadAsBase64(previousVersion.file_path) : null

  const prompt = previousBase64
    ? `Eres un asistente que resume documentos internos de una empresa. Se te adjuntan DOS versiones del mismo documento: primero la ANTERIOR y después la NUEVA. Responde EXCLUSIVAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "summary": "idea principal de la versión NUEVA en una o dos frases, en español",
  "keywords": ["palabra clave 1", "palabra clave 2"],
  "diffSummary": "qué cambió respecto a la versión anterior, en un párrafo breve y claro para alguien de negocio, en español. Si no hay diferencias relevantes, dilo explícitamente"
}
Máximo 8 palabras clave, en minúsculas.`
    : `Eres un asistente que resume documentos internos de una empresa. Lee el PDF adjunto y responde EXCLUSIVAMENTE con un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "summary": "idea principal del documento en una o dos frases, en español",
  "keywords": ["palabra clave 1", "palabra clave 2"]
}
Máximo 8 palabras clave, en minúsculas.`

  const documentParts = previousBase64
    ? [
      { inlineData: { mimeType: 'application/pdf', data: previousBase64 } },
      { inlineData: { mimeType: 'application/pdf', data: currentBase64 } },
    ]
    : [{ inlineData: { mimeType: 'application/pdf', data: currentBase64 } }]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, ...documentParts] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  )
  if (!response.ok) return

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return

  let parsed: { summary?: unknown; keywords?: unknown; diffSummary?: unknown }
  try {
    const fenced = String(text).trim().match(/```(?:json)?\s*([\s\S]*?)```/i)
    parsed = JSON.parse(fenced ? fenced[1] : String(text).trim())
  } catch {
    return
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : null
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((keyword): keyword is string => typeof keyword === 'string').slice(0, 8)
    : []
  const diffSummary = typeof parsed.diffSummary === 'string' ? parsed.diffSummary : null

  await supabase
    .from('documentation_milestone_versions')
    .update({ ai_summary: summary, ai_keywords: keywords, ai_diff_summary: diffSummary, ai_analyzed_at: new Date().toISOString() })
    .eq('id', version.id)
}

export async function getVersionUrl(version: DocMilestoneVersion): Promise<string> {
  try {
    await supabase.rpc('log_document_view', {
      p_table_name: 'documentation_milestone_versions',
      p_record_id: version.id,
    })
  } catch {
    // El registro de auditoría es best-effort: no debe bloquear la vista previa.
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(version.file_path, 3600)
  if (error) throw toError(error)
  return data.signedUrl
}

export async function softDeleteVersion(version: DocMilestoneVersion): Promise<void> {
  const { data: session } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('documentation_milestone_versions')
    .update({ deleted_at: new Date().toISOString(), deleted_by: session.user?.id })
    .eq('id', version.id)
  if (error) throw toError(error)
}

export async function restoreVersion(versionId: string): Promise<void> {
  const { error } = await supabase
    .from('documentation_milestone_versions')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', versionId)
  if (error) throw toError(error)
}

export async function purgeVersion(version: DocMilestoneVersion): Promise<void> {
  const { error } = await supabase.from('documentation_milestone_versions').delete().eq('id', version.id)
  if (error) throw toError(error)
  await supabase.storage.from(BUCKET).remove([version.file_path])
}
