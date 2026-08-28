import {
  DB_STORES,
  openDatabase,
} from './database.service'

import type {
  DatasetRecord,
} from '../types/dataset.types'

function normalizeDataset(
  dataset: DatasetRecord,
): DatasetRecord {
  const tables = dataset.tables.map(
    (table) => ({
      ...table,

      rows: table.rows.map(
        (row) => ({
          ...row,

          __rowId:
            typeof row.__rowId === 'string'
              ? row.__rowId
              : crypto.randomUUID(),
        }),
      ),

      columns: table.columns.map(
        (column, index) => ({
          ...column,

          originalLabel:
            column.originalLabel ??
            column.label,

          label:
            column.label ??
            column.originalLabel,

          visible:
            column.visible ?? true,

          index:
            column.index ?? index,
        }),
      ),
    }),
  )

  return {
    ...dataset,

    tables,

    totalRows: tables.reduce(
      (total, table) =>
        total + table.rows.length,
      0,
    ),

    totalColumns:
      tables.length === 0
        ? 0
        : Math.max(
            ...tables.map(
              (table) =>
                table.columns.length,
            ),
          ),
  }
}

export async function saveDataset(
  dataset: DatasetRecord,
) {
  const database = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.datasets,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.datasets)
      .put(
        normalizeDataset(dataset),
      )

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

export async function getDatasets(): Promise<
  DatasetRecord[]
> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.datasets,
      'readonly',
    )

    const request = transaction
      .objectStore(DB_STORES.datasets)
      .getAll()

    request.onsuccess = () => {
      database.close()

      const datasets = (
        request.result as DatasetRecord[]
      )
        .map(normalizeDataset)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        )

      resolve(datasets)
    }

    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function getDataset(
  id: string,
): Promise<DatasetRecord | undefined> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.datasets,
      'readonly',
    )

    const request = transaction
      .objectStore(DB_STORES.datasets)
      .get(id)

    request.onsuccess = () => {
      database.close()

      if (!request.result) {
        resolve(undefined)
        return
      }

      resolve(
        normalizeDataset(
          request.result as DatasetRecord,
        ),
      )
    }

    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function deleteDataset(
  id: string,
) {
  const database = await openDatabase()

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.datasets,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.datasets)
      .delete(id)

    transaction.oncomplete = () => {
      database.close()
      resolve()
    }

    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}
