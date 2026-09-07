import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, UserMinus, UserPlus, Users, X } from 'lucide-react'
import type { DocProjectMember, DocProjectRole } from '../../services/documentationProjects.service'

interface ProjectMembersModalProps {
  projectName: string
  members: DocProjectMember[]
  isAdmin: boolean
  error?: string
  onClose: () => void
  onInvite: () => void
  onChangeRole: (member: DocProjectMember, role: DocProjectRole) => Promise<void>
  onRemove: (member: DocProjectMember) => Promise<void>
}

export default function ProjectMembersModal({
  projectName, members, isAdmin, error, onClose, onInvite, onChangeRole, onRemove,
}: ProjectMembersModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  const runAction = async (member: DocProjectMember, action: () => Promise<void>) => {
    dialogRef.current?.focus()
    setPendingId(member.user_id)
    setActionError('')
    try {
      await action()
    } catch {
      setActionError('No se pudo guardar el cambio. Inténtalo nuevamente.')
    } finally {
      setPendingId(null)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      if (!pendingId) onClose()
    }
    if (event.key !== 'Tab') return
    if (pendingId) { event.preventDefault(); return }
    const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled), [tabindex="0"]')
    if (!elements?.length) return
    const first = elements[0]
    const last = elements[elements.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={event => { if (event.target === event.currentTarget && !pendingId) onClose() }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-busy={pendingId !== null} aria-labelledby="project-members-title"
        aria-describedby="project-members-description" onKeyDown={handleKeyDown}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[var(--border-soft)] bg-[var(--surface)] shadow-2xl outline-none">
        <header className="relative shrink-0 px-6 pb-5 pt-7 text-center sm:px-8">
          <button ref={closeRef} type="button" onClick={onClose} disabled={pendingId !== null} aria-label="Cerrar miembros"
            className="absolute right-4 top-4 rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50">
            <X size={18} />
          </button>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]"><Users size={23} /></span>
          <h3 id="project-members-title" className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Miembros del proyecto</h3>
          <p id="project-members-description" className="mt-1 break-words text-sm text-[var(--text-muted)]">{projectName}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-left">
            <p className="text-sm font-medium text-[var(--text-secondary)]">{members.length} {members.length === 1 ? 'persona con acceso' : 'personas con acceso'}</p>
            {isAdmin && <button type="button" onClick={onInvite} disabled={pendingId !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50">
              <UserPlus size={16} /> Agregar persona
            </button>}
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto border-t border-[var(--border-soft)] px-6 py-4 sm:px-8">
          {(actionError || error) && <p role="alert" className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-500">{actionError || error}</p>}
          {members.length === 0 ? <div className="py-8 text-center">
            <p className="text-sm font-medium text-[var(--text-secondary)]">Todavía no hay miembros.</p>
            {isAdmin && <p className="mt-1 text-xs text-[var(--text-muted)]">Agrega una persona para compartir este proyecto.</p>}
          </div> : <ul className="space-y-3">
            {members.map(member => {
              const name = member.full_name?.trim() || member.email
              return <li key={member.user_id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] p-3.5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">{name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1 basis-32">
                  <p title={name} className="truncate text-sm font-medium text-[var(--text-primary)]">{name}</p>
                  {member.full_name?.trim() && <p title={member.email} className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{member.email}</p>}
                  {member.area && <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{member.area}</p>}
                </div>
                {isAdmin ? <div className="ml-auto flex items-center gap-2">
                  <select aria-label={`Rol de ${member.email}`} value={member.role} disabled={pendingId !== null}
                    onChange={event => void runAction(member, () => onChangeRole(member, event.target.value as DocProjectRole))}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] focus:outline-[var(--accent)] disabled:opacity-50">
                    <option value="viewer">Lectura</option><option value="editor">Editor</option>
                  </select>
                  <button type="button" onClick={() => void runAction(member, () => onRemove(member))} disabled={pendingId !== null}
                    aria-label={`Quitar a ${member.email}`} title="Quitar del proyecto"
                    className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-500/10 focus-visible:outline-2 focus-visible:outline-rose-500 disabled:opacity-50">
                    {pendingId === member.user_id ? <LoaderCircle size={16} className="animate-spin" /> : <UserMinus size={16} />}
                  </button>
                </div> : <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">{member.role === 'editor' ? 'Editor' : 'Lectura'}</span>}
              </li>
            })}
          </ul>}
        </div>

        <footer className="flex shrink-0 justify-center border-t border-[var(--border-soft)] px-6 py-4">
          <button type="button" onClick={onClose} disabled={pendingId !== null}
            className="min-w-28 rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-elevated)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] disabled:opacity-50">Listo</button>
        </footer>
      </div>
    </div>, document.body,
  )
}
