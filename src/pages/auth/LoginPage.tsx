import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import {
  BarChart3,
  Lock,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react'

import { useNavigate } from 'react-router'

import LoginShowcase from '../../components/auth/LoginShowcase'

import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminAccess, setAdminAccess] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    setError('')
    setSubmitting(true)

    try {
      const result = await login(
        email,
        password,
      )

      if (!result.success) {
        setError(
          result.message ??
            'No se pudo iniciar sesion.',
        )

        return
      }

      navigate('/app/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <LoginShowcase />

      <div className="flex items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[#4a3aad] px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <button
              type="button"
              onClick={handleSecretAccess}
              className="inline-flex min-h-14 select-none items-center gap-3 rounded-2xl border border-white/80 bg-white px-5 py-3 text-xl font-semibold tracking-tight text-[#4a3aad] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-2xl"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <BarChart3 size={18} />
              </span>

              <span className="text-left">
                <span className="block leading-none">
                  Kargia
                </span>

                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#746b9b]">
                  Portal de acceso
                </span>
              </span>
            </button>

            {adminAccess && (
              <div className="mt-4 flex justify-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
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

          <div className="rounded-3xl bg-white/10 p-7 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <h2 className="text-2xl font-semibold text-white">
              Bienvenido de nuevo
            </h2>

            <p className="mt-1.5 text-sm text-white/70">
              {adminAccess
                ? 'Acceso administrativo habilitado.'
                : 'Ingresa tus credenciales corporativas para continuar.'}
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-3.5"
            >
              <label className="relative block">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
                />

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="Correo"
                  className="w-full rounded-full border border-white/15 bg-white/95 py-3.5 pl-11 pr-4 text-sm text-[#1a1530] outline-none placeholder:text-[#8b87a3] focus:border-white"
                />
              </label>

              <label className="relative block">
                <Lock
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/50"
                />

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Contrasena"
                  className="w-full rounded-full border border-white/15 bg-white/95 py-3.5 pl-11 pr-4 text-sm text-[#1a1530] outline-none placeholder:text-[#8b87a3] focus:border-white"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-rose-300/40 bg-rose-500/20 px-4 py-2.5 text-sm text-white">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[var(--accent)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? 'Ingresando...'
                  : 'Ingresar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
