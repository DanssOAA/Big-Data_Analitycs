import {
  ArrowLeft,
  Crown,
  Loader2,
  Mail,
  MailX,
  Settings,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

import InviteMemberModal from '../../components/projects/InviteMemberModal'
import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import {
  cancelInvite,
  getProjectInvites,
  getProjectMembers,
  removeMember,
  updateMemberRole,
  updateProject,
} from '../../services/projectStorage.service'
import type { ProjectInvite, ProjectMember, ProjectRole } from '../../types/project.types'

const roleLabels: Record<ProjectRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
}

const assignableRoles: ProjectRole[] = ['admin', 'editor', 'viewer']

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, can, deleteProject, refreshProjects } = useProject()

  const project = projects.find((p) => p.id === projectId)

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [invites, setInvites] = useState<ProjectInvite[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  const [editName, setEditName] = useState(project?.name ?? '')
  const [editDesc, setEditDesc] = useState(project?.description ?? '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  const [showInvite, setShowInvite] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)

  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const loadData = async () => {
    if (!projectId) return
    setLoadingMembers(true)
    try {
      const [m, i] = await Promise.all([
        getProjectMembers(projectId),
        getProjectInvites(projectId),
      ])
      setMembers(m)
      setInvites(i)
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar campos editables cuando llega el proyecto desde contexto
  useEffect(() => {
    if (project) {
      setEditName(project.name)
      setEditDesc(project.description)
    }
  }, [project])

  if (!project) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">Proyecto no encontrado.</p>
      </div>
    )
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingInfo(true)
    setInfoMsg('')
    try {
      await updateProject(project.id, editName, editDesc)
      await refreshProjects()
      setInfoMsg('Cambios guardados.')
    } catch {
      setInfoMsg('No se pudo guardar.')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleRoleChange = async (userId: string, role: ProjectRole) => {
    setActionBusy(userId)
    try {
      await updateMemberRole(project.id, userId, role)
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)))
    } finally {
      setActionBusy(null)
    }
  }

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!confirm(`¿Quitar a ${member.fullName ?? member.email} del proyecto?`)) return
    setActionBusy(member.userId)
    try {
      await removeMember(project.id, member.userId)
      setMembers((prev) => prev.filter((m) => m.userId !== member.userId))
    } finally {
      setActionBusy(null)
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    setActionBusy(inviteId)
    try {
      await cancelInvite(inviteId)
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } finally {
      setActionBusy(null)
    }
  }

  const handleDeleteProject = async () => {
    setDeletingProject(true)
    try {
      await deleteProject(project.id)
      void navigate('/app/proyectos')
    } finally {
      setDeletingProject(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <section className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void navigate('/app/proyectos')}
          className="rounded-xl border border-[var(--border)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <p className="text-xs text-[var(--text-muted)]">Proyectos / {project.name}</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-xl font-semibold text-[var(--text-primary)]">
            <Settings size={18} className="text-[var(--accent)]" />
            Configuración
          </h2>
        </div>
      </section>

      {/* Información del proyecto */}
      {can.manageMembers && (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border-soft)] px-6 py-4">
            <p className="font-semibold text-[var(--text-primary)]">Información del proyecto</p>
          </div>
          <form onSubmit={(e) => void handleSaveInfo(e)} className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Nombre</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Descripción</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                maxLength={300}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              />
            </div>
            {infoMsg && (
              <p className="text-xs text-[var(--text-muted)]">{infoMsg}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingInfo}
                className="rounded-xl bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white disabled:opacity-60 hover:opacity-90"
              >
                {savingInfo ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Miembros */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-6 py-4">
          <div className="flex items-center gap-2">
            <Users size={17} className="text-[var(--accent)]" />
            <p className="font-semibold text-[var(--text-primary)]">Miembros</p>
          </div>
          {can.manageMembers && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <UserPlus size={13} /> Invitar
            </button>
          )}
        </div>

        {loadingMembers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-soft)]">
            {members.map((member) => {
              const isMe = member.userId === user?.id
              const isOwner = member.role === 'owner'
              return (
                <li key={member.userId} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-elevated)] text-xs font-semibold uppercase text-[var(--text-secondary)]">
                      {(member.fullName ?? member.email).slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {member.fullName ?? member.email}
                        {isMe && <span className="ml-2 text-xs text-[var(--text-muted)]">(tú)</span>}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
                        <Crown size={11} /> Owner
                      </span>
                    ) : can.manageMembers && !isMe ? (
                      <select
                        aria-label={`Rol de ${member.email}`}
                        value={member.role}
                        disabled={actionBusy === member.userId}
                        onChange={(e) => void handleRoleChange(member.userId, e.target.value as ProjectRole)}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                      >
                        {assignableRoles.map((r) => (
                          <option key={r} value={r}>{roleLabels[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        {roleLabels[member.role]}
                      </span>
                    )}

                    {can.manageMembers && !isOwner && !isMe && (
                      <button
                        type="button"
                        title="Quitar miembro"
                        disabled={actionBusy === member.userId}
                        onClick={() => void handleRemoveMember(member)}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"
                      >
                        <UserMinus size={15} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Invitaciones pendientes */}
      {can.manageMembers && invites.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border-soft)] px-6 py-4">
            <Mail size={17} className="text-[var(--accent)]" />
            <p className="font-semibold text-[var(--text-primary)]">
              Invitaciones pendientes ({invites.length})
            </p>
          </div>
          <ul className="divide-y divide-[var(--border-soft)]">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{invite.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Rol: {roleLabels[invite.role]} · Enviada el{' '}
                    {new Date(invite.invitedAt).toLocaleDateString('es-PE', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={actionBusy === invite.id}
                  onClick={() => void handleCancelInvite(invite.id)}
                  title="Cancelar invitación"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-500 disabled:opacity-40"
                >
                  <MailX size={13} /> Cancelar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Zona peligrosa */}
      {can.deleteProject && (
        <section className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/10">
          <div className="flex items-center gap-2 border-b border-rose-200 px-6 py-4 dark:border-rose-800">
            <Trash2 size={16} className="text-rose-500" />
            <p className="font-semibold text-rose-600 dark:text-rose-400">Zona peligrosa</p>
          </div>
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Eliminar proyecto</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Se borrarán todos los datasets, miembros e invitaciones. Esta acción es irreversible.
              </p>
            </div>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="shrink-0 rounded-xl border border-rose-300 px-4 py-2 text-sm text-rose-600 hover:bg-rose-100 dark:border-rose-700 dark:hover:bg-rose-900/30"
              >
                Eliminar proyecto
              </button>
            ) : (
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-xs font-medium text-rose-600">¿Estás seguro? Esta acción no se puede deshacer.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={deletingProject}
                    onClick={() => void handleDeleteProject()}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 hover:bg-rose-700"
                  >
                    {deletingProject ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Modal invitar */}
      {showInvite && (
        <InviteMemberModal
          projectId={project.id}
          projectName={project.name}
          onClose={() => setShowInvite(false)}
          onInvited={() => void loadData()}
        />
      )}
    </div>
  )
}
