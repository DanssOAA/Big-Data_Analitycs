import type { LucideIcon } from 'lucide-react'

import {
  Activity,
  BarChart3,
  ClipboardList,
  Database,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Package,
  ScrollText,
  ShoppingBag,
  Sparkles,
  Truck,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router'

import { useAuth } from '../../context/AuthContext'
import { useProject } from '../../context/ProjectContext'
import type { AppModule } from '../../types/permission.types'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

interface MenuItem {
  label: string
  path: string
  icon: LucideIcon
  module?: AppModule
  admin?: boolean
}

interface MenuSection {
  id: string
  label: string
  items: MenuItem[]
  admin?: boolean
}

const sections: MenuSection[] = [
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { label: 'Dashboard', path: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
      { label: 'Clientes', path: '/app/clientes', icon: Users, module: 'clients' },
      { label: 'Ventas', path: '/app/ventas', icon: ShoppingBag, module: 'sales' },
      { label: 'Productos', path: '/app/productos', icon: Package, module: 'products' },
      { label: 'Envíos', path: '/app/envios', icon: Truck, module: 'shipments' },
      { label: 'Actividades', path: '/app/actividades', icon: Activity, module: 'activities' },
    ],
  },
  {
    id: 'files-analysis',
    label: 'Archivos y análisis',
    items: [
      { label: 'Documentación', path: '/app/documentacion', icon: FileText, module: 'documentation' },
      { label: 'Datasets', path: '/app/datasets', icon: Database, module: 'datasets' },
      { label: 'Insights', path: '/app/insights', icon: Sparkles, module: 'insights' },
    ],
  },
  {
    id: 'administration',
    label: 'Administración',
    admin: true,
    items: [
      { label: 'Proyectos', path: '/admin/proyectos', icon: FolderOpen, admin: true },
      { label: 'Solicitudes', path: '/admin/solicitudes', icon: ClipboardList, admin: true },
      { label: 'Usuarios y permisos', path: '/admin/usuarios', icon: UserCog, admin: true },
      { label: 'Auditoría', path: '/admin/auditoria', icon: ScrollText, admin: true },
    ],
  },
]

function MenuLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
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
            className={isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}
          />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin, can } = useAuth()
  const { activeProject } = useProject()

  const visibleSections = sections
    .filter((section) => !section.admin || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.admin ? isAdmin : !item.module || can(item.module),
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-[var(--border-soft)] bg-[var(--sidebar)] transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex h-20 items-center justify-between border-b border-[var(--border-soft)] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
              <BarChart3 size={19} />
            </div>
            <span className="font-semibold tracking-tight text-[var(--text-primary)]">Kargia</span>
          </div>

          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-4 py-5">
          {activeProject && (
            <div className="mb-5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-elevated)] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Proyecto activo
              </p>
              <p className="mt-1 truncate text-xs font-semibold text-[var(--text-primary)]">
                {activeProject.name}
              </p>
            </div>
          )}

          <div className="space-y-7">
            {visibleSections.map((section) => (
              <section key={section.id} aria-labelledby={`sidebar-${section.id}`}>
                <h2
                  id={`sidebar-${section.id}`}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]"
                >
                  {section.label}
                </h2>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <MenuLink key={item.path} item={item} onClick={onClose} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </aside>
    </>
  )
}
