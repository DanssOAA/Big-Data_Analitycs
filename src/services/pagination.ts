import { toError } from './errors'

/**
 * Supabase/PostgREST limita cada consulta a 1000 filas por
 * defecto, sin importar cuantas existan realmente. Cualquier
 * `select('*')` sin `.range()` se corta silenciosamente en la
 * fila 1000 (sin error, sin aviso).
 *
 * Este helper repite la consulta con `.range()` hasta traer todas
 * las filas.
 */
export async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null
    error: unknown
  }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = []

  for (
    let start = 0;
    ;
    start += pageSize
  ) {
    const { data, error } =
      await fetchPage(
        start,
        start + pageSize - 1,
      )

    if (error) {
      throw toError(error)
    }

    const page = data ?? []

    rows.push(...page)

    if (page.length < pageSize) {
      break
    }
  }

  return rows
}
