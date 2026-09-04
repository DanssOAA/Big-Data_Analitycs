import { supabase } from './supabaseClient'

export interface DocumentRecord {
  id: string
  name: string
  description: string | null
  file_path: string
  file_size: number
  created_at: string
  created_by: string
}

export async function getDocuments() {
  const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as DocumentRecord[]
}

export async function uploadDocument(file: File, description: string) {
  const { data: session } = await supabase.auth.getUser()
  if (!session.user) throw new Error('La sesión no es válida.')
  const id = crypto.randomUUID()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${id}/${safeName}`
  const { error: uploadError } = await supabase.storage.from('documentation').upload(path, file, { contentType: 'application/pdf' })
  if (uploadError) throw uploadError
  const { data, error } = await supabase.from('documents').insert({
    id, name: file.name, description: description.trim() || null,
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

export async function updateDocument(id: string, name: string, description: string) {
  const { data, error } = await supabase.from('documents').update({
    name: name.trim(), description: description.trim() || null,
  }).eq('id', id).select('*').single()
  if (error) throw error
  return data as DocumentRecord
}

export async function deleteDocument(document: DocumentRecord) {
  const { error } = await supabase.from('documents').delete().eq('id', document.id)
  if (error) throw error
  await supabase.storage.from('documentation').remove([document.file_path])
}
