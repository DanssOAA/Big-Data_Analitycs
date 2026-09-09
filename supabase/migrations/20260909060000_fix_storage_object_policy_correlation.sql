begin;

-- Dentro de los EXISTS, `name` se resolvía contra la tabla interna
-- (documents.name/datasets.name) y no contra storage.objects.name. Eso hacía
-- que Storage ocultara objetos existentes y createSignedUrl devolviera 404.
drop policy if exists documentation_storage_read on storage.objects;
drop policy if exists documentation_storage_update on storage.objects;
drop policy if exists documentation_storage_delete on storage.objects;
drop policy if exists datasets_storage_read on storage.objects;
drop policy if exists datasets_storage_delete on storage.objects;

create policy documentation_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'documentation'
  and exists (
    select 1 from public.documents d
    where d.file_path = storage.objects.name
      and public.has_project_permission(d.project_id, 'documentation', 'view')
  )
);

create policy documentation_storage_update
on storage.objects for update to authenticated
using (
  bucket_id = 'documentation'
  and exists (
    select 1 from public.documents d
    where d.file_path = storage.objects.name
      and public.has_project_permission(d.project_id, 'documentation', 'update')
  )
);

create policy documentation_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'documentation'
  and exists (
    select 1 from public.documents d
    where d.file_path = storage.objects.name
      and public.has_project_permission(d.project_id, 'documentation', 'delete')
  )
);

create policy datasets_storage_read
on storage.objects for select to authenticated
using (
  bucket_id = 'datasets'
  and exists (
    select 1 from public.datasets d
    where d.storage_path = storage.objects.name
      and public.has_project_permission(d.project_id, 'datasets', 'view')
  )
);

create policy datasets_storage_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'datasets'
  and exists (
    select 1 from public.datasets d
    where d.storage_path = storage.objects.name
      and public.has_project_permission(d.project_id, 'datasets', 'delete')
  )
);

commit;
