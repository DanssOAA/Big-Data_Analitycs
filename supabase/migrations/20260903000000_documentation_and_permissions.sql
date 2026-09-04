-- Documentación PDF y autorización configurable por usuario.
-- Aplicar con Supabase CLI o desde SQL Editor antes de desplegar la interfaz.
-- Toda la migración es atómica: ante cualquier error se revierte por completo.

begin;

-- Validación previa, sin modificar datos. Evita aplicar la migración sobre un
-- esquema distinto o bloquear usuarios con roles que esta versión no conoce.
do $$
declare
  required_table text;
  unexpected_roles text;
begin
  foreach required_table in array array[
    'profiles', 'clients', 'sales', 'products', 'shipments',
    'activities', 'insights'
  ] loop
    if to_regclass('public.' || required_table) is null then
      raise exception 'Migración cancelada: falta la tabla public.%', required_table;
    end if;
  end loop;

  select string_agg(distinct role, ', ')
    into unexpected_roles
  from public.profiles
  where role is null or role not in ('admin', 'analyst', 'worker');

  if unexpected_roles is not null then
    raise exception 'Migración cancelada: existen roles no compatibles: %', unexpected_roles;
  end if;

  if not exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'Migración cancelada: no existe ningún perfil con rol admin';
  end if;
end $$;

-- Esta función se incluye para no depender de migraciones anteriores. Consulta
-- profiles (no user_metadata), por lo que el usuario no puede elevar su acceso.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'analyst', 'worker'));

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in (
    'dashboard', 'clients', 'sales', 'products', 'shipments',
    'activities', 'insights', 'documentation'
  )),
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_update boolean not null default false,
  can_delete boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, module)
);

alter table public.user_permissions enable row level security;

create or replace function public.has_permission(requested_module text, requested_action text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.user_permissions
    where user_id = (select auth.uid())
      and module = requested_module
      and case requested_action
        when 'view' then can_view
        when 'create' then can_create
        when 'update' then can_update
        when 'delete' then can_delete
        else false
      end
  );
$$;

revoke execute on function public.has_permission(text, text) from public, anon;
grant execute on function public.has_permission(text, text) to authenticated, service_role;

drop policy if exists "read_own_or_admin_permissions" on public.user_permissions;
create policy "read_own_or_admin_permissions" on public.user_permissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "admin_insert_permissions" on public.user_permissions;
create policy "admin_insert_permissions" on public.user_permissions for insert to authenticated
  with check (public.is_admin());
drop policy if exists "admin_update_permissions" on public.user_permissions;
create policy "admin_update_permissions" on public.user_permissions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin_delete_permissions" on public.user_permissions;
create policy "admin_delete_permissions" on public.user_permissions for delete to authenticated
  using (public.is_admin());

-- Solo un administrador puede modificar roles y perfiles.
drop policy if exists "admin_update_profiles" on public.profiles;
create policy "admin_update_profiles" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Permisos iniciales conservadores: usuarios actuales pueden ver los módulos
-- que ya tenían disponibles. El administrador puede ajustarlos después.
insert into public.user_permissions (user_id, module, can_view, can_create, can_update, can_delete)
select p.id, m.module, true,
  (m.module in ('clients', 'sales', 'products', 'shipments', 'activities')),
  (m.module in ('clients', 'sales', 'products', 'shipments', 'activities')),
  false
from public.profiles p
cross join (values
  ('dashboard'), ('clients'), ('sales'), ('products'), ('shipments'),
  ('activities'), ('insights'), ('documentation')
) as m(module)
where p.role <> 'admin'
on conflict (user_id, module) do nothing;

-- La matriz también se crea automáticamente para usuarios nuevos.
create or replace function public.seed_user_permissions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'admin' then
    insert into public.user_permissions (user_id, module, can_view, can_create, can_update)
    select new.id, module, true,
      module in ('clients', 'sales', 'products', 'shipments', 'activities'),
      module in ('clients', 'sales', 'products', 'shipments', 'activities')
    from unnest(array['dashboard','clients','sales','products','shipments','activities','insights','documentation']) module
    on conflict (user_id, module) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_profile_permissions_created on public.profiles;
create trigger on_profile_permissions_created after insert on public.profiles
for each row execute function public.seed_user_permissions();

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  file_path text not null unique,
  file_size bigint not null check (file_size > 0 and file_size <= 20971520),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;
drop policy if exists "permission_read_documents" on public.documents;
drop policy if exists "permission_create_documents" on public.documents;
drop policy if exists "permission_update_documents" on public.documents;
drop policy if exists "permission_delete_documents" on public.documents;
create policy "permission_read_documents" on public.documents for select to authenticated using (public.has_permission('documentation', 'view'));
create policy "permission_create_documents" on public.documents for insert to authenticated with check (public.has_permission('documentation', 'create') and created_by = (select auth.uid()));
create policy "permission_update_documents" on public.documents for update to authenticated using (public.has_permission('documentation', 'update')) with check (public.has_permission('documentation', 'update'));
create policy "permission_delete_documents" on public.documents for delete to authenticated using (public.has_permission('documentation', 'delete'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentation', 'documentation', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "permission_read_document_files" on storage.objects;
drop policy if exists "permission_create_document_files" on storage.objects;
drop policy if exists "permission_update_document_files" on storage.objects;
drop policy if exists "permission_delete_document_files" on storage.objects;
create policy "permission_read_document_files" on storage.objects for select to authenticated using (bucket_id = 'documentation' and public.has_permission('documentation', 'view'));
create policy "permission_create_document_files" on storage.objects for insert to authenticated with check (bucket_id = 'documentation' and public.has_permission('documentation', 'create'));
create policy "permission_update_document_files" on storage.objects for update to authenticated using (bucket_id = 'documentation' and public.has_permission('documentation', 'update'));
create policy "permission_delete_document_files" on storage.objects for delete to authenticated using (bucket_id = 'documentation' and public.has_permission('documentation', 'delete'));

-- Sustituye los permisos globales anteriores del CRM por permisos configurables.
do $$
declare pair record;
begin
  for pair in select * from (values
    ('clients','clients'), ('sales','sales'), ('products','products'),
    ('shipments','shipments'), ('activities','activities')
  ) as x(table_name, module_name)
  loop
    execute format('drop policy if exists %I on public.%I', 'authenticated_all_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'authenticated_read_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'authenticated_insert_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'authenticated_update_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'admin_delete_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'permission_read_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'permission_create_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'permission_update_' || pair.table_name, pair.table_name);
    execute format('drop policy if exists %I on public.%I', 'permission_delete_' || pair.table_name, pair.table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(%L, %L))', 'permission_read_' || pair.table_name, pair.table_name, pair.module_name, 'view');
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(%L, %L))', 'permission_create_' || pair.table_name, pair.table_name, pair.module_name, 'create');
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(%L, %L)) with check (public.has_permission(%L, %L))', 'permission_update_' || pair.table_name, pair.table_name, pair.module_name, 'update', pair.module_name, 'update');
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_permission(%L, %L))', 'permission_delete_' || pair.table_name, pair.table_name, pair.module_name, 'delete');
  end loop;
end $$;

-- Los Insights publicados siguen siendo el único contenido visible para no admins,
-- pero ahora además requieren permiso explícito sobre el módulo.
drop policy if exists "authenticated_read_insights" on public.insights;
create policy "authenticated_read_insights" on public.insights for select to authenticated
  using (published = true and public.has_permission('insights', 'view'));

commit;
