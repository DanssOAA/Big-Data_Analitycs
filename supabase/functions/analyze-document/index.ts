import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash']
const MAX_PDF_BYTES = 20 * 1024 * 1024

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

function extractJson(text: string) {
  const fenced = text.trim().match(/```(?:json)?\s*([\s\S]*?)```/i)
  return JSON.parse(fenced ? fenced[1] : text.trim()) as Record<string, unknown>
}

function stringList(value: unknown, limit = 12) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, limit)
    : []
}

async function callGemini(apiKey: string, body: unknown) {
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (response.ok) return response.json()

      const transient = response.status === 429 || response.status === 503
      console.error('Gemini rechazó el análisis del documento:', response.status, model)
      if (!transient) throw new Error('Gemini no pudo analizar el documento.')
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }
  throw new Error('Gemini no está disponible temporalmente.')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  let analysisId: string | null = null
  let admin: ReturnType<typeof createClient> | null = null

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const token = request.headers.get('Authorization') ?? ''

    if (!geminiKey) return json({ error: 'El análisis de documentos no está configurado.' }, 503)

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: token } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)

    const body = await request.json()
    const documentId = String(body.documentId ?? '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
      return json({ error: 'Documento inválido.' }, 400)
    }

    const { data: document, error: documentError } = await caller
      .from('documents')
      .select('id,project_id,name,file_path,file_size')
      .eq('id', documentId)
      .single()
    if (documentError || !document) return json({ error: 'Documento no encontrado.' }, 404)

    const { data: allowed } = await caller.rpc('has_project_permission', {
      requested_project_id: document.project_id,
      requested_module: 'documentation',
      requested_action: 'update',
    })
    if (!allowed) return json({ error: 'No tienes permiso para analizar este documento.' }, 403)
    if (document.file_size > MAX_PDF_BYTES) return json({ error: 'El PDF excede el límite de 20 MB.' }, 413)

    admin = createClient(url, serviceKey, { auth: { persistSession: false } })
    const { data: analysis, error: analysisError } = await admin
      .from('document_analyses')
      .upsert({
        document_id: document.id,
        project_id: document.project_id,
        status: 'processing',
        error_message: null,
        analyzed_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'document_id' })
      .select('id')
      .single()
    if (analysisError || !analysis) throw analysisError ?? new Error('No se pudo preparar el análisis.')
    analysisId = analysis.id

    const { data: pdf, error: downloadError } = await admin.storage.from('documentation').download(document.file_path)
    if (downloadError || !pdf) throw downloadError ?? new Error('No se pudo descargar el PDF.')
    const bytes = await pdf.arrayBuffer()
    if (bytes.byteLength > MAX_PDF_BYTES) throw new Error('El PDF excede el límite permitido.')

    const prompt = `Analiza este documento empresarial y responde EXCLUSIVAMENTE con JSON válido, sin markdown, usando esta estructura:
{"summary":"resumen ejecutivo claro","keywords":["máximo 8"],"keyPoints":["hallazgos principales"],"risks":["riesgos o alertas; vacío si no hay"],"recommendations":["acciones recomendadas"],"conclusion":"conclusión ejecutiva"}
No inventes datos. Distingue hechos del documento de inferencias. Escribe en español.`

    const payload = await callGemini(geminiKey, {
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'application/pdf', data: toBase64(bytes) } }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    })
    const responseText = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('')
    if (!responseText) throw new Error('Gemini no devolvió contenido analizable.')
    const parsed = extractJson(responseText)

    const completed = {
      status: 'completed',
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      keywords: stringList(parsed.keywords, 8),
      key_points: stringList(parsed.keyPoints),
      risks: stringList(parsed.risks),
      recommendations: stringList(parsed.recommendations),
      conclusion: typeof parsed.conclusion === 'string' ? parsed.conclusion : '',
      error_message: null,
      analyzed_by: user.id,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { data: saved, error: saveError } = await admin.from('document_analyses').update(completed).eq('id', analysisId).select('*').single()
    if (saveError) throw saveError
    return json({ analysis: saved })
  } catch (error) {
    console.error('Falló el análisis de documento:', error instanceof Error ? error.message : 'Error desconocido')
    if (admin && analysisId) {
      await admin.from('document_analyses').update({
        status: 'failed', error_message: 'No se pudo analizar el documento.', updated_at: new Date().toISOString(),
      }).eq('id', analysisId)
    }
    return json({ error: 'No se pudo analizar el documento.' }, 500)
  }
})
