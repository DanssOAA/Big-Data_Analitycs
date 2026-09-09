import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { sendEmail } from '../_shared/resend.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok',{headers:corsHeaders})
  if (request.method !== 'POST') return json({error:'Método no permitido.'},405)
  try {
    const url=Deno.env.get('SUPABASE_URL')!; const anon=Deno.env.get('SUPABASE_ANON_KEY')!; const token=request.headers.get('Authorization')??''
    const caller=createClient(url,anon,{global:{headers:{Authorization:token}},auth:{persistSession:false}}); const {data:{user}}=await caller.auth.getUser()
    if(!user)return json({error:'No autenticado.'},401)
    const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}}); const {data:profile}=await admin.from('profiles').select('role').eq('id',user.id).single()
    if(profile?.role!=='admin')return json({error:'Acceso denegado.'},403)
    const body=await request.json(); const requestId=String(body.requestId??''); const decision=body.decision as 'approved'|'rejected'; const temporaryPassword=String(body.temporaryPassword??'')
    if(!requestId||!['approved','rejected'].includes(decision)||(decision==='approved'&&temporaryPassword.length<8))return json({error:'Datos de revisión inválidos.'},400)
    const {data:accessRequest}=await admin.from('access_requests').select('*').eq('id',requestId).single()
    if(!accessRequest||accessRequest.status!=='pending')return json({error:'La solicitud ya fue revisada.'},409)
    if(decision==='rejected'){
      const {data:updated,error}=await admin.from('access_requests').update({status:'rejected',reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',requestId).eq('status','pending').select('id').maybeSingle(); if(error||!updated)return json({error:'La solicitud cambió mientras se procesaba.'},409)
      await sendEmail(accessRequest.email,'Solicitud de acceso a Kargia',`<p>Hola ${accessRequest.first_name},</p><p>Tu solicitud de acceso fue rechazada.</p>`).catch(()=>undefined); return json({ok:true})
    }
    const {data:profiles}=await admin.from('profiles').select('id').ilike('email',accessRequest.email).limit(1); if(profiles?.length)return json({error:'El correo ya corresponde a un usuario.'},409)
    const {data:created,error:createError}=await admin.auth.admin.createUser({email:accessRequest.email,password:temporaryPassword,email_confirm:true,user_metadata:{full_name:`${accessRequest.first_name} ${accessRequest.last_name}`,role:'worker'}})
    if(createError||!created.user)return json({error:createError?.message??'No se pudo crear la cuenta.'},400)
    const {error:profileError}=await admin.from('profiles').upsert({id:created.user.id,email:accessRequest.email,full_name:`${accessRequest.first_name} ${accessRequest.last_name}`,role:'worker',must_change_password:true})
    if(profileError){await admin.auth.admin.deleteUser(created.user.id);return json({error:'No se pudo preparar el perfil.'},500)}
    const {data:updated,error:updateError}=await admin.from('access_requests').update({status:'approved',reviewed_by:user.id,reviewed_at:new Date().toISOString(),created_user_id:created.user.id}).eq('id',requestId).eq('status','pending').select('id').maybeSingle()
    if(updateError||!updated){await admin.auth.admin.deleteUser(created.user.id);return json({error:'La solicitud cambió mientras se procesaba.'},409)}
    await sendEmail(accessRequest.email,'Tu solicitud de acceso fue aceptada',`<p>Hola ${accessRequest.first_name},</p><p>Tu solicitud ha sido aceptada.</p><p>Estas son tus credenciales. Por favor, no las compartas.</p><p>Correo: <strong>${accessRequest.email}</strong><br>Contraseña temporal: <strong>${temporaryPassword}</strong></p><p>Al ingresar deberás cambiar tu contraseña.</p><p><a href="${Deno.env.get('APP_URL')??''}/login">Ingresar a Kargia</a></p>`).catch(()=>undefined)
    return json({ok:true})
  } catch { return json({error:'No se pudo revisar la solicitud.'},500) }
})
