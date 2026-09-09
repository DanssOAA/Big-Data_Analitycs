begin;
do $$ begin if not exists(select 1 from public.profiles where role='admin') then raise exception 'Migración cancelada: se requiere al menos un admin para Proyecto General'; end if; end $$;

insert into public.projects(id,name,description,owner_id)
select gen_random_uuid(),'Proyecto General','Datos existentes migrados automáticamente.',id from public.profiles where role='admin' order by created_at,id limit 1
on conflict do nothing;
do $$ begin if (select count(*) from public.projects where name='Proyecto General')<>1 then raise exception 'Debe existir exactamente un Proyecto General'; end if; end $$;

alter table public.project_members add column if not exists added_by uuid references public.profiles(id) on delete set null;
update public.project_members set added_by=coalesce(added_by,(select owner_id from public.projects where id=project_members.project_id));
alter table public.project_members drop constraint if exists project_members_role_check;
alter table public.project_members drop column if exists role;
insert into public.project_members(project_id,user_id,added_by)
select id,owner_id,owner_id from public.projects on conflict(project_id,user_id) do nothing;

do $$ declare t text; general_id uuid := (select id from public.projects where name='Proyecto General'); begin
  foreach t in array array['clients','sales','products','shipments','activities','documents','insights'] loop
    execute format('alter table public.%I add column if not exists project_id uuid references public.projects(id) on delete restrict',t);
    execute format('update public.%I set project_id=$1 where project_id is null',t) using general_id;
    execute format('alter table public.%I alter column project_id set not null',t);
    execute format('create index if not exists %I on public.%I(project_id)',t||'_project_id_idx',t);
  end loop;
  update public.datasets set project_id=general_id where project_id is null;
end $$;
alter table public.datasets drop constraint if exists datasets_project_id_fkey;
alter table public.datasets add constraint datasets_project_id_fkey foreign key(project_id) references public.projects(id) on delete restrict;
alter table public.datasets alter column project_id set not null;

update public.insights i set project_id=d.project_id from public.datasets d where i.dataset_id=d.id and i.project_id<>d.project_id;
alter table public.clients add constraint clients_id_project_unique unique(id,project_id);
alter table public.sales drop constraint if exists sales_client_id_fkey;
alter table public.sales add constraint sales_client_project_fkey foreign key(client_id,project_id) references public.clients(id,project_id) on delete restrict;
alter table public.shipments drop constraint if exists shipments_client_id_fkey;
alter table public.shipments add constraint shipments_client_project_fkey foreign key(client_id,project_id) references public.clients(id,project_id) on delete restrict;
alter table public.activities drop constraint if exists activities_client_id_fkey;
alter table public.activities add constraint activities_client_project_fkey foreign key(client_id,project_id) references public.clients(id,project_id) on delete restrict;
alter table public.datasets add constraint datasets_id_project_unique unique(id,project_id);
alter table public.insights drop constraint if exists insights_dataset_id_fkey;
alter table public.insights add constraint insights_dataset_project_fkey foreign key(dataset_id,project_id) references public.datasets(id,project_id) on delete restrict;

drop table if exists public.project_invites;

create or replace function public.delete_empty_project(requested_project_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare t text; n bigint; begin
  if not public.is_admin() then raise exception 'Acceso denegado'; end if;
  foreach t in array array['clients','sales','products','shipments','activities','documents','datasets','insights'] loop execute format('select count(*) from public.%I where project_id=$1',t) into n using requested_project_id; if n>0 then raise exception 'El proyecto contiene datos y no puede eliminarse'; end if; end loop;
  delete from public.projects where id=requested_project_id;
end $$;
revoke all on function public.delete_empty_project(uuid) from public,anon;
grant execute on function public.delete_empty_project(uuid) to authenticated;

create or replace function public.delete_project_data(requested_project_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'Acceso denegado'; end if;
  delete from public.insights where project_id=requested_project_id;
  delete from public.dataset_rows where table_id in(select dt.id from public.dataset_tables dt join public.datasets d on d.id=dt.dataset_id where d.project_id=requested_project_id);
  delete from public.dataset_tables where dataset_id in(select id from public.datasets where project_id=requested_project_id);
  delete from public.datasets where project_id=requested_project_id;
  delete from public.shipments where project_id=requested_project_id; delete from public.activities where project_id=requested_project_id;
  delete from public.sales where project_id=requested_project_id; delete from public.clients where project_id=requested_project_id; delete from public.products where project_id=requested_project_id;
end $$;
revoke all on function public.delete_project_data(uuid) from public,anon;
grant execute on function public.delete_project_data(uuid) to authenticated;
commit;
