import type { LucideIcon } from 'lucide-react'

import {
  Activity,
  BarChart3,
  Database,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  Wand2,
  X,
} from 'lucide-react'

import { NavLink } from 'react-router'

import { useAuth } from '../../context/AuthContext'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  label: string
  path: string
  icon: LucideIcon
  end?: boolean
}

const crmItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Clientes',
    path: '/app/clientes',
    icon: Users,
  },
  {
    label: 'Ventas',
    path: '/app/ventas',
    icon: ShoppingBag,
  },
  {
    label: 'Productos',
    path: '/app/productos',
    icon: Package,
  },
  {
    label: 'Envios',
    path: '/app/envios',
    icon: Truck,
  },
  {
    label: 'Actividades',
    path: '/app/actividades',
    icon: Activity,
  },
]

const adminItems: MenuItem[] = [
  {
    label: 'Datasets',
    path: '/admin/insights',
    icon: Database,
  },
]

const workerItems: MenuItem[] = [
  {
    label: 'Insights',
    path: '/app/insights',
    icon: Sparkles,
    end: true,
  },
  {
    label: 'Generar analisis',
    path: '/app/insights/nuevo',
    icon: Wand2,
  },
]

function MenuLink({
  item,
  onClick,
}: {
  item: MenuItem
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={1.8}
            className={
              isActive
                ? 'text-[var(--accent)]'
                : 'text-[var(--text-muted)]'
            }
          />

          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const { isAdmin } = useAuth()

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border-soft)] bg-[var(--sidebar)] transition-transform duration-300 ${
          open
            ? 'translate-x-0'
            : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-[var(--border-soft)] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <BarChart3 size={19} />
            </div>

            <span className="font-semibold tracking-tight text-[var(--text-primary)]">
              Kargia
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            CRM
          </p>

          <div className="space-y-1">
            {crmItems.map((item) => (
              <MenuLink
                key={item.path}
                item={item}
                onClick={onClose}
              />
            ))}
          </div>

          <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {isAdmin ? 'Datos' : 'Analisis'}
          </p>

          <div className="space-y-1">
            {(isAdmin ? adminItems : workerItems).map((item) => (
              <MenuLink
                key={item.path}
                item={item}
                onClick={onClose}
              />
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
