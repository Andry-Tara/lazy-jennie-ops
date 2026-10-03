-- READ ONLY. Run manually in Supabase SQL Editor BEFORE the Phase 1A migration.
-- Review the migration first. This file neither creates objects nor assigns data.
-- Retain every result, especially mapping_baseline, for the postcheck comparison.
-- Run precheck/migration/postcheck in a reviewed window: concurrent user/outlet
-- administration will appear as a mapping difference and must be investigated.
-- No auth.users metadata, credentials, phone numbers or email addresses are read.

begin transaction isolation level repeatable read read only;

-- 1. Current locations, including central kitchens and inactive outlets.
select
  o.id as outlet_id,
  o.code,
  o.name,
  o.type,
  o.is_active,
  count(p.id) as assigned_profile_count,
  count(p.id) filter (where p.is_active) as active_assigned_profile_count
from public.outlets o
left join public.profiles p on p.outlet_id = o.id
group by o.id, o.code, o.name, o.type, o.is_active
order by o.code, o.id;

-- 2. Unassigned profiles. NULL outlet is NOT a future company/platform grant.
select
  p.id as profile_id,
  p.employee_code,
  p.full_name,
  p.is_active,
  r.code as role_code
from public.profiles p
left join public.roles r on r.id = p.role_id
where p.outlet_id is null
order by r.code, p.id;

-- 3. Role and location mapping for every active profile.
select
  p.id as profile_id,
  p.employee_code,
  p.full_name,
  p.role_id,
  r.code as role_code,
  p.outlet_id,
  o.code as outlet_code,
  o.name as outlet_name
from public.profiles p
left join public.roles r on r.id = p.role_id
left join public.outlets o on o.id = p.outlet_id
where p.is_active
order by r.code, o.code, p.id;

-- 4. Legacy global-role candidates; these columns intentionally distinguish
-- the confirmed sales helper baseline from the broader UI convention.
-- SUPER_ADMIN / MANAGEMENT / FINANCE are global in can_view_sales_row per the
-- supplied remote audit. The UI additionally clears outlet for PURCHASING.
-- This is NOT a claim that private.is_global_role includes PURCHASING: inspect
-- its definition below before approving any membership mapping.
select
  p.id as profile_id,
  p.full_name,
  p.is_active,
  r.code as role_code,
  p.outlet_id,
  r.code in ('SUPER_ADMIN', 'MANAGEMENT', 'FINANCE')
    as global_sales_role_from_confirmed_baseline,
  r.code in ('SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'PURCHASING')
    as global_location_ui_convention
from public.profiles p
join public.roles r on r.id = p.role_id
where r.code in ('SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'PURCHASING')
order by r.code, p.id;

-- 5. Resolve the remaining legacy-global-helper signature/body uncertainty.
-- Inspect all overloads; never execute the helper as an impersonated user.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('private', 'public')
  and p.proname = 'is_global_role'
  and p.prokind = 'f'
order by n.nspname, arguments;

-- 6. Name collisions must be reviewed; the migration will not overwrite them.
select object_name, to_regclass(object_name) is not null as already_exists
from (values
  ('public.companies'),
  ('public.company_memberships'),
  ('public.company_outlet_access'),
  ('public.platform_users'),
  ('public.control_plane_audit_events')
) as expected(object_name);

select exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'outlets'
    and column_name = 'company_id'
) as outlets_company_id_already_exists;

select n.nspname as schema_name, p.proname,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'private' and p.proname in (
    'control_plane_set_updated_at', 'control_plane_protect_company_code',
    'control_plane_reject_audit_mutation', 'is_platform_admin',
    'current_company_membership', 'can_view_company', 'can_access_company_outlet'
  ))
  or (n.nspname = 'public' and p.proname in (
    'get_my_platform_access', 'get_my_companies', 'get_my_company_outlets',
    'get_my_company_memberships'
  ))
order by n.nspname, p.proname, arguments;

-- 7. SAVE THIS JSON RESULT outside the database; paste the JSON object into
-- the marked dollar-quoted literal in phase_1a_postcheck.sql. No persistent
-- snapshot table is created. Missing baseline must never be reported as PASS.
select jsonb_build_object(
  'baseline_version', 1,
  'captured_at', transaction_timestamp(),
  'outlets', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'code', o.code, 'name', o.name, 'type', o.type
    ) order by o.id)
    from public.outlets o
  ), '[]'::jsonb),
  'profiles', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'outlet_id', p.outlet_id, 'role_id', p.role_id
    ) order by p.id)
    from public.profiles p
  ), '[]'::jsonb),
  'legacy_helpers', coalesce((
    select jsonb_agg(jsonb_build_object(
      'signature', p.oid::regprocedure::text,
      'definition_md5', md5(pg_get_functiondef(p.oid))
    ) order by p.oid::regprocedure::text)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.prokind = 'f'
      and p.proname in (
        'can_access_location_module', 'can_post_location_module',
        'can_view_sales_row', 'current_role_code', 'is_global_role'
      )
  ), '[]'::jsonb)
) as mapping_baseline;

commit;
