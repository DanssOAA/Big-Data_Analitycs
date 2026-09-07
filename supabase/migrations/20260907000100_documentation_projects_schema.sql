-- Proyectos de documentación: avances (hitos) con control de versiones tipo
-- GitHub, miembros administrados solo por el admin (sin invitación por
-- email libre) y papelera con doble confirmación para el borrado definitivo.
--
-- Esquema paralelo e independiente del módulo genérico "projects" (usado
-- hoy solo para datasets/insights): aquí las membresías las asigna
-- directamente el administrador eligiendo entre usuarios ya registrados,
-- sin invitación/aceptación.
--
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

create table if not exists public.documentation_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documentation_project_members (
  project_id uuid not null references public.documentation_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  added_by uuid not null references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.documentation_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.documentation_projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'hecho')),
  position int not null default 0,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documentation_milestone_versions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.documentation_milestones(id) on delete cascade,
  version_number int not null,
  file_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  change_note text,
  ai_summary text,
  ai_keywords text[],
  ai_analyzed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references auth.users(id),
  unique (milestone_id, version_number)
);

create index if not exists documentation_milestone_versions_current_idx
  on public.documentation_milestone_versions (milestone_id, version_number desc)
  where deleted_at is null;

alter table public.documentation_projects enable row level security;
alter table public.documentation_project_members enable row level security;
alter table public.documentation_milestones enable row level security;
alter table public.documentation_milestone_versions enable row level security;

-- Mantiene updated_at al día en las dos tablas que lo usan (el resto del
-- proyecto define la columna pero no la actualiza con un trigger; aquí sí).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_updated_at on public.documentation_projects;
create trigger set_updated_at before update on public.documentation_projects
for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.documentation_milestones;
create trigger set_updated_at before update on public.documentation_milestones
for each row execute function public.set_updated_at();

-- Asigna version_number automáticamente (nunca lo manda el cliente) y
-- bloquea la fila del avance mientras calcula el siguiente número, para que
-- dos subidas simultáneas al mismo avance no generen la misma versión.
create or replace function public.assign_documentation_version_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version int;
begin
  perform 1 from public.documentation_milestones where id = new.milestone_id for update;
  select coalesce(max(version_number), 0) + 1 into next_version
    from public.documentation_milestone_versions
    where milestone_id = new.milestone_id;
  new.version_number := next_version;
  return new;
end;
$$;
drop trigger if exists set_documentation_version_number on public.documentation_milestone_versions;
create trigger set_documentation_version_number
  before insert on public.documentation_milestone_versions
  for each row execute function public.assign_documentation_version_number();

-- Función reutilizable de autorización: is_admin() siempre pasa; si no,
-- exige ser miembro del proyecto con al menos el rol pedido ('viewer' lo
-- cumple cualquier miembro, 'editor' solo el rol 'editor'). Se usa tanto en
-- las policies de las 4 tablas como en las de Storage.
create or replace function public.has_doc_project_role(target_project_id uuid, min_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.documentation_project_members m
    where m.project_id = target_project_id
      and m.user_id = (select auth.uid())
      and (min_role = 'viewer' or m.role = 'editor')
  );
$$;
revoke execute on function public.has_doc_project_role(uuid, text) from public, anon;
grant execute on function public.has_doc_project_role(uuid, text) to authenticated, service_role;

-- Único camino para crear un proyecto: inserta el proyecto y agrega a su
-- creador como 'editor' en una sola transacción. Así la policy de insert de
-- documentation_project_members puede quedar exclusiva del administrador
-- (nadie más gestiona membresías) sin bloquear la creación normal.
create or replace function public.create_documentation_project(project_name text, project_description text default '')
returns public.documentation_projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_project public.documentation_projects;
  clean_name text := nullif(trim(project_name), '');
begin
  if not public.has_permission('doc_projects', 'create') then
    raise exception 'No tienes permiso para crear proyectos de documentación.';
  end if;

  if clean_name is null then
    raise exception 'El nombre del proyecto es obligatorio.';
  end if;

  insert into public.documentation_projects (name, description, created_by)
  values (clean_name, nullif(trim(project_description), ''), auth.uid())
  returning * into new_project;

  insert into public.documentation_project_members (project_id, user_id, role, added_by)
  values (new_project.id, auth.uid(), 'editor', auth.uid());

  return new_project;
end;
$$;
revoke execute on function public.create_documentation_project(text, text) from public, anon;
grant execute on function public.create_documentation_project(text, text) to authenticated;

-- documentation_projects: se ve si eres miembro (o admin); se edita
-- (nombre/descripción) si eres 'editor'; solo el administrador borra el
-- proyecto completo. Sin policy de insert: todo pasa por la función.
drop policy if exists "docproj_select_projects" on public.documentation_projects;
drop policy if exists "docproj_update_projects" on public.documentation_projects;
drop policy if exists "docproj_delete_projects" on public.documentation_projects;
create policy "docproj_select_projects" on public.documentation_projects for select to authenticated
  using (public.has_doc_project_role(id, 'viewer'));
create policy "docproj_update_projects" on public.documentation_projects for update to authenticated
  using (public.has_doc_project_role(id, 'editor')) with check (public.has_doc_project_role(id, 'editor'));
create policy "docproj_delete_projects" on public.documentation_projects for delete to authenticated
  using (public.is_admin());

-- documentation_project_members: cualquier miembro del proyecto puede ver
-- la lista completa de miembros; agregar/quitar/cambiar rol es SOLO admin
-- (no delegable a ningún rol de proyecto).
drop policy if exists "docproj_select_members" on public.documentation_project_members;
drop policy if exists "docproj_insert_members" on public.documentation_project_members;
drop policy if exists "docproj_update_members" on public.documentation_project_members;
drop policy if exists "docproj_delete_members" on public.documentation_project_members;
-- OJO: usa has_doc_project_role() (security definer) en vez de comparar
-- esta tabla contra sí misma con un subquery directo -- eso causa
-- "infinite recursion detected in policy" porque Postgres reaplica esta
-- misma policy al evaluar el subquery interno, ya que la tabla tiene RLS.
create policy "docproj_select_members" on public.documentation_project_members for select to authenticated
  using (public.has_doc_project_role(project_id, 'viewer'));
create policy "docproj_insert_members" on public.documentation_project_members for insert to authenticated
  with check (public.is_admin());
create policy "docproj_update_members" on public.documentation_project_members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "docproj_delete_members" on public.documentation_project_members for delete to authenticated
  using (public.is_admin());

-- documentation_milestones: ver con 'viewer', crear/editar/borrar con 'editor'.
drop policy if exists "docproj_select_milestones" on public.documentation_milestones;
drop policy if exists "docproj_insert_milestones" on public.documentation_milestones;
drop policy if exists "docproj_update_milestones" on public.documentation_milestones;
drop policy if exists "docproj_delete_milestones" on public.documentation_milestones;
create policy "docproj_select_milestones" on public.documentation_milestones for select to authenticated
  using (public.has_doc_project_role(project_id, 'viewer'));
create policy "docproj_insert_milestones" on public.documentation_milestones for insert to authenticated
  with check (public.has_doc_project_role(project_id, 'editor') and created_by = (select auth.uid()));
create policy "docproj_update_milestones" on public.documentation_milestones for update to authenticated
  using (public.has_doc_project_role(project_id, 'editor')) with check (public.has_doc_project_role(project_id, 'editor'));
create policy "docproj_delete_milestones" on public.documentation_milestones for delete to authenticated
  using (public.has_doc_project_role(project_id, 'editor'));

-- documentation_milestone_versions: ver con 'viewer'; crear/editar con
-- 'editor'. El DELETE (borrado definitivo) exige ADEMÁS que la versión ya
-- esté en la papelera (deleted_at is not null) — así ni con acceso directo
-- a la API se puede saltar el paso de "eliminar" antes de "eliminar
-- definitivamente". El "eliminar" normal es un UPDATE que solo pone
-- deleted_at/deleted_by.
drop policy if exists "docproj_select_versions" on public.documentation_milestone_versions;
drop policy if exists "docproj_insert_versions" on public.documentation_milestone_versions;
drop policy if exists "docproj_update_versions" on public.documentation_milestone_versions;
drop policy if exists "docproj_delete_versions" on public.documentation_milestone_versions;
create policy "docproj_select_versions" on public.documentation_milestone_versions for select to authenticated
  using (exists (
    select 1 from public.documentation_milestones m
    where m.id = documentation_milestone_versions.milestone_id
      and public.has_doc_project_role(m.project_id, 'viewer')
  ));
create policy "docproj_insert_versions" on public.documentation_milestone_versions for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.documentation_milestones m
      where m.id = documentation_milestone_versions.milestone_id
        and public.has_doc_project_role(m.project_id, 'editor')
    )
  );
create policy "docproj_update_versions" on public.documentation_milestone_versions for update to authenticated
  using (exists (
    select 1 from public.documentation_milestones m
    where m.id = documentation_milestone_versions.milestone_id
      and public.has_doc_project_role(m.project_id, 'editor')
  ))
  with check (exists (
    select 1 from public.documentation_milestones m
    where m.id = documentation_milestone_versions.milestone_id
      and public.has_doc_project_role(m.project_id, 'editor')
  ));
create policy "docproj_delete_versions" on public.documentation_milestone_versions for delete to authenticated
  using (
    deleted_at is not null
    and exists (
      select 1 from public.documentation_milestones m
      where m.id = documentation_milestone_versions.milestone_id
        and public.has_doc_project_role(m.project_id, 'editor')
    )
  );

-- Bucket privado dedicado, separado del bucket "documentation" global.
-- Convención de ruta: {project_id}/{milestone_id}/{version_id}_{nombre},
-- así las policies de storage.objects pueden extraer el project_id con
-- storage.foldername(name) sin necesidad de joins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentation-projects', 'documentation-projects', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "docproj_read_files" on storage.objects;
drop policy if exists "docproj_insert_files" on storage.objects;
drop policy if exists "docproj_delete_files" on storage.objects;
create policy "docproj_read_files" on storage.objects for select to authenticated using (
  bucket_id = 'documentation-projects'
  and public.has_doc_project_role(((storage.foldername(name))[1])::uuid, 'viewer')
);
create policy "docproj_insert_files" on storage.objects for insert to authenticated with check (
  bucket_id = 'documentation-projects'
  and public.has_doc_project_role(((storage.foldername(name))[1])::uuid, 'editor')
);
-- El borrado del archivo físico solo se permite cuando la versión
-- correspondiente ya está en la papelera (deleted_at is not null), en
-- espejo exacto de la policy de DELETE de la tabla.
create policy "docproj_delete_files" on storage.objects for delete to authenticated using (
  bucket_id = 'documentation-projects'
  and public.has_doc_project_role(((storage.foldername(name))[1])::uuid, 'editor')
  and exists (
    select 1 from public.documentation_milestone_versions v
    where v.file_path = name and v.deleted_at is not null
  )
);

commit;
