/**
 * Roles dentro de un proyecto (equivalente a GitHub repo roles).
 *
 * owner  – creador del proyecto, permisos totales, puede eliminarlo
 * admin  – puede invitar / quitar miembros y editar datasets
 * editor – puede subir y editar datasets, NO puede gestionar miembros
 * viewer – solo lectura, no puede modificar nada
 */
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
