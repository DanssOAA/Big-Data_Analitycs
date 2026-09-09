begin;

-- Archivos fuente de datasets (CSV/XLS/XLSX). El frontend usa el nombre
-- `datasets`; cada objeto nuevo debe vivir bajo {projectId}/... para que las
-- políticas instaladas en 20260909030000 puedan aislarlo por proyecto.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'datasets',
  'datasets',
  false,
  52428800,
  array[
    'text/csv',
    'application/csv',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
