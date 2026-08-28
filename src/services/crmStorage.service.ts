import {
  DB_STORES,
  openDatabase,
} from './database.service'

import type {
  CrmClient,
  CrmSale,
} from '../types/crm.types'

export async function getClients(): Promise<CrmClient[]> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.clients,
      'readonly',
    )

    const request = transaction
      .objectStore(DB_STORES.clients)
      .getAll()

    request.onsuccess = () => {
      database.close()

      const clients = (
        request.result as CrmClient[]
      ).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )

      resolve(clients)
    }

    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function saveClient(
  client: CrmClient,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.clients,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.clients)
      .put(client)

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

export async function deleteClient(
  clientId: string,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.clients,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.clients)
      .delete(clientId)

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

export async function getSales(): Promise<CrmSale[]> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.sales,
      'readonly',
    )

    const request = transaction
      .objectStore(DB_STORES.sales)
      .getAll()

    request.onsuccess = () => {
      database.close()

      const sales = (
        request.result as CrmSale[]
      ).sort((a, b) => {
        const dateComparison =
          new Date(b.date).getTime() -
          new Date(a.date).getTime()

        if (dateComparison !== 0) {
          return dateComparison
        }

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        )
      })

      resolve(sales)
    }

    request.onerror = () => {
      database.close()
      reject(request.error)
    }
  })
}

export async function saveSale(
  sale: CrmSale,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.sales,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.sales)
      .put(sale)

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

export async function deleteSale(
  saleId: string,
): Promise<void> {
  const database = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DB_STORES.sales,
      'readwrite',
    )

    transaction
      .objectStore(DB_STORES.sales)
      .delete(saleId)

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
