-- Dos columnas simples, sin cambios de RLS (las policies existentes ya
-- cubren toda la fila, no por columna):
--
-- 1. profiles.area: texto libre y opcional, asignado por el administrador
--    desde Usuarios y permisos. Se usa para agrupar el selector de "Agregar
--    persona" al invitar miembros a un proyecto de documentación.
-- 2. documentation_milestone_versions.ai_diff_summary: resumen generado por
--    la IA de qué cambió entre una versión y la anterior del mismo avance
--    (lo llena el análisis con IA que corre en el navegador, mismo patrón
--    que src/services/aiInsights.service.ts; queda vacío en la v1 de cada
--    avance, porque ahí no hay versión anterior con la que comparar).
--
-- Aplicar en Supabase Dashboard -> SQL Editor -> Run. Es idempotente.

begin;

alter table public.profiles add column if not exists area text;

alter table public.documentation_milestone_versions
  add column if not exists ai_diff_summary text;

commit;
