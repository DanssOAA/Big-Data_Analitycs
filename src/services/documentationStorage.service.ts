import { supabase } from './supabaseClient'

export interface DocumentRecord {
  id: string
  name: string
  description: string | null
  file_path: string
  file_size: number
  created_at: string
  created_by: string
  project_id: string
}

export interface DocumentAnalysis {
  id: string
  document_id: string
  project_id: string
  status: 'processing' | 'completed' | 'failed'
  summary: string | null
  keywords: string[]
  key_points: string[]
  risks: string[]
  recommendations: string[]
  conclusion: string | null
  error_message: string | null
  analyzed_at: string | null
  updated_at: string
}

export async function getDocuments(projectId: string) {
  const { data, error } = await supabase.from('documents').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DocumentRecord[]
}

export async function getDocumentAnalyses(projectId: string) {
  const { data, error } = await supabase.from('document_analyses').select('*').eq('project_id', projectId)
  if (error) throw error
  return (data ?? []) as DocumentAnalysis[]
}

export async function analyzeDocument(documentId: string) {
  const { data, error } = await supabase.functions.invoke<{
    analysis?: DocumentAnalysis
    error?: string
  }>('analyze-document', { body: { documentId } })

  if (error || !data?.analysis) {
    throw new Error(data?.error ?? 'No se pudo analizar el documento.')
  }
  return data.analysis
}

export async function uploadDocument(projectId: string, file: File, description: string) {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('La sesión no es válida.')
  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${projectId}/${id}/${safeName}`
  const { error: uploadError } = await supabase.storage.from('documentation').upload(path, file, { contentType: 'application/pdf' })
  if (uploadError) throw uploadError
  const { data, error } = await supabase.from('documents').insert({
    id, project_id: projectId, name: file.name, description: description.trim() || null,
    file_path: path, file_size: file.size, created_by: session.user.id,
  }).select('*').single()
  if (error) {
    await supabase.storage.from('documentation').remove([path])
    throw error
  }
  return data as DocumentRecord
}

export async function getDocumentUrl(document: DocumentRecord) {
  const { data, error } = await supabase.storage.from('documentation').createSignedUrl(document.file_path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function updateDocument(projectId: string, id: string, name: string, description: string) {
  const { data, error } = await supabase.from('documents').update({
    name: name.trim(), description: description.trim() || null,
  }).eq('id', id).eq('project_id', projectId).select('*').single()
  if (error) throw error
  return data as DocumentRecord
}

export async function deleteDocument(projectId: string, document: DocumentRecord) {
  const { error } = await supabase.from('documents').delete().eq('id', document.id).eq('project_id', projectId)
  if (error) throw error
  await supabase.storage.from('documentation').remove([document.file_path])
}
