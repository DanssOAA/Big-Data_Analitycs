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

export interface DatasetColumn {
  key: string
  label: string
  originalLabel: string
  index: number
  type: DatasetColumnType
  visible: boolean
}

export interface DatasetRow {
  [key: string]: DatasetCell
}

export interface DatasetTable {
  id: string
  name: string
  columns: DatasetColumn[]
  rows: DatasetRow[]
  totalRows?: number
}

export interface DatasetRecord {
  id: string
  name: string
  extension: string
  sizeBytes: number
  createdAt: string
  tables: DatasetTable[]
  totalRows: number
  totalColumns: number
}
