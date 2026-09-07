import { useEffect, useState, type FormEvent } from 'react'
import { FolderKanban, Plus, Users, X } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { createProject, listProjects, type DocumentationProject } from '../../services/documentationProjects.service'

export default function DocumentationProjectsPanel() {
  const { can } = useAuth()
  const [projects, setProjects] = useState<DocumentationProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    void listProjects()
      .then(setProjects)
      .catch(() => setError('No se pudieron cargar los proyectos.'))
      .finally(() => setLoading(false))
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const created = await createProject(name, description)
      setProjects((current) => [
        { ...created, myRole: 'editor', memberCount: 1, milestoneCount: 0, doneCount: 0 },
        ...current,
      ])
      setShowCreate(false)
      setName('')
      setDescription('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear el proyecto.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-[var(--text-secondary)]">Agrupa avances y documentos por proyecto, con historial de versiones.</p>
        {can('doc_projects', 'create') && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={17} /> Nuevo proyecto
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

      {loading ? (
        <p className="p-10 text-center text-sm text-[var(--text-muted)]">Cargando proyectos...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-12 text-center">
          <FolderKanban className="mx-auto text-[var(--text-muted)]" size={38} />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">Todavía no tienes proyectos de documentación.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const progress = project.milestoneCount ? Math.round(((project.doneCount ?? 0) / project.milestoneCount) * 100) : 0
            return (
              <Link
                key={project.id}
                to={`/app/documentacion/proyectos/${project.id}`}
                className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5 transition hover:border-[var(--accent)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold text-[var(--text-primary)]">{project.name}</h3>
                  {project.myRole && (
                    <span className="shrink-0 rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] font-medium uppercase text-[var(--text-muted)]">
                      {project.myRole === 'editor' ? 'Editor' : 'Lectura'}
                    </span>
                  )}
                </div>
                {project.description && <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{project.description}</p>}
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-elevated)]">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>{project.doneCount ?? 0}/{project.milestoneCount ?? 0} avances</span>
                  <span className="flex items-center gap-1"><Users size={12} />{project.memberCount ?? 0}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={(event) => void submit(event)} className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nuevo proyecto de documentación</h3>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                Nombre
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                Descripción
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </label>
              {error && <p className="text-sm text-rose-500">{error}</p>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                Cancelar
              </button>
              <button disabled={creating} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear proyecto'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
