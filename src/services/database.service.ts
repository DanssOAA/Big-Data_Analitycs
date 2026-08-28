export const DB_NAME = 'crm-insights-database'

export const DB_VERSION = 2

export const DB_STORES = {
  datasets: 'datasets',
  clients: 'clients',
  sales: 'sales',
} as const

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION,
    )

    request.onupgradeneeded = () => {
      const database = request.result

      if (
        !database.objectStoreNames.contains(
          DB_STORES.datasets,
        )
      ) {
        database.createObjectStore(
          DB_STORES.datasets,
          {
            keyPath: 'id',
          },
        )
      }

      if (
        !database.objectStoreNames.contains(
          DB_STORES.clients,
        )
      ) {
        database.createObjectStore(
          DB_STORES.clients,
          {
            keyPath: 'id',
          },
        )
      }

      if (
        !database.objectStoreNames.contains(
          DB_STORES.sales,
        )
      ) {
        database.createObjectStore(
          DB_STORES.sales,
          {
            keyPath: 'id',
          },
        )
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }

    request.onblocked = () => {
      reject(
        new Error(
          'La base local esta bloqueada por otra pestaña. Cierra las otras pestañas del proyecto y vuelve a intentar.',
        ),
      )
    }
  })
}
