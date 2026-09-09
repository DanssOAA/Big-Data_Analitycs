import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { createProject as apiCreateProject, deleteProject as apiDeleteProject, getProjects } from '../services/projectStorage.service'
import type { Project } from '../types/project.types'

interface ProjectContextValue {
  projects: Project[]
  activeProject: Project | null
  loading: boolean
  setActiveProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>
  createProject: (name: string, description: string) => Promise<Project>
  deleteProject: (projectId: string) => Promise<void>
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined)
const ACTIVE_PROJECT_KEY = 'kargia_active_project_id'

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project)
    if (project) localStorage.setItem(ACTIVE_PROJECT_KEY, project.id)
    else localStorage.removeItem(ACTIVE_PROJECT_KEY)
  }, [])

  const refreshProjects = useCallback(async () => {
    if (!user) { setProjects([]); setActiveProjectState(null); return }
    setLoading(true)
    try {
      const list = await getProjects()
      setProjects(list)
      const savedId = localStorage.getItem(ACTIVE_PROJECT_KEY)
      const selected = list.find((project) => project.id === savedId) ?? list[0] ?? null
      setActiveProject(selected)
    } finally { setLoading(false) }
  }, [user, setActiveProject])

  useEffect(() => { void refreshProjects() }, [refreshProjects])

  const createProject = useCallback(async (name: string, description: string) => {
    if (!user || user.role !== 'admin') throw new Error('Solo un administrador puede crear proyectos.')
    const project = await apiCreateProject(user.id, name, description)
    await refreshProjects()
    setActiveProject(project)
    return project
  }, [user, refreshProjects, setActiveProject])

  const deleteProject = useCallback(async (projectId: string) => {
    await apiDeleteProject(projectId)
    await refreshProjects()
  }, [refreshProjects])

  const value = useMemo(() => ({ projects, activeProject, loading, setActiveProject, refreshProjects, createProject, deleteProject }), [projects, activeProject, loading, setActiveProject, refreshProjects, createProject, deleteProject])
  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) throw new Error('useProject debe usarse dentro de ProjectProvider')
  return context
}
