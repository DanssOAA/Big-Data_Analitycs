import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  try {
    const password = String((await request.json()).password ?? '')
    if (password.length < 8 || password.length > 128) return json({ error: 'La contraseña debe tener entre 8 y 128 caracteres.' }, 400)
    const url = Deno.env.get('SUPABASE_URL')!; const token = request.headers.get('Authorization') ?? ''
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: token } }, auth: { persistSession: false } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: profile } = await admin.from('profiles').select('must_change_password').eq('id', user.id).single()
    if (!profile?.must_change_password) return json({ error: 'No hay un cambio de contraseña pendiente.' }, 409)
    const { error: passwordError } = await admin.auth.admin.updateUserById(user.id, { password })
    if (passwordError) return json({ error: 'No se pudo actualizar la contraseña.' }, 400)
    const { error: profileError } = await admin.from('profiles').update({ must_change_password: false }).eq('id', user.id).eq('must_change_password', true)
    if (profileError) return json({ error: 'La contraseña cambió, pero no se pudo completar el estado de la cuenta. Contacta a un administrador.' }, 500)
    return json({ ok: true })
  } catch { return json({ error: 'No se pudo completar el cambio de contraseña.' }, 500) }
})
