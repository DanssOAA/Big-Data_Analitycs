import {
  Check,
  Clock,
  FolderOpen,
  FolderPlus,
  Settings,
  Shield,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import CreateProjectModal from '../../components/projects/CreateProjectModal'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import {
  acceptInvite,
  declineInvite,
  getPendingInvitesForEmail,
} from '../../services/projectStorage.service'
import type { ProjectInvite, ProjectRole } from '../../types/project.types'

const roleColors: Record<ProjectRole, string> = {
  owner: 'bg-violet-500/10 text-violet-600',
  admin: 'bg-amber-500/10 text-amber-600',
  editor: 'bg-sky-500/10 text-sky-600',
  viewer: 'bg-slate-500/10 text-slate-500',
}

const roleLabels: Record<ProjectRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const { projects, activeProject, setActiveProject, loading, refreshProjects } = useProject()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [pendingInvites, setPendingInvites] = useState<(ProjectInvite & { projectName?: string })[]>([])
  const [processingInvite, setProcessingInvite] = useState<string | null>(null)

  // Cargar invitaciones pendientes para el email del usuario
  useEffect(() => {
    if (!user?.email) return
    getPendingInvitesForEmail(user.email)
      .then(setPendingInvites)
      .catch(() => undefined)
  }, [user?.email])

  const handleAccept = async (invite: ProjectInvite) => {
    setProcessingInvite(invite.id)
    try {
      await acceptInvite(invite.id, user!.id)
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      await refreshProjects()
    } catch {
      // silencioso, se puede mejorar con toast
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleDecline = async (invite: ProjectInvite) => {
    setProcessingInvite(invite.id)
    try {
      await declineInvite(invite.id)
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
    } finally {
      setProcessingInvite(null)
    }
  }

  const handleOpen = (projectId: string) => {
    const p = projects.find((x) => x.id === projectId)
    if (p) setActiveProject(p)
    void navigate('/admin/insights')
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--accent)]">Colaboración</p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">Proyectos</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Cada proyecto agrupa datasets y tiene su propio equipo de colaboradores, como un repositorio en GitHub.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          <FolderPlus size={16} />
          Nuevo proyecto
        </button>
      </section>

      {/* Invitaciones pendientes */}
      {pendingInvites.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3 dark:border-amber-800">
            <Clock size={15} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Invitaciones pendientes ({pendingInvites.length})
            </p>
          </div>
          <ul className="divide-y divide-amber-100 dark:divide-amber-900">
            {pendingInvites.map((invite) => (
              <li key={invite.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {(invite as ProjectInvite & { projectName?: string }).projectName ?? 'Proyecto'}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    Rol asignado:{' '}
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColors[invite.role]}`}>
                      {roleLabels[invite.role]}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={processingInvite === invite.id}
                    onClick={() => void handleDecline(invite)}
                    className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    <X size={13} /> Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={processingInvite === invite.id}
                    onClick={() => void handleAccept(invite)}
                    className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 hover:opacity-90"
                  >
                    <Check size={13} /> Aceptar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lista de proyectos */}
      <section>
        {loading ? (
          <p className="py-16 text-center text-sm text-[var(--text-muted)]">Cargando proyectos...</p>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-elevated)]">
              <FolderOpen size={26} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Aún no tienes proyectos</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Crea uno nuevo o espera a que alguien te invite.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <FolderPlus size={15} /> Crear primer proyecto
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const isActive = activeProject?.id === project.id
              return (
                <article
                  key={project.id}
                  className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface)] transition hover:border-[var(--border)] ${
                    isActive
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                      : 'border-[var(--border-soft)]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-[var(--accent)]" />
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)]">
                          <FolderOpen size={19} className="text-[var(--text-secondary)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {project.name}
                          </p>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColors[project.myRole]}`}>
                            {roleLabels[project.myRole]}
                          </span>
                        </div>
                      </div>

                      {/* Botón configuración */}
                      {(project.myRole === 'owner' || project.myRole === 'admin') && (
                        <button
                          type="button"
                          title="Configurar proyecto"
                          onClick={() => void navigate(`/app/proyectos/${project.id}/configuracion`)}
                          className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition group-hover:opacity-100 hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
                        >
                          <Settings size={15} />
                        </button>
                      )}
                    </div>

                    {project.description && (
                      <p className="mt-3 line-clamp-2 text-xs text-[var(--text-muted)]">
                        {project.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {project.memberCount} {project.memberCount === 1 ? 'miembro' : 'miembros'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield size={12} />
                        {new Date(project.createdAt).toLocaleDateString('es-PE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-5 py-3">
                    {isActive ? (
                      <span className="text-xs font-semibold text-[var(--accent)]">● Activo</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveProject(project)}
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      >
                        Seleccionar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpen(project.id)}
                      className="text-xs font-semibold text-[var(--accent)] hover:opacity-75"
                    >
                      Abrir →
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            void navigate(`/app/proyectos/${id}/configuracion`)
          }}
        />
      )}
    </div>
  )
}
