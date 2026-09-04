export type UserRole = 'admin' | 'analyst' | 'worker'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}
