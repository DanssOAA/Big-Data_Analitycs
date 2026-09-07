-- Nuevos módulos de permisos: "doc_projects" (Proyectos de documentación) y
-- "audit" (Auditoría). No modifica ningún módulo existente.
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

alter table public.user_permissions drop constraint if exists user_permissions_module_check;
alter table public.user_permissions add constraint user_permissions_module_check
  check (module in (
    'dashboard', 'clients', 'sales', 'products', 'shipments',
    'activities', 'insights', 'documentation', 'doc_projects', 'audit'
  ));

-- "doc_projects" se comporta como el resto de módulos: todos pueden VER la
-- sección (aunque sin membresía de un proyecto concreto no verán ningún
-- proyecto), pero solo el administrador puede CREAR proyectos salvo que se
-- le otorgue el permiso explícitamente a alguien más (por eso no entra en
-- la lista de módulos con create/update=true por defecto, la misma que ya
-- usan clients/sales/products/shipments/activities).
--
-- "audit" es la excepción deliberada: nadie, salvo el administrador, lo ve
-- por defecto. Por eso NO se agrega al arreglo de módulos que se siembran
-- automáticamente para usuarios nuevos: sin fila en user_permissions,
-- has_permission('audit', 'view') devuelve false para cualquier no-admin
-- hasta que un administrador lo active a mano desde Usuarios y permisos.
create or replace function public.seed_user_permissions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'admin' then
    insert into public.user_permissions (user_id, module, can_view, can_create, can_update)
    select new.id, module, true,
      module in ('clients', 'sales', 'products', 'shipments', 'activities'),
      module in ('clients', 'sales', 'products', 'shipments', 'activities')
    from unnest(array['dashboard','clients','sales','products','shipments','activities','insights','documentation','doc_projects']) module
    on conflict (user_id, module) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_profile_permissions_created on public.profiles;
create trigger on_profile_permissions_created after insert on public.profiles
for each row execute function public.seed_user_permissions();

-- Backfill para usuarios ya existentes: mismo criterio que la siembra
-- automática de arriba. "audit" queda deliberadamente sin fila.
insert into public.user_permissions (user_id, module, can_view, can_create, can_update, can_delete)
select p.id, 'doc_projects', true, false, false, false
from public.profiles p
where p.role <> 'admin'
on conflict (user_id, module) do nothing;

commit;
