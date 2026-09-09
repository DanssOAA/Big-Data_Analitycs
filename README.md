# Kargia

Aplicación React 19 + TypeScript + Vite conectada a Supabase. Kargia organiza CRM, documentación, datasets e insights en **proyectos**: workspaces aislados a los que un administrador asigna usuarios existentes.

## Arquitectura de acceso

El alta desde la aplicación sigue un único flujo: formulario público → `access_requests` → revisión de un administrador → creación de la cuenta worker con contraseña temporal → cambio obligatorio de contraseña. `Usuarios y permisos` solo gestiona cuentas existentes. No se usa OTP y ninguna contraseña temporal se persiste.

Los administradores ven todos los proyectos. Workers y analysts solo ven filas de `project_members`. Toda consulta normal recibe el `activeProject.id`, y RLS vuelve a comprobar membresía y `user_permissions`. Proyectos, Solicitudes y Auditoría son capacidades exclusivas del rol admin.

## Desarrollo

```bash
npm install
npm run dev
npm run build
npm run lint
```

Variables públicas del frontend:

```env
VITE_SUPABASE_URL=https://PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_GEMINI_API_KEY=... # integración actual de IA
```

Nunca añadas `SUPABASE_SERVICE_ROLE_KEY` ni `RESEND_API_KEY` a variables `VITE_*`.

## Despliegue de Supabase y Resend

Aplica las migraciones en orden después de probarlas en staging. La migración de workspaces aborta si no existe un perfil admin y crea `Proyecto General` para el backfill antes de imponer `NOT NULL`.

```bash
supabase link --project-ref PROJECT_REF
supabase db push
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set RESEND_FROM_EMAIL="Kargia <acceso@tu-dominio.com>"
supabase secrets set APP_URL=https://app.tu-dominio.com
supabase functions deploy request-access --no-verify-jwt
supabase functions deploy review-access-request
supabase functions delete create-user
```

Supabase inyecta `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en Edge Functions. `request-access` es pública; `review-access-request` exige JWT y vuelve a comprobar `profiles.role = 'admin'`.

En Resend, verifica el dominio de `RESEND_FROM_EMAIL` y configura SPF/DKIM. Los avisos se envían individualmente a cada admin para no revelar destinatarios.

## Migraciones nuevas

1. `20260909010000_access_requests_and_permissions.sql`: solicitudes, cambio obligatorio y matriz de permisos.
2. `20260909020000_project_workspaces_and_backfill.sql`: membresías simples, Proyecto General, backfill y constraints.
3. `20260909030000_project_rls_and_storage.sql`: helpers RLS, aislamiento de tablas y Storage, Auditoría admin-only.
4. `20260909040000_drop_documentation_projects.sql`: elimina el subsistema antiguo de proyectos de documentación.

No ejecutes una migración destructiva directamente en producción. Revisa primero el proyecto enlazado con `supabase projects list` y valida en staging. La eliminación de proyectos comerciales solo funciona si el proyecto está vacío.
