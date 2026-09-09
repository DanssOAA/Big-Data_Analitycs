begin;

alter table public.documents drop constraint if exists documents_id_project_unique;
alter table public.documents add constraint documents_id_project_unique unique (id, project_id);

create table public.document_analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique,
  project_id uuid not null,
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed')),
  summary text,
  keywords text[] not null default '{}',
  key_points text[] not null default '{}',
  risks text[] not null default '{}',
  recommendations text[] not null default '{}',
  conclusion text,
  error_message text,
  analyzed_by uuid references public.profiles(id) on delete set null,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_analyses_document_project_fkey
    foreign key (document_id, project_id)
    references public.documents(id, project_id)
    on delete cascade
);

create index document_analyses_project_idx on public.document_analyses(project_id, updated_at desc);
alter table public.document_analyses enable row level security;

create policy document_analyses_read on public.document_analyses
for select to authenticated
using (public.has_project_permission(project_id, 'documentation', 'view'));

-- La escritura se realiza exclusivamente desde analyze-document con
-- service_role después de validar al usuario y su permiso de actualización.

drop trigger if exists audit_log_trigger on public.document_analyses;
create trigger audit_log_trigger
after insert or update or delete on public.document_analyses
for each row execute function public.log_audit_event();

commit;
