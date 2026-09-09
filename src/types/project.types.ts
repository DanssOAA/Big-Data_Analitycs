/** La membresía no tiene roles internos; las capacidades vienen del perfil y user_permissions. */
export interface ProjectMember {
  userId: string
  email: string
  fullName: string | null
  joinedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: string
  memberCount: number
}
