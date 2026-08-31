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
import SalesPage from '../pages/crm/SalesPage'

import DashboardPage from '../pages/dashboard/DashboardPage'

import DatasetDetailPage from '../pages/insights/DatasetDetailPage'
import InsightDetailPage from '../pages/insights/InsightDetailPage'
import InsightsExplorerPage from '../pages/insights/InsightsExplorerPage'

import WorkerInsightsPage from '../pages/worker/WorkerInsightsPage'

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

function WorkerRoute({
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

  if (user.role !== 'worker') {
    return (
      <Navigate
        to="/admin/insights"
        replace
      />
    )
  }

  return children
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
          element={<DashboardPage />}
        />

        <Route
          path="clientes"
          element={<ClientsPage />}
        />

        <Route
          path="ventas"
          element={<SalesPage />}
        />

        <Route
          path="actividades"
          element={<ActivitiesPage />}
        />

        <Route
          path="insights"
          element={
            <WorkerRoute>
              <WorkerInsightsPage />
            </WorkerRoute>
          }
        />

        <Route
          path="insights/:analysisId"
          element={
            <WorkerRoute>
              <InsightDetailPage />
            </WorkerRoute>
          }
        />
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
