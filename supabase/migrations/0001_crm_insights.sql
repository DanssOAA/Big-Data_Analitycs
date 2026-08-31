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
-- 1. clients / sales: asegurar RLS + politicas
--    (cualquier usuario autenticado puede gestionar el CRM,
--    igual que hacia el mock anterior)
-- ---------------------------------------------------------

alter table public.clients enable row level security;
alter table public.sales enable row level security;

drop policy if exists "authenticated_all_clients" on public.clients;
create policy "authenticated_all_clients"
  on public.clients
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated_all_sales" on public.sales;
create policy "authenticated_all_sales"
  on public.sales
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------
-- 2. activities (nueva)
-- ---------------------------------------------------------

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  type text not null,
  description text not null,
  activity_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;

drop policy if exists "authenticated_all_activities" on public.activities;
create policy "authenticated_all_activities"
  on public.activities
  for all
  to authenticated
  using (true)
  with check (true);

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
-- 4. RLS admin-only para datasets / dataset_tables / dataset_rows
--    (el trabajador nunca navega datasets crudos, solo insights
--    publicados)
-- ---------------------------------------------------------

alter table public.datasets enable row level security;
alter table public.dataset_tables enable row level security;
alter table public.dataset_rows enable row level security;

drop policy if exists "admin_all_datasets" on public.datasets;
create policy "admin_all_datasets"
  on public.datasets
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_all_dataset_tables" on public.dataset_tables;
create policy "admin_all_dataset_tables"
  on public.dataset_tables
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin_all_dataset_rows" on public.dataset_rows;
create policy "admin_all_dataset_rows"
  on public.dataset_rows
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
  dataset_id uuid references public.datasets(id) on delete set null,
  table_id uuid references public.dataset_tables(id) on delete set null,
  compared_dataset_id uuid references public.datasets(id) on delete set null,
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

drop policy if exists "admin_all_insights" on public.insights;
create policy "admin_all_insights"
  on public.insights
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "worker_read_published_insights" on public.insights;
create policy "worker_read_published_insights"
  on public.insights
  for select
  to authenticated
  using (published = true);

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
-- 7. Storage: bucket "datasets" solo accesible por admin
-- ---------------------------------------------------------

drop policy if exists "admin_all_datasets_storage" on storage.objects;
create policy "admin_all_datasets_storage"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'datasets' and public.is_admin())
  with check (bucket_id = 'datasets' and public.is_admin());
