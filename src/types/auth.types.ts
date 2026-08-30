export type UserRole = 'admin' | 'worker'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}
