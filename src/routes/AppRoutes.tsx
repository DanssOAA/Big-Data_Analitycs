import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../context/AuthContext'
import { useProject } from '../context/ProjectContext'
import AccessRequestsPage from '../pages/admin/AccessRequestsPage'
import AuditPage from '../pages/admin/AuditPage'
import UsersPage from '../pages/admin/UsersPage'
import ChangePasswordPage from '../pages/auth/ChangePasswordPage'
import LoginPage from '../pages/auth/LoginPage'
import ActivitiesPage from '../pages/crm/ActivitiesPage'
import ClientsPage from '../pages/crm/ClientsPage'
import ProductsPage from '../pages/crm/ProductsPage'
import SalesPage from '../pages/crm/SalesPage'
import ShipmentsPage from '../pages/crm/ShipmentsPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import DocumentationPage from '../pages/documentation/DocumentationPage'
import DatasetDetailPage from '../pages/insights/DatasetDetailPage'
import InsightDetailPage from '../pages/insights/InsightDetailPage'
import InsightsExplorerPage from '../pages/insights/InsightsExplorerPage'
import ProjectsPage from '../pages/projects/ProjectsPage'
import ProjectSettingsPage from '../pages/projects/ProjectSettingsPage'
import LandingPage from '../pages/public/LandingPage'
import RequestAccessPage from '../pages/public/RequestAccessPage'
import WorkerInsightsPage from '../pages/worker/WorkerInsightsPage'
import type { AppModule } from '../types/permission.types'

function Loader(){return <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm text-[var(--text-muted)]">Cargando sesión...</div>}
function ProtectedRoute({children}:{children:ReactNode}){const {user,loading}=useAuth();if(loading)return <Loader/>;if(!user)return <Navigate to="/login" replace/>;if(user.mustChangePassword)return <Navigate to="/cambiar-contrasena" replace/>;return children}
function AdminRoute({children}:{children:ReactNode}){const {user,loading}=useAuth();if(loading)return <Loader/>;if(!user)return <Navigate to="/login" replace/>;if(user.mustChangePassword)return <Navigate to="/cambiar-contrasena" replace/>;return user.role==='admin'?children:<Navigate to="/app/dashboard" replace/>}
function PermissionRoute({children,module}:{children:ReactNode;module:AppModule}){const {can}=useAuth();return can(module)?children:<Navigate to="/app/sin-acceso" replace/>}
function ProjectRoute({children}:{children:ReactNode}){const {activeProject,loading}=useProject();if(loading)return <p>Cargando proyectos...</p>;return activeProject?children:<NoProjectPage/>}
function NoProjectPage(){const {user}=useAuth();return <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-10 text-center"><h2 className="text-xl font-semibold">Aún no tienes un proyecto asignado.</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{user?.role==='admin'?'Crea un proyecto desde Administración → Proyectos.':'Contacta con un administrador para que te agregue a un equipo.'}</p></div>}
function NoAccessPage(){return <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-10 text-center"><h2 className="text-xl font-semibold">Sin acceso</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Tu administrador no te ha dado permiso para consultar este módulo.</p></div>}
function Root(){const {user,loading}=useAuth();if(loading)return <Loader/>;return user?<Navigate to={user.mustChangePassword?'/cambiar-contrasena':'/app/dashboard'} replace/>:<LandingPage/>}

const scoped=(module:AppModule,node:ReactNode)=><ProjectRoute><PermissionRoute module={module}>{node}</PermissionRoute></ProjectRoute>
export default function AppRoutes(){return <Routes>
  <Route path="/" element={<Root/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/solicitar-acceso" element={<RequestAccessPage/>}/><Route path="/cambiar-contrasena" element={<ProtectedPasswordChange/>}/>
  <Route path="/app" element={<ProtectedRoute><AppLayout/></ProtectedRoute>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={scoped('dashboard',<DashboardPage/>)} /><Route path="clientes" element={scoped('clients',<ClientsPage/>)} /><Route path="ventas" element={scoped('sales',<SalesPage/>)} /><Route path="productos" element={scoped('products',<ProductsPage/>)} /><Route path="envios" element={scoped('shipments',<ShipmentsPage/>)} /><Route path="actividades" element={scoped('activities',<ActivitiesPage/>)} /><Route path="documentacion" element={scoped('documentation',<DocumentationPage/>)} /><Route path="datasets" element={scoped('datasets',<InsightsExplorerPage/>)} /><Route path="datasets/:datasetId" element={scoped('datasets',<DatasetDetailPage/>)} /><Route path="insights" element={scoped('insights',<WorkerInsightsPage/>)} /><Route path="insights/:analysisId" element={scoped('insights',<InsightDetailPage/>)} /><Route path="sin-acceso" element={<NoAccessPage/>}/></Route>
  <Route path="/admin" element={<AdminRoute><AppLayout/></AdminRoute>}><Route index element={<Navigate to="proyectos" replace/>}/><Route path="proyectos" element={<ProjectsPage/>}/><Route path="proyectos/:projectId" element={<ProjectSettingsPage/>}/><Route path="solicitudes" element={<AccessRequestsPage/>}/><Route path="usuarios" element={<UsersPage/>}/><Route path="auditoria" element={<AuditPage/>}/></Route>
  <Route path="*" element={<Root/>}/>
 </Routes>}
function ProtectedPasswordChange(){const {user,loading}=useAuth();if(loading)return <Loader/>;if(!user)return <Navigate to="/login" replace/>;if(!user.mustChangePassword)return <Navigate to="/app/dashboard" replace/>;return <ChangePasswordPage/>}
