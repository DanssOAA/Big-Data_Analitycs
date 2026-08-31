export type DatasetColumnType =
  | 'number'
  | 'date'
  | 'boolean'
  | 'text'
  | 'empty'

export type DatasetCell =
  | string
  | number
  | boolean
  | null

/**
 * Rol semantico opcional de una columna.
 *
 * Es aditivo: si no esta seteado (todo dataset creado antes de
 * esta funcionalidad), el resto del sistema sigue usando la
 * heuristica por `type` que ya existia.
 */
export type DatasetColumnRole =
  | 'product'
  | 'amount'
  | 'date'
  | 'category'
  | null

export interface DatasetColumn {
  key: string
  label: string
  originalLabel: string
  index: number
  type: DatasetColumnType
  visible: boolean
  role?: DatasetColumnRole
}

export interface DatasetRow {
  [key: string]: DatasetCell
}

export interface DatasetTable {
  id: string
  name: string
  columns: DatasetColumn[]
  rows: DatasetRow[]
}

export type DatasetSourceType = 'internal' | 'external'

export interface DatasetRecord {
  id: string
  name: string
  extension: string
  sizeBytes: number
  createdAt: string
  tables: DatasetTable[]
  totalRows: number
  totalColumns: number
  storagePath?: string | null
  sourceType: DatasetSourceType

  /**
   * true si `tables[].rows` no trae todas las filas de la base
   * de datos (se aplica un tope al cargar datasets muy grandes).
   */
  truncated?: boolean
}
