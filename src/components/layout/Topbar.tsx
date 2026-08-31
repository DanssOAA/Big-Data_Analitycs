import {
  Menu,
  ShieldCheck,
} from 'lucide-react'

import { useLocation } from 'react-router'

import { useAuth } from '../../context/AuthContext'

import AccountMenu from './AccountMenu'

interface TopbarProps {
  onOpenSidebar: () => void
}

function resolveTitle(pathname: string) {
  if (pathname.includes('/admin/insights/dataset/')) {
    return 'Dataset'
  }

  if (pathname.includes('/admin/insights')) {
    return 'Datasets'
  }

  if (pathname.includes('/clientes')) {
    return 'Clientes'
  }

  if (pathname.includes('/ventas')) {
    return 'Ventas'
  }

  if (pathname.includes('/actividades')) {
    return 'Actividades'
  }

  if (pathname.includes('/insights')) {
    return 'Insights'
  }

  return 'Dashboard'
}

export default function Topbar({
  onOpenSidebar,
}: TopbarProps) {
  const location = useLocation()

  const { isAdmin } = useAuth()

  const title = resolveTitle(location.pathname)

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--topbar)] px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface)] p-2.5 text-[var(--text-secondary)] lg:hidden"
        >
          <Menu size={19} />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              Kargia
            </p>

            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                <ShieldCheck size={10} />
                Administrador
              </span>
            )}
          </div>

          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h1>
        </div>
      </div>

      <AccountMenu />
    </header>
  )
}
