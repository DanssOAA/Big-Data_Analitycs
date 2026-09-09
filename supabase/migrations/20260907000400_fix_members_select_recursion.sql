-- Corrige "infinite recursion detected in policy for relation
-- documentation_project_members". La policy original comparaba la tabla
-- documentation_project_members contra SÍ MISMA con un subquery directo;
-- como la tabla tiene RLS activado, Postgres vuelve a aplicar esa misma
-- policy al evaluar el subquery interno, generando un bucle infinito que
-- termina en error para CUALQUIER usuario (incluido el admin), rompiendo
-- silenciosamente la carga de miembros y, en cascada, la vista de detalle
-- del proyecto ("Proyecto no encontrado").
--
-- El resto de tablas del módulo (documentation_projects, milestones,
-- versions) ya usaban has_doc_project_role() -- una función
-- security definer que bypassa RLS en su chequeo interno y por eso no
-- sufre este problema. Se corrige esta policy para usar la misma función.
--
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

drop policy if exists "docproj_select_members" on public.documentation_project_members;
create policy "docproj_select_members" on public.documentation_project_members for select to authenticated
  using (public.has_doc_project_role(project_id, 'viewer'));

commit;
