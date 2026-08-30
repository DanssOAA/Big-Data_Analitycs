-- Ejecuta este archivo una vez en Supabase > SQL Editor.

-- Evita duplicar el número de fila dentro de una tabla.
create unique index if not exists dataset_rows_table_row_unique
  on public.dataset_rows (table_id, row_number);

-- Índice para listar rápidamente las tablas de un dataset.
create index if not exists dataset_tables_dataset_id_index
  on public.dataset_tables (dataset_id);

alter table public.datasets enable row level security;
alter table public.dataset_tables enable row level security;
alter table public.dataset_rows enable row level security;

drop policy if exists "datasets_auth_all" on public.datasets;
create policy "datasets_auth_all"
  on public.datasets for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dataset_tables_auth_all" on public.dataset_tables;
create policy "dataset_tables_auth_all"
  on public.dataset_tables for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "dataset_rows_auth_all" on public.dataset_rows;
create policy "dataset_rows_auth_all"
  on public.dataset_rows for all
  to authenticated
  using (true)
  with check (true);

-- El bucket privado "datasets" ya debe existir.
drop policy if exists "datasets_storage_insert" on storage.objects;
create policy "datasets_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'datasets');

drop policy if exists "datasets_storage_select" on storage.objects;
create policy "datasets_storage_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'datasets');

drop policy if exists "datasets_storage_delete" on storage.objects;
create policy "datasets_storage_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'datasets');
