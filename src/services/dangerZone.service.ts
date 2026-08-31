import { toError } from './errors'

import { supabase } from './supabaseClient'

const STORAGE_BUCKET = 'datasets'

/**
 * Orden de borrado: primero las tablas que dependen de otras
 * (por client_id / dataset_id), al final las tablas base. Se borra
 * de forma explicita en vez de confiar en ON DELETE CASCADE porque
 * no todas las FK originales del proyecto lo tienen configurado.
 */
const TABLES_IN_DELETE_ORDER = [
  'insights',
  'dataset_rows',
  'dataset_tables',
  'datasets',
  'shipments',
  'activities',
  'sales',
  'clients',
  'products',
] as const

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
export async function resetAllProductionData(): Promise<void> {
  const { data: datasetRows } = await supabase
    .from('datasets')
    .select('storage_path')

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

  for (const table of TABLES_IN_DELETE_ORDER) {
    const { error } = await supabase
      .from(table)
      // Coincide con cualquier fila: todas tienen `id` no nulo.
      .delete()
      .not('id', 'is', null)

    if (error) {
      throw toError(error)
    }
  }

  if (storagePaths.length > 0) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths)
      .catch(() => undefined)
  }
}
