-- Módulo de Auditoría: registro inmutable de creaciones, ediciones y
-- borrados en las tablas importantes del sistema, más un registro
-- explícito de "visualización" de documentos (Postgres no dispara
-- triggers en SELECT, así que esto se llama a mano desde el frontend).
--
-- Por defecto nadie salvo el administrador puede leer esta tabla: el
-- permiso se otorga por persona desde Usuarios y permisos (módulo
-- "audit", agregado en 20260907000000_doc_audit_permission_modules.sql).
--
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'VIEW')),
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists audit_log_lookup_idx on public.audit_log (table_name, record_id, changed_at desc);
create index if not exists audit_log_changed_at_idx on public.audit_log (changed_at desc);

alter table public.audit_log enable row level security;

-- Sin policies de insert/update/delete para ningún rol: el log solo se
-- escribe desde funciones `security definer` (el trigger de abajo y
-- log_document_view), nunca directamente desde el cliente. Eso lo hace
-- efectivamente inmutable para cualquier usuario, incluido el admin, desde
-- la aplicación.
drop policy if exists "permission_read_audit_log" on public.audit_log;
create policy "permission_read_audit_log" on public.audit_log for select to authenticated
  using (public.has_permission('audit', 'view'));

-- Función genérica de auditoría: captura tabla, acción, fila antes/después
-- y quién la hizo. El identificador de la fila usa la columna "id" cuando
-- existe; para tablas con llave compuesta (sin "id"), arma un identificador
-- legible concatenando las columnas típicas de llave que sí tengan valor.
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(coalesce(new, old));
  identifier text := coalesce(
    row_data ->> 'id',
    nullif(concat_ws(':', row_data ->> 'project_id', row_data ->> 'user_id', row_data ->> 'module'), '')
  );
begin
  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name,
    coalesce(identifier, ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) end,
    auth.uid()
  );
  return coalesce(new, old);
end;
$$;

-- Tablas instrumentadas: los cambios de negocio del CRM, documentos
-- (globales y de proyecto) y cambios de acceso (roles y permisos).
-- Deliberadamente fuera: "activities" (se deja intacta, es un módulo de
-- negocio, no de auditoría) y "datasets"/"dataset_rows"/"insights" (alto
-- volumen por import masivo, bajo valor de auditoría).
do $$
declare audited_table text;
begin
  foreach audited_table in array array[
    'clients', 'sales', 'products', 'shipments', 'documents',
    'documentation_projects', 'documentation_project_members',
    'documentation_milestones', 'documentation_milestone_versions',
    'user_permissions', 'profiles'
  ]
  loop
    execute format('drop trigger if exists audit_log_trigger on public.%I', audited_table);
    execute format(
      'create trigger audit_log_trigger after insert or update or delete on public.%I for each row execute function public.log_audit_event()',
      audited_table
    );
  end loop;
end $$;

-- Registro explícito de "visualización". Se llama desde el frontend justo
-- antes de generar la signed URL de un documento (global o de proyecto).
create or replace function public.log_document_view(p_table_name text, p_record_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_log (table_name, record_id, action, changed_by)
  values (p_table_name, p_record_id, 'VIEW', auth.uid());
end;
$$;
revoke execute on function public.log_document_view(text, text) from public, anon;
grant execute on function public.log_document_view(text, text) to authenticated;

commit;
