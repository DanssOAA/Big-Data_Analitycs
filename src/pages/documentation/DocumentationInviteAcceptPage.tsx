import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CheckCircle2, FolderKanban, XCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { acceptInvite, getInvite, type DocProjectInvite } from '../../services/documentationProjects.service'

type Status = 'loading' | 'ready' | 'wrong-account' | 'already' | 'accepted' | 'error'

export default function DocumentationInviteAcceptPage() {
  const { inviteId = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<DocProjectInvite | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getInvite(inviteId)
      .then((data) => {
        if (!data) {
          setStatus('error')
          setError('No se encontró la invitación. Puede que ya no exista o el link esté incompleto.')
          return
        }
        setInvite(data)
        if (data.accepted_at) {
          setStatus('already')
          return
        }
        if (user && data.email.toLowerCase() !== user.email.toLowerCase()) {
          setStatus('wrong-account')
          return
        }
        setStatus('ready')
      })
      .catch(() => {
        setStatus('error')
        setError('No se pudo cargar la invitación.')
      })
  }, [inviteId, user])

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      await acceptInvite(inviteId)
      setStatus('accepted')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo aceptar la invitación.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <FolderKanban size={26} />
        </div>

        {status === 'loading' && <p className="mt-5 text-sm text-[var(--text-muted)]">Cargando invitación...</p>}

        {status === 'ready' && invite && (
          <>
            <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">Invitación a &quot;{invite.project_name}&quot;</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Te invitaron como <strong>{invite.role === 'editor' ? 'editor' : 'solo lectura'}</strong> a este proyecto de documentación.
            </p>
            {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void accept()}
              className="mt-6 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Aceptando...' : 'Aceptar invitación'}
            </button>
          </>
        )}

        {status === 'wrong-account' && invite && (
          <>
            <h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">Esta invitación no es para tu cuenta</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Fue enviada a <strong>{invite.email}</strong>. Cierra sesión e inicia con ese correo para poder aceptarla.
            </p>
          </>
        )}

        {status === 'already' && (
          <>
            <CheckCircle2 className="mx-auto mt-3 text-emerald-500" size={32} />
            <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">Esta invitación ya fue aceptada</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">Ya deberías ver el proyecto en tu lista de Documentación.</p>
          </>
        )}

        {status === 'accepted' && (
          <>
            <CheckCircle2 className="mx-auto mt-3 text-emerald-500" size={32} />
            <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">¡Listo! Ya formas parte del proyecto</h2>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto mt-3 text-rose-500" size={32} />
            <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">No se pudo abrir la invitación</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{error}</p>
          </>
        )}

        {(status === 'accepted' || status === 'already') && (
          <button
            type="button"
            onClick={() => navigate('/app/documentacion')}
            className="mt-6 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)]"
          >
            Ir a Documentación
          </button>
        )}
      </div>
    </div>
  )
}
