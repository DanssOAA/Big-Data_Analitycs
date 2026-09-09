begin;

-- Se excluye dataset_rows: una importación puede contener cientos de miles
-- de filas y volver inútil el registro de auditoría.
do $$
declare
  audited_table text;
begin
  foreach audited_table in array array[
    'access_requests', 'projects', 'project_members', 'clients', 'sales',
    'products', 'shipments', 'activities', 'documents', 'datasets',
    'dataset_tables', 'insights', 'user_permissions', 'profiles'
  ]
  loop
    execute format('drop trigger if exists audit_log_trigger on public.%I', audited_table);
    execute format(
      'create trigger audit_log_trigger after insert or update or delete on public.%I for each row execute function public.log_audit_event()',
      audited_table
    );
  end loop;
end $$;

commit;
