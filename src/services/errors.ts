/**
 * Los errores que devuelve supabase-js (Postgrest, Storage, Auth)
 * son objetos planos `{ message, details, hint, code }`, NO
 * instancias de `Error`. Si se relanzan tal cual (`throw error`),
 * cualquier `catch (exception) { exception instanceof Error ? ... }`
 * en la UI falla en detectarlos y termina mostrando un mensaje
 * generico ("Error desconocido") en vez del motivo real.
 *
 * Esta funcion normaliza cualquier error de Supabase (o cualquier
 * otra cosa) a una instancia real de `Error`, preservando el
 * mensaje original para que la UI pueda mostrarlo.
 */
export function toError(
  error: unknown,
  fallbackMessage = 'Ocurrio un error inesperado.',
): Error {
  if (error instanceof Error) {
    return error
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown })
      .message === 'string'
  ) {
    return new Error(
      (error as { message: string })
        .message,
    )
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  return new Error(fallbackMessage)
}
