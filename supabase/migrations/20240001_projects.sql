-- =============================================================================
-- Migración: Sistema de Proyectos (tipo GitHub repos)
-- Ejecutar en el SQL Editor de Supabase (o con supabase db push)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla de proyectos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Solo pueden VER los proyectos aquellos que sean miembros
CREATE POLICY "Miembros pueden ver su proyecto"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
    )
  );

-- Solo el owner puede actualizar
CREATE POLICY "Owner puede actualizar"
  ON public.projects FOR UPDATE
  USING (owner_id = auth.uid());

-- Solo el owner puede eliminar
CREATE POLICY "Owner puede eliminar"
  ON public.projects FOR DELETE
  USING (owner_id = auth.uid());

-- Cualquier usuario autenticado puede crear proyectos
CREATE POLICY "Usuarios autenticados pueden crear proyectos"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- -----------------------------------------------------------------------------
-- 2. Tabla de miembros
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_members (
  project_id  UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro puede ver la lista de miembros de su proyecto
CREATE POLICY "Miembros pueden ver otros miembros"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm2
      WHERE pm2.project_id = project_members.project_id
        AND pm2.user_id = auth.uid()
    )
  );

-- Solo owner/admin pueden insertar nuevos miembros
CREATE POLICY "Owner y admin insertan miembros"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
    -- Excepción: el owner se inserta a sí mismo al crear el proyecto
    OR auth.uid() = project_members.user_id
  );

-- Solo owner/admin pueden actualizar roles
CREATE POLICY "Owner y admin actualizan roles"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
  );

-- Owner/admin quitan miembros, o el propio usuario se quita
CREATE POLICY "Owner, admin o el propio usuario eliminan membresía"
  ON public.project_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_members.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Tabla de invitaciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_invites (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN ('admin','editor','viewer')),
  invited_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  invited_by   UUID        NOT NULL REFERENCES auth.users(id),
  accepted     BOOLEAN     DEFAULT NULL,  -- NULL=pendiente, true=aceptada, false=rechazada
  UNIQUE (project_id, email)
);

ALTER TABLE public.project_invites ENABLE ROW LEVEL SECURITY;

-- Owner/admin ven todas las invitaciones de su proyecto
CREATE POLICY "Owner y admin ven invitaciones"
  ON public.project_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_invites.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
    -- El invitado ve su propia invitación por email
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Owner/admin crean invitaciones
CREATE POLICY "Owner y admin crean invitaciones"
  ON public.project_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_invites.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
  );

-- Owner/admin cancelan; el invitado acepta/rechaza la suya
CREATE POLICY "Actualizar invitaciones"
  ON public.project_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_invites.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Owner y admin eliminan invitaciones"
  ON public.project_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_invites.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
  );

-- -----------------------------------------------------------------------------
-- 4. Agregar project_id a la tabla datasets existente
-- -----------------------------------------------------------------------------
ALTER TABLE public.datasets
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS datasets_project_id_idx ON public.datasets(project_id);

-- Actualizar RLS de datasets para respetar membresía de proyecto
-- (añadir policy adicional; las existentes se mantienen para el admin global)
CREATE POLICY "Miembros del proyecto ven sus datasets"
  ON public.datasets FOR SELECT
  USING (
    project_id IS NULL  -- datasets sin proyecto: acceso original (admin)
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = datasets.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Solo owner/admin/editor del proyecto pueden insertar datasets
CREATE POLICY "Miembros con rol editor+ insertan datasets"
  ON public.datasets FOR INSERT
  WITH CHECK (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = datasets.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin','editor')
    )
  );

-- Solo owner/admin/editor pueden modificar
CREATE POLICY "Miembros con rol editor+ actualizan datasets"
  ON public.datasets FOR UPDATE
  USING (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = datasets.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin','editor')
    )
  );

-- Solo owner/admin pueden eliminar datasets del proyecto
CREATE POLICY "Owner y admin eliminan datasets"
  ON public.datasets FOR DELETE
  USING (
    project_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = datasets.project_id
        AND pm.user_id = auth.uid()
        AND pm.role IN ('owner','admin')
    )
  );

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
