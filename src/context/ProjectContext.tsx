import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from './AuthContext'
import {
  getProjects,
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
} from '../services/projectStorage.service'
import type { Project, ProjectRole } from '../types/project.types'

// ---------------------------------------------------------------------------
// Helpers de permisos por rol
// ---------------------------------------------------------------------------

/** ¿Puede gestionar miembros / invitaciones? */
export function canManageMembers(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'admin'
}

/** ¿Puede subir / editar / borrar datasets dentro del proyecto? */
export function canEditDatasets(role: ProjectRole | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'editor'
}

/** ¿Puede eliminar el proyecto completo? */
export function canDeleteProject(role: ProjectRole | null): boolean {
  return role === 'owner'
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

interface ProjectContextValue {
  /** Proyectos a los que pertenece el usuario */
  projects: Project[]
  /** Proyecto seleccionado actualmente (null = ninguno) */
  activeProject: Project | null
  loading: boolean
  /** Selecciona un proyecto como activo */
  setActiveProject: (project: Project | null) => void
  /** Recarga la lista desde Supabase */
  refreshProjects: () => Promise<void>
  /** Crea un proyecto y lo agrega a la lista */
  createProject: (name: string, description: string) => Promise<Project>
  /** Elimina un proyecto y lo quita de la lista */
  deleteProject: (projectId: string) => Promise<void>
  /** Helpers de permisos para el proyecto activo */
  can: {
    manageMembers: boolean
    editDatasets: boolean
    deleteProject: boolean
  }
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const ACTIVE_PROJECT_KEY = 'kargia_active_project_id'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([])
      setActiveProjectState(null)
      return
    }

    setLoading(true)
    try {
      const list = await getProjects(user.id)
      setProjects(list)

      // Restaurar el proyecto activo desde localStorage
      const savedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
      if (savedId) {
        const found = list.find((p) => p.id === savedId) ?? null
        setActiveProjectState(found)
      } else if (list.length > 0 && activeProject === null) {
        // Auto-seleccionar el primero si no hay nada guardado
        setActiveProjectState(list[0])
        localStorage.setItem(ACTIVE_PROJECT_KEY, list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar proyectos cuando cambia el usuario
  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project)
    if (project) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY)
    }
  }, [])

  const createProject = useCallback(
    async (name: string, description: string): Promise<Project> => {
      if (!user) throw new Error('No autenticado')
      const project = await apiCreateProject(user.id, name, description)
      setProjects((prev) => [project, ...prev])
      setActiveProject(project)
      return project
    },
    [user, setActiveProject],
  )

  const deleteProject = useCallback(
    async (projectId: string): Promise<void> => {
      await apiDeleteProject(projectId)
      setProjects((prev) => prev.filter((p) => p.id !== projectId))
      if (activeProject?.id === projectId) {
        const remaining = projects.filter((p) => p.id !== projectId)
        setActiveProject(remaining[0] ?? null)
      }
    },
    [activeProject, projects, setActiveProject],
  )

  const myRole = activeProject?.myRole ?? null

  const can = useMemo(
    () => ({
      manageMembers: canManageMembers(myRole),
      editDatasets: canEditDatasets(myRole),
      deleteProject: canDeleteProject(myRole),
    }),
    [myRole],
  )

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProject,
      loading,
      setActiveProject,
      refreshProjects,
      createProject,
      deleteProject,
      can,
    }),
    [projects, activeProject, loading, setActiveProject, refreshProjects, createProject, deleteProject, can],
  )

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject debe usarse dentro de ProjectProvider')
  return ctx
}
