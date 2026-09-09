import { toError } from './errors'

import { supabase } from './supabaseClient'

/**
 * Borra TODOS los datos de producción de la aplicación (clientes,
 * ventas, actividades, productos, envios, datasets, insights) y
 * los archivos del bucket de Storage.
 *
 * No toca `auth.users` ni `profiles`: las cuentas de acceso nunca
 * se eliminan con esta accion.
 *
 * Es irreversible. Debe llamarse solo despues de una confirmacion
 * explicita en la UI (ver DangerZoneMenu).
 */
export async function resetProjectData(projectId: string): Promise<void> {
  const { data: datasetRows } = await supabase
    .from('datasets')
    .select('storage_path').eq('project_id', projectId)

  const storagePaths = (
    (datasetRows ?? []) as {
      storage_path: string | null
    }[]
  )
    .map((row) => row.storage_path)
    .filter(
      (path): path is string =>
        Boolean(path),
    )

  const { error } = await supabase.rpc('delete_project_data', { requested_project_id: projectId })
  if (error) throw toError(error)

  if (storagePaths.length > 0) {
    await supabase.storage
      .from('datasets')
      .remove(storagePaths)
      .catch(() => undefined)
  }
}
