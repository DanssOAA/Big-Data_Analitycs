begin;

alter table public.profiles add column if not exists must_change_password boolean not null default false;
drop function if exists public.complete_required_password_change();

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(), first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100), email text not null,
  message text check (message is null or char_length(message) <= 2000), status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz,
  created_user_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now(),
  check ((status='pending' and reviewed_at is null and reviewed_by is null and created_user_id is null) or (status='rejected' and reviewed_at is not null and reviewed_by is not null and created_user_id is null) or (status='approved' and reviewed_at is not null and reviewed_by is not null and created_user_id is not null))
);
create unique index if not exists access_requests_one_pending_email on public.access_requests(lower(email)) where status='pending';
create index if not exists access_requests_status_created_idx on public.access_requests(status,created_at desc);
alter table public.access_requests enable row level security;
drop policy if exists admin_read_access_requests on public.access_requests;
create policy admin_read_access_requests on public.access_requests for select to authenticated using (public.is_admin());

alter table public.user_permissions drop constraint if exists user_permissions_module_check;
delete from public.user_permissions where module in ('doc_projects','audit');
alter table public.user_permissions add constraint user_permissions_module_check check (module in ('dashboard','clients','sales','products','shipments','activities','insights','documentation','datasets'));
insert into public.user_permissions(user_id,module,can_view,can_create,can_update,can_delete)
select id,'datasets',role='analyst',role='analyst',false,false from public.profiles where role<>'admin'
on conflict(user_id,module) do nothing;

create or replace function public.seed_user_permissions() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.role <> 'admin' then
    insert into public.user_permissions(user_id,module,can_view,can_create,can_update,can_delete)
    select new.id,v.module,v.can_view,v.can_create,v.can_update,false from (values
      ('dashboard',true,false,false),('clients',true,true,false),('sales',true,true,false),('products',true,true,false),
      ('shipments',true,true,false),('activities',true,true,false),('documentation',true,false,false),
      ('insights',true,new.role='analyst',new.role='analyst'),('datasets',new.role='analyst',new.role='analyst',false)
    ) v(module,can_view,can_create,can_update)
    on conflict(user_id,module) do nothing;
  end if; return new;
end $$;

create or replace function public.sync_changed_role_permissions() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.role is distinct from new.role and new.role in ('worker','analyst') then
    insert into public.user_permissions(user_id,module,can_view,can_create,can_update,can_delete)
    values
      (new.id,'datasets',new.role='analyst',new.role='analyst',false,false),
      (new.id,'insights',true,new.role='analyst',new.role='analyst',false)
    on conflict(user_id,module) do update set
      can_view=excluded.can_view, can_create=excluded.can_create,
      can_update=excluded.can_update, can_delete=excluded.can_delete,
      updated_at=now();
  end if;
  return new;
end $$;
drop trigger if exists on_profile_role_permissions_changed on public.profiles;
create trigger on_profile_role_permissions_changed after update of role on public.profiles
for each row execute function public.sync_changed_role_permissions();

commit;
