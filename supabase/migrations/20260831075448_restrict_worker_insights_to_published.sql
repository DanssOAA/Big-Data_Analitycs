-- El rol de administrador se obtiene de profiles, una tabla que el
-- usuario no puede editar. No se usa user_metadata para autorización.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Los trabajadores ya no pueden generar Insights. La política
-- admin_all_insights de la migración inicial conserva la escritura
-- completa para administradores.
drop policy if exists "authenticated_insert_own_insights"
  on public.insights;

-- Un trabajador solo puede leer publicaciones del administrador.
-- La política admin_all_insights sigue permitiendo al administrador
-- consultar también sus borradores.
drop policy if exists "authenticated_read_insights"
  on public.insights;

create policy "authenticated_read_insights"
  on public.insights
  for select
  to authenticated
  using (published = true);
