begin;
create or replace function public.is_project_member(requested_project_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() or exists(select 1 from public.project_members where project_id=requested_project_id and user_id=(select auth.uid())) $$;
create or replace function public.has_project_permission(requested_project_id uuid,requested_module text,requested_action text) returns boolean language sql stable security definer set search_path='' as $$ select public.is_admin() or (public.is_project_member(requested_project_id) and public.has_permission(requested_module,requested_action)) $$;
revoke all on function public.is_project_member(uuid),public.has_project_permission(uuid,text,text) from public,anon;
grant execute on function public.is_project_member(uuid),public.has_project_permission(uuid,text,text) to authenticated,service_role;

do $$ declare t text; p record; begin
  foreach t in array array['projects','project_members','clients','sales','products','shipments','activities','documents','datasets','dataset_tables','dataset_rows','insights'] loop
    execute format('alter table public.%I enable row level security',t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop execute format('drop policy if exists %I on public.%I',p.policyname,t); end loop;
  end loop;
end $$;

create policy projects_read on public.projects for select to authenticated using(public.is_admin() or public.is_project_member(id));
create policy projects_admin_insert on public.projects for insert to authenticated with check(public.is_admin());
create policy projects_admin_update on public.projects for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy projects_admin_delete on public.projects for delete to authenticated using(public.is_admin());
create policy members_read on public.project_members for select to authenticated using(public.is_admin() or user_id=(select auth.uid()));
create policy members_admin_insert on public.project_members for insert to authenticated with check(public.is_admin());
create policy members_admin_delete on public.project_members for delete to authenticated using(public.is_admin());

do $$ declare pair text[]; begin foreach pair slice 1 in array array[['clients','clients'],['sales','sales'],['products','products'],['shipments','shipments'],['activities','activities'],['documents','documentation'],['datasets','datasets']] loop
 execute format('create policy scoped_read on public.%I for select to authenticated using(public.has_project_permission(project_id,%L,''view''))',pair[1],pair[2]);
 execute format('create policy scoped_insert on public.%I for insert to authenticated with check(public.has_project_permission(project_id,%L,''create''))',pair[1],pair[2]);
 execute format('create policy scoped_update on public.%I for update to authenticated using(public.has_project_permission(project_id,%L,''update'')) with check(public.has_project_permission(project_id,%L,''update''))',pair[1],pair[2],pair[2]);
 execute format('create policy scoped_delete on public.%I for delete to authenticated using(public.has_project_permission(project_id,%L,''delete''))',pair[1],pair[2]);
end loop; end $$;

create policy dataset_tables_read on public.dataset_tables for select to authenticated using(exists(select 1 from public.datasets d where d.id=dataset_id and public.has_project_permission(d.project_id,'datasets','view')));
create policy dataset_tables_insert on public.dataset_tables for insert to authenticated with check(exists(select 1 from public.datasets d where d.id=dataset_id and public.has_project_permission(d.project_id,'datasets','create')));
create policy dataset_tables_update on public.dataset_tables for update to authenticated using(exists(select 1 from public.datasets d where d.id=dataset_id and public.has_project_permission(d.project_id,'datasets','update')));
create policy dataset_tables_delete on public.dataset_tables for delete to authenticated using(exists(select 1 from public.datasets d where d.id=dataset_id and public.has_project_permission(d.project_id,'datasets','delete')));
create policy dataset_rows_read on public.dataset_rows for select to authenticated using(exists(select 1 from public.dataset_tables dt join public.datasets d on d.id=dt.dataset_id where dt.id=table_id and public.has_project_permission(d.project_id,'datasets','view')));
create policy dataset_rows_insert on public.dataset_rows for insert to authenticated with check(exists(select 1 from public.dataset_tables dt join public.datasets d on d.id=dt.dataset_id where dt.id=table_id and public.has_project_permission(d.project_id,'datasets','create')));
create policy dataset_rows_update on public.dataset_rows for update to authenticated using(exists(select 1 from public.dataset_tables dt join public.datasets d on d.id=dt.dataset_id where dt.id=table_id and public.has_project_permission(d.project_id,'datasets','update')));
create policy dataset_rows_delete on public.dataset_rows for delete to authenticated using(exists(select 1 from public.dataset_tables dt join public.datasets d on d.id=dt.dataset_id where dt.id=table_id and public.has_project_permission(d.project_id,'datasets','delete')));

create policy insights_read on public.insights for select to authenticated using(public.is_admin() or (public.has_project_permission(project_id,'insights','view') and ((select role from public.profiles where id=(select auth.uid()))<>'worker' or published)));
create policy insights_insert on public.insights for insert to authenticated with check(public.has_project_permission(project_id,'insights','create') and created_by=(select auth.uid()) and exists(select 1 from public.datasets d where d.id=dataset_id and d.project_id=insights.project_id));
create policy insights_update on public.insights for update to authenticated using(public.has_project_permission(project_id,'insights','update')) with check(public.has_project_permission(project_id,'insights','update'));
create policy insights_delete on public.insights for delete to authenticated using(public.has_project_permission(project_id,'insights','delete'));

do $$ declare p record; begin for p in select policyname from pg_policies where schemaname='storage' and tablename='objects' and (policyname ilike '%document%' or policyname ilike '%dataset%') loop execute format('drop policy if exists %I on storage.objects',p.policyname); end loop; end $$;
create policy documentation_storage_read on storage.objects for select to authenticated using(bucket_id='documentation' and exists(select 1 from public.documents d where d.file_path=name and public.has_project_permission(d.project_id,'documentation','view')));
create policy documentation_storage_insert on storage.objects for insert to authenticated with check(bucket_id='documentation' and public.has_project_permission(((storage.foldername(name))[1])::uuid,'documentation','create'));
create policy documentation_storage_update on storage.objects for update to authenticated using(bucket_id='documentation' and exists(select 1 from public.documents d where d.file_path=name and public.has_project_permission(d.project_id,'documentation','update')));
create policy documentation_storage_delete on storage.objects for delete to authenticated using(bucket_id='documentation' and exists(select 1 from public.documents d where d.file_path=name and public.has_project_permission(d.project_id,'documentation','delete')));
create policy datasets_storage_read on storage.objects for select to authenticated using(bucket_id='datasets' and exists(select 1 from public.datasets d where d.storage_path=name and public.has_project_permission(d.project_id,'datasets','view')));
create policy datasets_storage_insert on storage.objects for insert to authenticated with check(bucket_id='datasets' and public.has_project_permission(((storage.foldername(name))[1])::uuid,'datasets','create'));
create policy datasets_storage_delete on storage.objects for delete to authenticated using(bucket_id='datasets' and exists(select 1 from public.datasets d where d.storage_path=name and public.has_project_permission(d.project_id,'datasets','delete')));

do $$ declare p record; begin if to_regclass('public.audit_log') is not null then execute 'alter table public.audit_log enable row level security'; for p in select policyname from pg_policies where schemaname='public' and tablename='audit_log' loop execute format('drop policy if exists %I on public.audit_log',p.policyname); end loop; execute 'create policy audit_admin_read on public.audit_log for select to authenticated using(public.is_admin())'; end if; end $$;
commit;
