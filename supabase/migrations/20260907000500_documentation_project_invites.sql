-- Invitaciones por correo a proyectos de documentación. Antes, el admin
-- agregaba a una persona directamente como miembro (sin aviso ni paso de
-- aceptación); ahora se crea una invitación PENDIENTE y se le manda un
-- correo con un link -- la persona solo queda como miembro real cuando
-- hace click y acepta. Sigue siendo "solo admin invita, solo a usuarios ya
-- registrados": no cambia quién puede invitar, solo se agrega el paso de
-- aviso + confirmación.
--
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

create table if not exists public.documentation_project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.documentation_projects(id) on delete cascade,
  -- Denormalizado a propósito: quien todavía no es miembro no puede leer
  -- documentation_projects por RLS, así que el nombre se copia aquí al
  -- crear la invitación para poder mostrarlo en la pantalla de aceptar.
  project_name text not null,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (project_id, email)
);

alter table public.documentation_project_invites enable row level security;

drop policy if exists "docproj_select_invites" on public.documentation_project_invites;
drop policy if exists "docproj_insert_invites" on public.documentation_project_invites;
drop policy if exists "docproj_delete_invites" on public.documentation_project_invites;

-- Se ve si eres admin, o si la invitación es para el correo con el que
-- tienes la sesión iniciada (mismo patrón que ya usa el módulo genérico de
-- Proyectos para sus invitaciones).
create policy "docproj_select_invites" on public.documentation_project_invites for select to authenticated
  using (
    public.is_admin()
    or lower(email) = lower((select email from auth.users where id = (select auth.uid())))
  );

create policy "docproj_insert_invites" on public.documentation_project_invites for insert to authenticated
  with check (public.is_admin());

create policy "docproj_delete_invites" on public.documentation_project_invites for delete to authenticated
  using (public.is_admin());

-- Sin policy de UPDATE: marcar la invitación como aceptada solo pasa a
-- través de accept_documentation_project_invite() (security definer), no
-- por un update directo del cliente.

-- Único camino para aceptar: valida que el correo de la sesión actual
-- coincide con el de la invitación, agrega la membresía y marca la
-- invitación como aceptada, todo en una transacción.
create or replace function public.accept_documentation_project_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.documentation_project_invites;
  caller_email text;
begin
  select email into caller_email from auth.users where id = auth.uid();

  select * into inv from public.documentation_project_invites where id = invite_id;
  if inv.id is null then
    raise exception 'No se encontró la invitación.';
  end if;
  if inv.accepted_at is not null then
    raise exception 'Esta invitación ya fue aceptada.';
  end if;
  if caller_email is null or lower(inv.email) <> lower(caller_email) then
    raise exception 'Esta invitación no es para tu cuenta.';
  end if;

  insert into public.documentation_project_members (project_id, user_id, role, added_by)
  values (inv.project_id, auth.uid(), inv.role, inv.invited_by)
  on conflict (project_id, user_id) do update set role = excluded.role;

  update public.documentation_project_invites set accepted_at = now() where id = invite_id;
end;
$$;
revoke execute on function public.accept_documentation_project_invite(uuid) from public, anon;
grant execute on function public.accept_documentation_project_invite(uuid) to authenticated;

-- Se suma a la auditoría (misma función que ya usan las demás tablas del
-- módulo, creada en 20260907000200_audit_log.sql).
drop trigger if exists audit_log_trigger on public.documentation_project_invites;
create trigger audit_log_trigger after insert or update or delete on public.documentation_project_invites
for each row execute function public.log_audit_event();

commit;
