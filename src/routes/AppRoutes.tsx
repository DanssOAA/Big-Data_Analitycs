import type { ReactNode } from 'react'

import {
  Navigate,
  Route,
  Routes,
} from 'react-router'

import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'

import UsersPage from '../pages/admin/UsersPage'
import LoginPage from '../pages/auth/LoginPage'

import ActivitiesPage from '../pages/crm/ActivitiesPage'
import ClientsPage from '../pages/crm/ClientsPage'
import ProductsPage from '../pages/crm/ProductsPage'
import SalesPage from '../pages/crm/SalesPage'
import ShipmentsPage from '../pages/crm/ShipmentsPage'

import DashboardPage from '../pages/dashboard/DashboardPage'

import DatasetDetailPage from '../pages/insights/DatasetDetailPage'
import InsightDetailPage from '../pages/insights/InsightDetailPage'
import InsightsExplorerPage from '../pages/insights/InsightsExplorerPage'

import WorkerInsightsPage from '../pages/worker/WorkerInsightsPage'
import DocumentationPage from '../pages/documentation/DocumentationPage'
import type { AppModule } from '../types/permission.types'

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <p className="text-sm text-[var(--text-muted)]">
        Cargando sesion...
      </p>
    </div>
  )
}

function ProtectedRoute({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return children
}

function AdminRoute({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  if (user.role !== 'admin') {
    return (
      <Navigate
        to="/app/dashboard"
        replace
      />
    )
  }

  return children
}

function PermissionRoute({ children, module }: { children: ReactNode; module: AppModule }) {
  const { user, loading, can } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!can(module)) return <Navigate to="/app/sin-acceso" replace />
  return children
}

function NoAccessPage() {
  return <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-10 text-center"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Sin acceso</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Tu administrador no te ha dado permiso para consultar este módulo.</p></div>
}

function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return (
    <Navigate
      to="/app/dashboard"
      replace
    />
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<RootRedirect />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="dashboard"
              replace
            />
          }
        />

        <Route
          path="dashboard"
          element={<PermissionRoute module="dashboard"><DashboardPage /></PermissionRoute>}
        />

        <Route
          path="clientes"
          element={<PermissionRoute module="clients"><ClientsPage /></PermissionRoute>}
        />

        <Route
          path="ventas"
          element={<PermissionRoute module="sales"><SalesPage /></PermissionRoute>}
        />

        <Route
          path="productos"
          element={<PermissionRoute module="products"><ProductsPage /></PermissionRoute>}
        />

        <Route
          path="envios"
          element={<PermissionRoute module="shipments"><ShipmentsPage /></PermissionRoute>}
        />

        <Route
          path="actividades"
          element={<PermissionRoute module="activities"><ActivitiesPage /></PermissionRoute>}
        />

        <Route
          path="insights"
          element={
            <PermissionRoute module="insights">
              <WorkerInsightsPage />
            </PermissionRoute>
          }
        />

        <Route
          path="insights/:analysisId"
          element={
            <PermissionRoute module="insights">
              <InsightDetailPage />
            </PermissionRoute>
          }
        />
        <Route path="documentacion" element={<PermissionRoute module="documentation"><DocumentationPage /></PermissionRoute>} />
        <Route path="sin-acceso" element={<NoAccessPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AppLayout />
          </AdminRoute>
        }
      >
        <Route
          index
          element={
            <Navigate
              to="insights"
              replace
            />
          }
        />

        <Route
          path="insights"
          element={
            <InsightsExplorerPage />
          }
        />

        <Route
          path="insights/dataset/:datasetId"
          element={
            <DatasetDetailPage />
          }
        />

        <Route
          path="insights/analisis/:analysisId"
          element={
            <InsightDetailPage />
          }
        />

        <Route
          path="usuarios"
          element={<UsersPage />}
        />
      </Route>

      <Route
        path="*"
        element={<RootRedirect />}
      />
    </Routes>
  )
}
