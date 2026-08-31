-- =========================================================
-- CRM INSIGHTS - Migracion inicial
-- Ejecutar UNA VEZ en: Supabase Dashboard -> SQL Editor -> Run
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =========================================================

-- ---------------------------------------------------------
-- 0. Helper: saber si el usuario autenticado es admin
-- ---------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---------------------------------------------------------
-- 1. clients / sales
--    (los permisos reales se definen en la Seccion 10, al final
--    del archivo, junto con activities/products/shipments)
-- ---------------------------------------------------------

alter table public.clients enable row level security;
alter table public.sales enable row level security;

-- ---------------------------------------------------------
-- 2. activities (nueva)
-- ---------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id text references public.clients(id) on delete set null,
  type text not null,
  description text not null,
  activity_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

-- ---------------------------------------------------------
-- 3. datasets: columna source_type (mis datos / competencia)
-- ---------------------------------------------------------

alter table public.datasets
  add column if not exists source_type text not null default 'external';

alter table public.datasets
  drop constraint if exists datasets_source_type_check;

alter table public.datasets
  add constraint datasets_source_type_check
  check (source_type in ('internal', 'external'));

-- ---------------------------------------------------------
-- 4. datasets / dataset_tables / dataset_rows
--    Lectura: cualquier usuario autenticado (el trabajador la
--    necesita para poder generar comparaciones con IA).
--    Escritura (subir/editar/borrar datasets): solo admin.
--    El trabajador NUNCA tiene un explorador de datasets ni un
--    boton de carga en la interfaz; esto es solo la capa de
--    datos que habilita el analisis de IA por debajo.
-- ---------------------------------------------------------

alter table public.datasets enable row level security;
alter table public.dataset_tables enable row level security;
alter table public.dataset_rows enable row level security;

drop policy if exists "admin_all_datasets" on public.datasets;
drop policy if exists "authenticated_read_datasets" on public.datasets;
drop policy if exists "admin_write_datasets" on public.datasets;
drop policy if exists "admin_update_datasets" on public.datasets;
drop policy if exists "admin_delete_datasets" on public.datasets;

create policy "authenticated_read_datasets"
  on public.datasets
  for select
  to authenticated
  using (true);

create policy "admin_write_datasets"
  on public.datasets
  for insert
  to authenticated
  with check (public.is_admin());

create policy "admin_update_datasets"
  on public.datasets
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_datasets"
  on public.datasets
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_all_dataset_tables" on public.dataset_tables;
drop policy if exists "authenticated_read_dataset_tables" on public.dataset_tables;
drop policy if exists "admin_write_dataset_tables" on public.dataset_tables;
drop policy if exists "admin_update_dataset_tables" on public.dataset_tables;
drop policy if exists "admin_delete_dataset_tables" on public.dataset_tables;

create policy "authenticated_read_dataset_tables"
  on public.dataset_tables
  for select
  to authenticated
  using (true);

create policy "admin_write_dataset_tables"
  on public.dataset_tables
  for insert
  to authenticated
  with check (public.is_admin());

create policy "admin_update_dataset_tables"
  on public.dataset_tables
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_dataset_tables"
  on public.dataset_tables
  for delete
  to authenticated
  using (public.is_admin());

drop policy if exists "admin_all_dataset_rows" on public.dataset_rows;
drop policy if exists "authenticated_read_dataset_rows" on public.dataset_rows;
drop policy if exists "admin_write_dataset_rows" on public.dataset_rows;
drop policy if exists "admin_update_dataset_rows" on public.dataset_rows;
drop policy if exists "admin_delete_dataset_rows" on public.dataset_rows;

create policy "authenticated_read_dataset_rows"
  on public.dataset_rows
  for select
  to authenticated
  using (true);

create policy "admin_write_dataset_rows"
  on public.dataset_rows
  for insert
  to authenticated
  with check (public.is_admin());

create policy "admin_update_dataset_rows"
  on public.dataset_rows
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_dataset_rows"
  on public.dataset_rows
  for delete
  to authenticated
  using (public.is_admin());

-- Asegurar borrado en cascada (si las FK no lo tenian definido asi)
alter table public.dataset_tables
  drop constraint if exists dataset_tables_dataset_id_fkey,
  add constraint dataset_tables_dataset_id_fkey
    foreign key (dataset_id) references public.datasets(id) on delete cascade;

alter table public.dataset_rows
  drop constraint if exists dataset_rows_table_id_fkey,
  add constraint dataset_rows_table_id_fkey
    foreign key (table_id) references public.dataset_tables(id) on delete cascade;

-- ---------------------------------------------------------
-- 5. insights (analisis de IA)
-- ---------------------------------------------------------

create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  dataset_id text references public.datasets(id) on delete set null,
  table_id text references public.dataset_tables(id) on delete set null,
  compared_dataset_id text references public.datasets(id) on delete set null,
  comparison_mode text not null default 'crm' check (comparison_mode in ('crm', 'datasets')),
  title text not null,
  gap text,
  probable_cause text,
  recommendations jsonb not null default '[]'::jsonb,
  comparison jsonb not null default '[]'::jsonb,
  improvement_plan jsonb not null default '[]'::jsonb,
  competitor_advantage text,
  conclusion text,
  crm_snapshot jsonb,
  external_snapshot jsonb,
  published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.insights enable row level security;

-- El administrador puede hacer de todo (incluido publicar/despublicar
-- y ver los borradores de cualquier usuario).
drop policy if exists "admin_all_insights" on public.insights;
create policy "admin_all_insights"
  on public.insights
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Cualquier usuario autenticado (incluido el trabajador) puede
-- generar sus propios analisis con la IA...
drop policy if exists "authenticated_insert_own_insights" on public.insights;
create policy "authenticated_insert_own_insights"
  on public.insights
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- ...y puede ver los que ya estan publicados o los que genero el
-- mismo. Publicar/despublicar sigue siendo exclusivo del admin
-- (no hay politica de UPDATE para el resto de usuarios).
drop policy if exists "worker_read_published_insights" on public.insights;
drop policy if exists "authenticated_read_insights" on public.insights;
create policy "authenticated_read_insights"
  on public.insights
  for select
  to authenticated
  using (
    published = true
    or created_by = auth.uid()
  );

-- ---------------------------------------------------------
-- 6. profiles (lista de usuarios sin exponer service_role)
-- ---------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'worker',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "authenticated_read_profiles" on public.profiles;
create policy "authenticated_read_profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'worker')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill de los usuarios que ya existen
insert into public.profiles (id, email, full_name, role, created_at)
select
  id,
  email,
  raw_user_meta_data ->> 'full_name',
  coalesce(raw_user_meta_data ->> 'role', 'worker'),
  created_at
from auth.users
on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

-- ---------------------------------------------------------
-- 7. products (catalogo de productos / servicios)
-- ---------------------------------------------------------

create table if not exists public.products (
  id text primary key,
  code text not null,
  name text not null,
  category text not null,
  unit text not null default 'unidad',
  unit_price numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- ---------------------------------------------------------
-- 8. shipments (envios / logistica)
--    Modulo operativo independiente de ventas: alimenta futuros
--    analisis de IA con datos logisticos (rutas, transportistas,
--    tiempos de entrega, costos de flete).
-- ---------------------------------------------------------

create table if not exists public.shipments (
  id text primary key,
  code text not null,
  client_id text references public.clients(id) on delete set null,
  origin text not null,
  destination text not null,
  carrier text not null,
  cargo_type text not null,
  weight_kg numeric not null default 0,
  distance_km numeric not null default 0,
  cost numeric not null default 0,
  delivery_days integer not null default 0,
  status text not null default 'En transito',
  shipped_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.shipments enable row level security;

-- ---------------------------------------------------------
-- 9. Storage: bucket "datasets" solo accesible por admin
-- ---------------------------------------------------------

drop policy if exists "admin_all_datasets_storage" on storage.objects;
create policy "admin_all_datasets_storage"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'datasets' and public.is_admin())
  with check (bucket_id = 'datasets' and public.is_admin());

-- ---------------------------------------------------------
-- 10. Permisos del CRM operativo (clients, sales, activities,
--     products, shipments):
--     - Cualquier usuario autenticado (admin o trabajador) puede
--       leer, crear y editar.
--     - Eliminar (delete) queda reservado SOLO al administrador.
--       El trabajador puede seguir agregando informacion, pero
--       nunca borrar nada.
-- ---------------------------------------------------------

do $$
declare
  crm_table text;
begin
  foreach crm_table in array array[
    'clients',
    'sales',
    'activities',
    'products',
    'shipments'
  ]
  loop
    execute format(
      'alter table public.%I enable row level security',
      crm_table
    );

    -- Se eliminan las politicas viejas (de versiones anteriores
    -- de esta migracion) para evitar choques al reejecutar.
    execute format(
      'drop policy if exists %I on public.%I',
      'authenticated_all_' || crm_table,
      crm_table
    );

    execute format(
      'drop policy if exists %I on public.%I',
      'authenticated_read_' || crm_table,
      crm_table
    );

    execute format(
      'drop policy if exists %I on public.%I',
      'authenticated_insert_' || crm_table,
      crm_table
    );

    execute format(
      'drop policy if exists %I on public.%I',
      'authenticated_update_' || crm_table,
      crm_table
    );

    execute format(
      'drop policy if exists %I on public.%I',
      'admin_delete_' || crm_table,
      crm_table
    );

    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      'authenticated_read_' || crm_table,
      crm_table
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      'authenticated_insert_' || crm_table,
      crm_table
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      'authenticated_update_' || crm_table,
      crm_table
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      'admin_delete_' || crm_table,
      crm_table
    );
  end loop;
end $$;
