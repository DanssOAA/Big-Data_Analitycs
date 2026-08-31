import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY

/**
 * Si faltan las variables de entorno (por ejemplo, un deploy sin
 * configurar en Vercel) NO lanzamos un error a nivel de modulo:
 * eso rompe la carga de toda la aplicacion antes de que React
 * pueda dibujar nada (pantalla en blanco, ni el login se ve).
 *
 * En su lugar dejamos que la app cargue con un cliente "inerte"
 * (URL invalida a proposito) y cada llamada real a Supabase falla
 * de forma controlada, mostrando el error donde ya existe manejo
 * de errores en la UI (login, formularios, etc.).
 */
export const isSupabaseConfigured = Boolean(
  rawUrl && rawAnonKey,
)

if (!isSupabaseConfigured) {
  console.error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'En local: revisa el archivo .env. En Vercel: Settings -> Environment Variables ' +
      '(y vuelve a desplegar despues de guardarlas).',
  )
}

export const supabase = createClient(
  rawUrl || 'https://placeholder.invalid',
  rawAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)
