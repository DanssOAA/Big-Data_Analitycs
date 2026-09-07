import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_MODEL = 'gemini-3.6-flash'
const BUCKET = 'documentation-projects'

interface AnalyzeBody {
  versionId?: string
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

// Codifica en base64 por bloques: pasar un archivo de hasta 20MB entero a
// String.fromCharCode(...bytes) de una sola vez puede exceder el límite de
// argumentos del motor de JS ("Maximum call stack size exceeded").
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'El servidor no está configurado.' }, 500)
  if (!geminiApiKey) return json({ error: 'Falta configurar el secret GEMINI_API_KEY de esta función.' }, 500)
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sesión no válida.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const token = authorization.slice('Bearer '.length)
  const { data: { user: requestingUser }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !requestingUser) return json({ error: 'Sesión no válida.' }, 401)

  let body: AnalyzeBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Los datos enviados no son válidos.' }, 400)
  }

  const versionId = body.versionId
  if (!versionId) return json({ error: 'Falta el identificador de la versión.' }, 400)

  const { data: version, error: versionError } = await adminClient
    .from('documentation_milestone_versions')
    .select('id, file_path, milestone_id, version_number')
    .eq('id', versionId)
    .maybeSingle()

  if (versionError || !version) return json({ error: 'No se encontró la versión indicada.' }, 404)

  const { data: milestone, error: milestoneError } = await adminClient
    .from('documentation_milestones')
    .select('project_id')
    .eq('id', version.milestone_id)
    .maybeSingle()

  if (milestoneError || !milestone) return json({ error: 'No se encontró el avance asociado.' }, 404)

  const { data: requesterProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', requestingUser.id)
    .maybeSingle()

  const isAdmin = requesterProfile?.role === 'admin'

  if (!isAdmin) {
    const { data: membership } = await adminClient
      .from('documentation_project_members')
      .select('role')
      .eq('project_id', milestone.project_id)
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (!membership) return json({ error: 'No tienes acceso a este proyecto.' }, 403)
  }

  const { data: fileBlob, error: downloadError } = await adminClient.storage
    .from(BUCKET)
    .download(version.file_path)

  if (downloadError || !fileBlob) return json({ error: 'No se pudo leer el archivo PDF.' }, 500)

  const buffer = await fileBlob.arrayBuffer()
  const base64 = toBase64(buffer)

  // Si existe una versión anterior (no eliminada) del mismo avance, se
  // adjunta también para que la IA explique qué cambió entre una y otra —
  // no solo el resumen de la nueva por separado.
  const { data: previousVersion } = await adminClient
    .from('documentation_milestone_versions')
    .select('file_path')
    .eq('milestone_id', version.milestone_id)
    .lt('version_number', version.version_number)
    .is('deleted_at', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  let previousBase64: string | null = null
  if (previousVersion) {
    const { data: previousBlob } = await adminClient.storage.from(BUCKET).download(previousVersion.file_path)
    if (previousBlob) previousBase64 = toBase64(await previousBlob.arrayBuffer())
  }

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
      { inlineData: { mimeType: 'application/pdf', data: base64 } },
    ]
    : [{ inlineData: { mimeType: 'application/pdf', data: base64 } }]

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }, ...documentParts],
        }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '')
    return json({ error: `Gemini respondió con un error (${response.status}). ${errorBody}`.trim() }, 502)
  }

  const payload = await response.json()
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) return json({ error: 'La IA no devolvió contenido para analizar.' }, 502)

  let parsed: { summary?: unknown; keywords?: unknown; diffSummary?: unknown }
  try {
    const fenced = String(text).trim().match(/```(?:json)?\s*([\s\S]*?)```/i)
    parsed = JSON.parse(fenced ? fenced[1] : String(text).trim())
  } catch {
    return json({ error: 'La IA devolvió una respuesta que no se pudo interpretar.' }, 502)
  }

  const summary = typeof parsed.summary === 'string' ? parsed.summary : null
  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.filter((keyword): keyword is string => typeof keyword === 'string').slice(0, 8)
    : []
  const diffSummary = typeof parsed.diffSummary === 'string' ? parsed.diffSummary : null

  const { error: updateError } = await adminClient
    .from('documentation_milestone_versions')
    .update({
      ai_summary: summary,
      ai_keywords: keywords,
      ai_diff_summary: diffSummary,
      ai_analyzed_at: new Date().toISOString(),
    })
    .eq('id', versionId)

  if (updateError) return json({ error: 'No se pudo guardar el análisis.' }, 500)

  return json({ summary, keywords, diffSummary })
})
