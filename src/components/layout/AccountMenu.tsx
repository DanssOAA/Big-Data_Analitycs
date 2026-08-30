import {
  LogOut,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import { useNavigate } from 'react-router'

import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function AccountMenu() {
  const [open, setOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  const {
    user,
    isAdmin,
    logout,
  } = useAuth()

  const {
    theme,
    toggleTheme,
  } = useTheme()

  const navigate = useNavigate()

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', closeMenu)

    return () => {
      document.removeEventListener('mousedown', closeMenu)
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        title="Cuenta"
      >
        {isAdmin ? (
          <ShieldCheck
            size={18}
            className="text-[var(--accent)]"
          />
        ) : (
          <UserRound size={18} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="border-b border-[var(--border-soft)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                {isAdmin ? (
                  <ShieldCheck size={18} />
                ) : (
                  <UserRound size={18} />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {user?.name}
                  </p>

                  {isAdmin && (
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[9px] font-semibold text-[var(--accent)]">
                      ADMIN
                    </span>
                  )}
                </div>

                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="mb-1 flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Settings size={13} />
              Configuracion
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <span className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Moon size={17} />
                ) : (
                  <Sun size={17} />
                )}

                Apariencia
              </span>

              <span className="text-xs text-[var(--text-muted)]">
                {theme === 'light' ? 'Claro' : 'Oscuro'}
              </span>
            </button>

            <div className="my-2 border-t border-[var(--border-soft)]" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-rose-500 transition hover:bg-rose-500/10"
            >
              <LogOut size={17} />
              Cerrar sesion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
