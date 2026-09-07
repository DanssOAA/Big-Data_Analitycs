import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Circle, ClipboardList, Clock, FileText,
  GitCompare, History, Plus, Sparkles, Trash2, Upload, UserMinus, UserPlus, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'
import DoubleConfirmDeleteModal from '../../components/documentation/DoubleConfirmDeleteModal'
import InviteExistingUserModal from '../../components/documentation/InviteExistingUserModal'
import {
  addMember, createMilestone, deleteMilestone, getProject, getVersionUrl, listMembers, listMilestones,
  listVersions, purgeVersion, removeMember, restoreVersion, softDeleteVersion, updateMemberRole,
  updateMilestoneStatus, uploadVersion,
  type DocMilestone, type DocMilestoneVersion, type DocProjectMember, type DocProjectRole,
  type DocumentationProject, type MilestoneStatus,
} from '../../services/documentationProjects.service'

const statusMeta: Record<MilestoneStatus, { label: string; icon: typeof Circle; className: string }> = {
  pendiente: { label: 'Pendiente', icon: Circle, className: 'text-[var(--text-muted)]' },
  en_progreso: { label: 'En progreso', icon: Clock, className: 'text-amber-500' },
  hecho: { label: 'Hecho', icon: CheckCircle2, className: 'text-emerald-500' },
}

const sizeLabel = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

export default function DocumentationProjectDetailPage() {
  const { projectId = '' } = useParams()
  const { user, isAdmin } = useAuth()

  const [project, setProject] = useState<DocumentationProject | null>(null)
  const [members, setMembers] = useState<DocProjectMember[]>([])
  const [milestones, setMilestones] = useState<DocMilestone[]>([])
  const [versionsByMilestone, setVersionsByMilestone] = useState<Record<string, DocMilestoneVersion[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [showNewMilestone, setShowNewMilestone] = useState(false)
  const [milestoneTitle, setMilestoneTitle] = useState('')
  const [milestoneDescription, setMilestoneDescription] = useState('')
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [changeNote, setChangeNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [purgeTarget, setPurgeTarget] = useState<DocMilestoneVersion | null>(null)
  const [openTrash, setOpenTrash] = useState<Record<string, boolean>>({})
  const [trashByMilestone, setTrashByMilestone] = useState<Record<string, DocMilestoneVersion[]>>({})
  const [profilesById, setProfilesById] = useState<Record<string, { full_name: string | null; email: string }>>({})

  const myMembership = members.find((member) => member.user_id === user?.id)
  const canEdit = isAdmin || myMembership?.role === 'editor'

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [projectData, memberData, milestoneData] = await Promise.all([
        getProject(projectId),
        listMembers(projectId),
        listMilestones(projectId),
      ])
      setProject(projectData)
      setMembers(memberData)
      setMilestones(milestoneData)
      const versionEntries = await Promise.all(
        milestoneData.map(async (milestone) => [milestone.id, await listVersions(milestone.id)] as const),
      )
      const versionsMap = Object.fromEntries(versionEntries)
      setVersionsByMilestone(versionsMap)

      // Nombres para el reporte de actividad reciente (autor de cada avance
      // y de cada versión subida).
      const authorIds = new Set<string>()
      milestoneData.forEach((milestone) => authorIds.add(milestone.created_by))
      Object.values(versionsMap).forEach((versions) => versions.forEach((version) => authorIds.add(version.created_by)))
      if (authorIds.size > 0) {
        const { data: authorProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(authorIds))
        setProfilesById(Object.fromEntries((authorProfiles ?? []).map((profile) => [profile.id, profile])))
      }
    } catch {
      setError('No se pudo cargar el proyecto.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const refreshVersions = async (milestoneId: string) => {
    const versions = await listVersions(milestoneId)
    setVersionsByMilestone((current) => ({ ...current, [milestoneId]: versions }))
  }

  const submitMilestone = async () => {
    if (!milestoneTitle.trim()) return
    setBusy(true)
    setError('')
    try {
      const created = await createMilestone(projectId, milestoneTitle, milestoneDescription)
      setMilestones((current) => [...current, created])
      setVersionsByMilestone((current) => ({ ...current, [created.id]: [] }))
      setShowNewMilestone(false)
      setMilestoneTitle('')
      setMilestoneDescription('')
    } catch {
      setError('No se pudo crear el avance.')
    } finally {
      setBusy(false)
    }
  }

  const submitUpload = async () => {
    if (!uploadTarget || !uploadFile) return
    if (uploadFile.type !== 'application/pdf') {
      setError('Selecciona un archivo PDF válido.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const version = await uploadVersion(uploadTarget, projectId, uploadFile, changeNote)
      setVersionsByMilestone((current) => ({ ...current, [uploadTarget]: [version, ...(current[uploadTarget] ?? [])] }))
      const target = uploadTarget
      setUploadTarget(null)
      setUploadFile(null)
      setChangeNote('')
      // La IA analiza el PDF en segundo plano (Edge Function); se refresca
      // una vez pasado un tiempo razonable para mostrar el resumen.
      setTimeout(() => { void refreshVersions(target) }, 6000)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo subir el documento.')
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = async (milestone: DocMilestone, status: MilestoneStatus) => {
    setMilestones((current) => current.map((item) => (item.id === milestone.id ? { ...item, status } : item)))
    try {
      await updateMilestoneStatus(milestone.id, status)
    } catch {
      setError('No se pudo actualizar el estado.')
    }
  }

  const removeMilestone = async (milestone: DocMilestone) => {
    if (!window.confirm(`¿Eliminar el avance "${milestone.title}" y todas sus versiones? Esta acción no se puede deshacer.`)) return
    try {
      await deleteMilestone(milestone.id)
      setMilestones((current) => current.filter((item) => item.id !== milestone.id))
    } catch {
      setError('No se pudo eliminar el avance.')
    }
  }

  const trashVersion = async (milestoneId: string, version: DocMilestoneVersion) => {
    try {
      await softDeleteVersion(version)
      setVersionsByMilestone((current) => ({
        ...current,
        [milestoneId]: (current[milestoneId] ?? []).filter((item) => item.id !== version.id),
      }))
    } catch {
      setError('No se pudo mover la versión a la papelera.')
    }
  }

  const toggleTrash = async (milestoneId: string) => {
    const nextOpen = !openTrash[milestoneId]
    setOpenTrash((current) => ({ ...current, [milestoneId]: nextOpen }))
    if (nextOpen) {
      const all = await listVersions(milestoneId, { includeDeleted: true })
      setTrashByMilestone((current) => ({ ...current, [milestoneId]: all.filter((version) => version.deleted_at) }))
    }
  }

  const restore = async (milestoneId: string, version: DocMilestoneVersion) => {
    try {
      await restoreVersion(version.id)
      setTrashByMilestone((current) => ({
        ...current,
        [milestoneId]: (current[milestoneId] ?? []).filter((item) => item.id !== version.id),
      }))
      await refreshVersions(milestoneId)
    } catch {
      setError('No se pudo restaurar la versión.')
    }
  }

  const confirmPurge = async () => {
    if (!purgeTarget) return
    setBusy(true)
    try {
      await purgeVersion(purgeTarget)
      setTrashByMilestone((current) => ({
        ...current,
        [purgeTarget.milestone_id]: (current[purgeTarget.milestone_id] ?? []).filter((item) => item.id !== purgeTarget.id),
      }))
      setPurgeTarget(null)
    } catch {
      setError('No se pudo eliminar la versión definitivamente.')
    } finally {
      setBusy(false)
    }
  }

  const openFile = async (version: DocMilestoneVersion) => {
    try {
      const url = await getVersionUrl(version)
      window.open(url, '_blank', 'noreferrer')
    } catch {
      setError('No se pudo abrir el documento.')
    }
  }

  const addExistingUser = async (userId: string, role: DocProjectRole) => {
    setBusy(true)
    try {
      await addMember(projectId, userId, role)
      await load()
      setShowInvite(false)
    } catch {
      setError('No se pudo agregar a la persona.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="p-10 text-center text-sm text-[var(--text-muted)]">Cargando proyecto...</p>
  if (!project) return <p className="p-10 text-center text-sm text-[var(--text-muted)]">Proyecto no encontrado.</p>

  // Reporte del proyecto: resumen agregado + actividad reciente combinando
  // las versiones de TODOS los avances (no solo el que esté expandido).
  const doneCount = milestones.filter((milestone) => milestone.status === 'hecho').length
  const totalVersions = Object.values(versionsByMilestone).reduce((sum, versions) => sum + versions.length, 0)
  const milestonesById = Object.fromEntries(milestones.map((milestone) => [milestone.id, milestone]))
  const recentActivity = Object.entries(versionsByMilestone)
    .flatMap(([milestoneId, versions]) => versions.map((version) => ({ ...version, milestoneId })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  return (
    <div className="space-y-6">
      <Link to="/app/documentacion" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft size={16} /> Volver a Documentación
      </Link>

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{project.name}</h2>
          {project.description && <p className="mt-2 text-sm text-[var(--text-secondary)]">{project.description}</p>}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setShowNewMilestone(true)}
            className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={17} /> Nuevo avance
          </button>
        )}
      </section>

      {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">{error}</div>}

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
        <p className="flex items-center gap-2 font-semibold text-[var(--text-primary)]"><ClipboardList size={18} /> Reporte del proyecto</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{doneCount}/{milestones.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Avances completados</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{totalVersions}</p>
            <p className="text-xs text-[var(--text-muted)]">Versiones subidas en total</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{members.length}</p>
            <p className="text-xs text-[var(--text-muted)]">Personas con acceso</p>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Actividad reciente</p>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Todavía no hay actividad.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => {
                const author = profilesById[item.created_by]
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">{author?.full_name ?? author?.email ?? 'Alguien'}</strong>{' '}
                      subió v{item.version_number} de &quot;{milestonesById[item.milestoneId]?.title ?? 'un avance'}&quot;
                    </span>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">{new Date(item.created_at).toLocaleDateString('es-PE')}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[var(--text-primary)]">Miembros</p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
            >
              <UserPlus size={14} /> Agregar
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {members.length === 0 && <p className="text-sm text-[var(--text-muted)]">Sin miembros todavía.</p>}
          {members.map((member) => (
            <span key={member.user_id} className="flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
              {member.full_name ?? member.email}
              {isAdmin ? (
                <>
                  <select
                    aria-label={`Rol de ${member.email}`}
                    value={member.role}
                    onChange={(event) => void updateMemberRole(projectId, member.user_id, event.target.value as DocProjectRole).then(load)}
                    className="rounded border-0 bg-transparent text-xs text-[var(--text-secondary)]"
                  >
                    <option value="viewer">Lectura</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button type="button" onClick={() => void removeMember(projectId, member.user_id).then(load)} aria-label={`Quitar a ${member.email}`}>
                    <UserMinus size={13} className="text-rose-500" />
                  </button>
                </>
              ) : (
                <span>· {member.role === 'editor' ? 'Editor' : 'Lectura'}</span>
              )}
            </span>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {milestones.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-12 text-center">
            <FileText className="mx-auto text-[var(--text-muted)]" size={38} />
            <p className="mt-3 text-sm text-[var(--text-secondary)]">Todavía no hay avances en este proyecto.</p>
          </div>
        ) : (
          milestones.map((milestone) => {
            const StatusIcon = statusMeta[milestone.status].icon
            const versions = versionsByMilestone[milestone.id] ?? []
            const current = versions[0]
            const expanded = expandedMilestone === milestone.id
            return (
              <article key={milestone.id} className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <StatusIcon size={20} className={statusMeta[milestone.status].className} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--text-primary)]">{milestone.title}</p>
                    {milestone.description && <p className="mt-1 text-sm text-[var(--text-secondary)]">{milestone.description}</p>}
                    {current && (
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Versión actual: v{current.version_number} · {new Date(current.created_at).toLocaleDateString('es-PE')}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <select
                      aria-label={`Estado de ${milestone.title}`}
                      value={milestone.status}
                      onChange={(event) => void changeStatus(milestone, event.target.value as MilestoneStatus)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    >
                      {Object.entries(statusMeta).map(([value, meta]) => (
                        <option key={value} value={value}>{meta.label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedMilestone(expanded ? null : milestone.id)}
                    className="rounded-lg border border-[var(--border)] p-2 text-[var(--text-secondary)]"
                    aria-label={expanded ? 'Ocultar historial' : 'Ver historial'}
                  >
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => void removeMilestone(milestone)} className="rounded-lg border border-rose-500/20 p-2 text-rose-500" aria-label="Eliminar avance">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {expanded && (
                  <div className="space-y-4 border-t border-[var(--border-soft)] bg-[var(--surface-elevated)] p-5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setUploadTarget(milestone.id)}
                        className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                      >
                        <Upload size={16} /> Subir nueva versión
                      </button>
                    )}

                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        <History size={14} /> Historial de versiones
                      </p>
                      {versions.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">Todavía no se subió ningún documento.</p>
                      ) : (
                        versions.map((version) => (
                          <div key={version.id} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                  v{version.version_number}
                                  {version.id === versions[0].id && (
                                    <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">ACTUAL</span>
                                  )}
                                </p>
                                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                  {sizeLabel(version.file_size)} · {new Date(version.created_at).toLocaleString('es-PE')}
                                </p>
                                {version.change_note && <p className="mt-1 text-sm text-[var(--text-secondary)]">{version.change_note}</p>}
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={() => void openFile(version)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
                                  Ver PDF
                                </button>
                                {canEdit && (
                                  <button type="button" onClick={() => void trashVersion(milestone.id, version)} className="rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs text-rose-500">
                                    Eliminar
                                  </button>
                                )}
                              </div>
                            </div>
                            {version.ai_summary || (version.ai_keywords && version.ai_keywords.length > 0) || version.ai_diff_summary ? (
                              <div className="mt-3 space-y-2 rounded-lg bg-[var(--accent-soft)] p-3">
                                <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]"><Sparkles size={13} /> Vista previa con IA</p>
                                {version.ai_summary && <p className="text-sm text-[var(--text-primary)]">{version.ai_summary}</p>}
                                {version.ai_keywords && version.ai_keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {version.ai_keywords.map((keyword) => (
                                      <span key={keyword} className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">{keyword}</span>
                                    ))}
                                  </div>
                                )}
                                {version.ai_diff_summary && (
                                  <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--surface)] p-2.5">
                                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent)]"><GitCompare size={12} /> Qué cambió respecto a la anterior</p>
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{version.ai_diff_summary}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="mt-2 text-xs italic text-[var(--text-muted)]">Analizando con IA...</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div>
                      <button type="button" onClick={() => void toggleTrash(milestone.id)} className="text-xs font-medium text-[var(--text-muted)] underline">
                        {openTrash[milestone.id] ? 'Ocultar papelera' : 'Ver papelera'}
                      </button>
                      {openTrash[milestone.id] && (
                        <div className="mt-3 space-y-2">
                          {(trashByMilestone[milestone.id] ?? []).length === 0 ? (
                            <p className="text-sm text-[var(--text-muted)]">La papelera está vacía.</p>
                          ) : (
                            trashByMilestone[milestone.id].map((version) => (
                              <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-sm">
                                <span className="text-[var(--text-secondary)]">
                                  v{version.version_number} · eliminada el {version.deleted_at ? new Date(version.deleted_at).toLocaleDateString('es-PE') : ''}
                                </span>
                                <div className="flex gap-2">
                                  {canEdit && (
                                    <button type="button" onClick={() => void restore(milestone.id, version)} className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                                      Restaurar
                                    </button>
                                  )}
                                  {canEdit && (
                                    <button type="button" onClick={() => setPurgeTarget(version)} className="rounded-lg border border-rose-500/30 px-3 py-1 text-xs text-rose-500">
                                      Eliminar definitivamente
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            )
          })
        )}
      </section>

      {showNewMilestone && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Nuevo avance</h3>
              <button type="button" onClick={() => setShowNewMilestone(false)} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm text-[var(--text-secondary)]">
                Título
                <input
                  value={milestoneTitle}
                  onChange={(event) => setMilestoneTitle(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
                />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                Descripción
                <textarea
                  value={milestoneDescription}
                  onChange={(event) => setMilestoneDescription(event.target.value)}
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowNewMilestone(false)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">Cancelar</button>
              <button disabled={busy} onClick={() => void submitMilestone()} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Creando...' : 'Crear avance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Subir nueva versión</h3>
              <button type="button" onClick={() => { setUploadTarget(null); setUploadFile(null); setChangeNote('') }} aria-label="Cerrar"><X size={20} /></button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                <Upload className="mx-auto text-[var(--accent)]" />
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">{uploadFile?.name ?? 'Seleccionar PDF (máximo 20 MB)'}</span>
                <input className="sr-only" type="file" accept="application/pdf,.pdf" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
              </label>
              <label className="block text-sm text-[var(--text-secondary)]">
                ¿Qué cambió?
                <textarea
                  value={changeNote}
                  onChange={(event) => setChangeNote(event.target.value)}
                  rows={2}
                  placeholder="Ej. Se corrigieron los precios de la sección 2"
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-[var(--text-primary)]"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setUploadTarget(null); setUploadFile(null) }} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)]">Cancelar</button>
              <button disabled={busy || !uploadFile} onClick={() => void submitUpload()} className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInvite && (
        <InviteExistingUserModal
          existingMemberIds={members.map((member) => member.user_id)}
          busy={busy}
          onCancel={() => setShowInvite(false)}
          onAdd={(userId, role) => void addExistingUser(userId, role)}
        />
      )}

      {purgeTarget && (
        <DoubleConfirmDeleteModal
          itemLabel={`versión v${purgeTarget.version_number}`}
          busy={busy}
          onCancel={() => setPurgeTarget(null)}
          onConfirm={() => void confirmPurge()}
        />
      )}
    </div>
  )
}
