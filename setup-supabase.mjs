// Script para crear tablas y usuarios en Supabase
// Ejecutar con: node setup-supabase.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.VITE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Usuarios a crear ─────────────────────────────────────────
const USERS = [
  {
    email:    'admin@crminsights.com',
    password: 'Admin2024!',
    metadata: { role: 'admin', full_name: 'Administrador' },
  },
  {
    email:    'trabajador@crminsights.com',
    password: 'Worker2024!',
    metadata: { role: 'worker', full_name: 'Trabajador' },
  },
]

async function createUsers() {
  console.log('\n📋 Creando usuarios...')

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email:            u.email,
      password:         u.password,
      email_confirm:    true,
      user_metadata:    u.metadata,
    })

    if (error) {
      // Si ya existe, no es un error crítico
      if (error.message?.includes('already been registered')) {
        console.log(`  ⚠️  ${u.email} ya existe — omitido`)
      } else {
        console.error(`  ❌ Error creando ${u.email}:`, error.message)
      }
    } else {
      console.log(`  ✅ ${u.email} creado (id: ${data.user?.id})`)
    }
  }
}

await createUsers()

console.log('\n✅ Script finalizado.')
console.log('\n🔑 Credenciales de acceso:')
console.log('   Admin    → admin@crminsights.com     / Admin2024!')
console.log('   Worker   → trabajador@crminsights.com / Worker2024!')
