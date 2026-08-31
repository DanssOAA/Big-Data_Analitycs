export type ClientStatus =
  | 'Activo'
  | 'Prospecto'
  | 'Inactivo'

export type SaleStatus =
  | 'Completada'
  | 'Pendiente'
  | 'Cancelada'

export interface CrmClient {
  id: string
  code: string
  name: string
  company: string
  email: string
  phone: string
  status: ClientStatus
  createdAt: string
}

export interface CrmSale {
  id: string
  code: string
  clientId: string
  product: string
  quantity: number
  unitPrice: number
  amount: number
  date: string
  status: SaleStatus
  createdAt: string
}

export interface CrmActivity {
  id: string
  clientId: string | null
  type: string
  description: string
  activityDate: string
  createdAt: string
}
