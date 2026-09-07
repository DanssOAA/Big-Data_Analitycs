/**
 * Roles dentro de un proyecto (equivalente a GitHub repo roles).
 *
 * owner  – creador del proyecto, permisos totales, puede eliminarlo
 * admin  – puede invitar / quitar miembros y editar datasets
 * editor – puede subir y editar datasets, NO puede gestionar miembros
 * viewer – solo lectura, no puede modificar nada
 */
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

export interface ProjectMember {
  userId: string
  email: string
  fullName: string | null
  role: ProjectRole
  joinedAt: string
}

export interface ProjectInvite {
  id: string
  projectId: string
  email: string
  role: ProjectRole
  invitedAt: string
  invitedBy: string
  /** null = pendiente, true = aceptada, false = rechazada */
  accepted: boolean | null
}

export interface Project {
  id: string
  name: string
  description: string
  ownerId: string
  createdAt: string
  /** Rol del usuario autenticado en este proyecto */
  myRole: ProjectRole
  memberCount: number
}
