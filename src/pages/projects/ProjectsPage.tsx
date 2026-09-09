import { FolderOpen, FolderPlus, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import CreateProjectModal from '../../components/projects/CreateProjectModal'
import { useProject } from '../../context/ProjectContext'

export default function ProjectsPage() {
  const { projects, activeProject, setActiveProject, loading } = useProject()
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()
  return <div className="space-y-6">
    <section className="flex items-end justify-between gap-4"><div><p className="text-sm font-medium text-[var(--accent)]">Administración</p><h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Proyectos</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Workspaces aislados para equipos, datos y análisis.</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"><FolderPlus size={16}/>Nuevo proyecto</button></section>
    {loading ? <p className="py-16 text-center text-sm text-[var(--text-muted)]">Cargando proyectos...</p> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map((project) => <article key={project.id} className={`rounded-2xl border bg-[var(--surface)] p-5 ${activeProject?.id === project.id ? 'border-[var(--accent)]' : 'border-[var(--border-soft)]'}`}><div className="flex items-start justify-between"><FolderOpen className="text-[var(--accent)]"/><button aria-label="Configurar proyecto" onClick={() => navigate(`/admin/proyectos/${project.id}`)} className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"><Settings size={16}/></button></div><h3 className="mt-4 font-semibold text-[var(--text-primary)]">{project.name}</h3><p className="mt-2 min-h-10 text-sm text-[var(--text-secondary)]">{project.description || 'Sin descripción'}</p><div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]"><span className="flex items-center gap-1"><Users size={13}/>{project.memberCount}</span><button onClick={() => setActiveProject(project)} className="font-medium text-[var(--accent)]">{activeProject?.id === project.id ? 'Activo' : 'Activar'}</button></div></article>)}</div>}
    {showCreate && <CreateProjectModal
      onClose={() => setShowCreate(false)}
      onCreated={(id) => { setShowCreate(false); navigate(`/admin/proyectos/${id}`) }}
    />}
  </div>
}
