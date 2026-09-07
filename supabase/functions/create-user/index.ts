import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type UserRole = 'admin' | 'analyst' | 'worker'

interface CreateUserBody {
  email?: string
  fullName?: string
  password?: string
  role?: UserRole
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'El servidor no está configurado.' }, 500)
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Sesión no válida.' }, 401)

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const token = authorization.slice('Bearer '.length)
  const { data: { user: requestingUser }, error: authError } = await adminClient.auth.getUser(token)

  if (authError || !requestingUser) return json({ error: 'Sesión no válida.' }, 401)

  const { data: requesterProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', requestingUser.id)
    .maybeSingle()

  if (profileError || requesterProfile?.role !== 'admin') {
    return json({ error: 'Solo un administrador puede crear usuarios.' }, 403)
  }

  let body: CreateUserBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Los datos enviados no son válidos.' }, 400)
  }

  const email = body.email?.trim().toLowerCase() ?? ''
  const fullName = body.fullName?.trim() ?? ''
  const password = body.password ?? ''
  const role = body.role

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Ingresa un correo válido.' }, 400)
  if (!fullName) return json({ error: 'Ingresa el nombre del usuario.' }, 400)
  if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres.' }, 400)
  if (!role || !(['admin', 'analyst', 'worker'] as UserRole[]).includes(role)) {
    return json({ error: 'Selecciona un rol válido.' }, 400)
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })

  if (error) {
    const duplicate = error.message.toLowerCase().includes('already')
    return json({ error: duplicate ? 'Ya existe un usuario con ese correo.' : 'No se pudo crear el usuario.' }, 400)
  }

  return json({
    user: { id: data.user.id, email, full_name: fullName, role },
  }, 201)
})
