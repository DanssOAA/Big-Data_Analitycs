import AppRoutes from './routes/AppRoutes'

import { isSupabaseConfigured } from './services/supabaseClient'

export default function App() {
  return (
    <>
      {!isSupabaseConfigured && (
        <div className="fixed inset-x-0 top-0 z-[200] bg-rose-600 px-4 py-2 text-center text-xs font-medium text-white">
          Configuracion incompleta: faltan las variables de entorno de Supabase. El inicio de sesion y los datos no van a funcionar hasta que se configuren.
        </div>
      )}

      <AppRoutes />
    </>
  )
}
