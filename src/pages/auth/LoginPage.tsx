import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  ShieldCheck,
  X,
} from 'lucide-react'

import { useNavigate } from 'react-router'

import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminAccess, setAdminAccess] = useState(false)
  const [error, setError] = useState('')

  const secretClicks = useRef(0)

  const { login, user } = useAuth()

  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', {
        replace: true,
      })
    }
  }, [user, navigate])

  const handleSecretAccess = () => {
    if (adminAccess) {
      return
    }

    secretClicks.current += 1

    if (secretClicks.current >= 5) {
      secretClicks.current = 0

      setAdminAccess(true)
      setError('')
      setEmail('')
      setPassword('')
    }
  }

  const disableAdminMode = () => {
    setAdminAccess(false)
    setError('')
    setEmail('')
    setPassword('')
    secretClicks.current = 0
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    setError('')

    const result = login(
      email,
      password,
      adminAccess,
    )

    if (!result.success) {
      setError(
        result.message ??
          'No se pudo iniciar sesion.',
      )

      return
    }

    navigate('/app/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <button
            type="button"
            onClick={handleSecretAccess}
            className="select-none text-2xl font-semibold tracking-tight text-[var(--text-primary)]"
          >
            CRM Insights
          </button>

          {adminAccess && (
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
                <ShieldCheck size={14} />

                Modo Administrador

                <button
                  type="button"
                  onClick={disableAdminMode}
                  className="ml-1 rounded-full p-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          className={`rounded-2xl border bg-[var(--surface)] p-6 shadow-sm transition ${
            adminAccess
              ? 'border-[var(--accent)]'
              : 'border-[var(--border)]'
          }`}
        >
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Iniciar sesion
          </h2>

          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {adminAccess
              ? 'Acceso administrativo habilitado.'
              : 'Ingresa tus datos para continuar.'}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Correo
              </span>

              <input
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="correo@empresa.com"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
                Contrasena
              </span>

              <input
                type="password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Contrasena"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
              />
            </label>

            {error && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-500">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
