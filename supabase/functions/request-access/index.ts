import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { sendEmail } from '../_shared/resend.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  try {
    const body = await request.json(); const firstName=String(body.firstName??'').trim(); const lastName=String(body.lastName??'').trim(); const email=String(body.email??'').trim().toLowerCase(); const message=String(body.message??'').trim()||null
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || firstName.length>100 || lastName.length>100 || (message?.length??0)>2000) return json({ error: 'Revisa los datos enviados.' }, 400)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
    const { data: existingProfiles } = await admin.from('profiles').select('id').ilike('email', email).limit(1)
    if (existingProfiles?.length) return json({ error: 'Ese correo ya tiene una cuenta registrada.' }, 409)
    const { data: existingRequest } = await admin.from('access_requests').select('id').eq('status','pending').ilike('email',email).maybeSingle()
    if (existingRequest) return json({ message: 'Tu solicitud ya está pendiente de revisión.' })
    const { error } = await admin.from('access_requests').insert({ first_name:firstName,last_name:lastName,email,message })
    if (error) { if (error.code==='23505') return json({ message:'Tu solicitud ya está pendiente de revisión.' }); throw error }
    const { data: admins } = await admin.from('profiles').select('email').eq('role','admin')
    await Promise.allSettled((admins??[]).map((profile) => sendEmail(profile.email,'Nueva solicitud de acceso a Kargia',`<h2>Nueva solicitud</h2><p><strong>${firstName} ${lastName}</strong> (${email}) solicitó acceso.</p><p>${message??'Sin mensaje.'}</p><p><a href="${Deno.env.get('APP_URL')??''}/admin/solicitudes">Revisar solicitud</a></p>`)))
    return json({ message: 'Solicitud enviada correctamente.' }, 201)
  } catch { return json({ error: 'No se pudo procesar la solicitud.' }, 500) }
})
