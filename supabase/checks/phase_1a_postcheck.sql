-- READ ONLY. Run manually AFTER the reviewed migration is eventually applied.
-- No SQL in this file applies the migration, backfills ownership or creates data.
-- Paste the precheck mapping_baseline JSON into the marked literal below.
-- Without it, preservation checks return NOT_VERIFIED, never a false PASS.

begin transaction isolation level repeatable read read only;

-- 1. Expected tables must exist, have RLS enabled, and have no browser policies.
select
  expected.object_name,
  c.oid is not null as exists_ok,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  coalesce(not c.relforcerowsecurity, false) as owner_rpc_bypass_available,
  (select count(*) from pg_policy p where p.polrelid = c.oid) as policy_count
from (values
  ('public.companies'),
  ('public.company_memberships'),
  ('public.company_outlet_access'),
  ('public.platform_users'),
  ('public.control_plane_audit_events')
) as expected(object_name)
left join pg_class c on c.oid = to_regclass(expected.object_name)
order by expected.object_name;

-- Subsequent queries intentionally fail if the migration is absent/incomplete.
-- 2. Compare exact identity/assignment sets, not just row counts.
with supplied as (
  select $phase1a_baseline$
{}
$phase1a_baseline$::jsonb as baseline -- REPLACE {} WITH PRECHECK JSON
), baseline_state as (
  select baseline,
    coalesce(
      baseline ->> 'baseline_version' = '1'
      and jsonb_typeof(baseline -> 'outlets') = 'array'
      and jsonb_typeof(baseline -> 'profiles') = 'array'
      and jsonb_typeof(baseline -> 'legacy_helpers') = 'array',
      false
    ) as supplied_ok
  from supplied
), old_outlets as (
  select x.* from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'outlets'
      else '[]'::jsonb end)
    as x(id uuid, code text, name text, type text)
), old_profiles as (
  select x.* from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'profiles'
      else '[]'::jsonb end)
    as x(id uuid, outlet_id uuid, role_id uuid)
), old_helpers as (
  select x.* from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'legacy_helpers'
      else '[]'::jsonb end)
    as x(signature text, definition_md5 text)
), differences as (
  select 'outlet_identity_set_unchanged' as check_name, count(*) as difference_count
  from old_outlets b full join public.outlets o on o.id = b.id
  where b.id is null or o.id is null
  union all
  select 'outlet_codes_names_types_unchanged', count(*)
  from old_outlets b full join public.outlets o on o.id = b.id
  where b.id is null or o.id is null
    or (b.code, b.name, b.type) is distinct from
       (o.code::text, o.name::text, o.type::text)
  union all
  select 'profile_identity_and_outlet_assignments_unchanged', count(*)
  from old_profiles b full join public.profiles p on p.id = b.id
  where b.id is null or p.id is null or b.outlet_id is distinct from p.outlet_id
  union all
  select 'profile_roles_unchanged', count(*)
  from old_profiles b full join public.profiles p on p.id = b.id
  where b.id is null or p.id is null or b.role_id is distinct from p.role_id
  union all
  select 'captured_legacy_helpers_unchanged', count(*)
  from old_helpers b
  left join pg_proc p on p.oid = to_regprocedure(b.signature)
  where p.oid is null or b.definition_md5 is distinct from md5(pg_get_functiondef(p.oid))
)
select d.check_name,
  case when not b.supplied_ok then 'NOT_VERIFIED: supply precheck baseline'
    when d.check_name = 'captured_legacy_helpers_unchanged'
      and not exists (select 1 from old_helpers)
      then 'NOT_VERIFIED: baseline captured no legacy helpers'
    when d.difference_count = 0 then 'PASS'
    else 'FAIL: investigate differences' end as result,
  case when b.supplied_ok then d.difference_count else null end as difference_count,
  b.baseline ->> 'captured_at' as baseline_captured_at
from differences d cross join baseline_state b
order by d.check_name;

-- 3. Both company-matching foreign keys must exist, be validated/immediate,
-- use the exact column pairs, and restrict parent deletion/ownership changes.
with expected as (
  select * from (values
    ('company_outlet_access_membership_company_fkey',
      'public.company_memberships', array['membership_id', 'company_id'],
      array['id', 'company_id']),
    ('company_outlet_access_outlet_company_fkey',
      'public.outlets', array['outlet_id', 'company_id'],
      array['id', 'company_id'])
  ) as v(constraint_name, parent_table, child_columns, parent_columns)
)
select e.constraint_name,
  coalesce(
    c.contype = 'f' and c.convalidated and not c.condeferrable
    and c.confrelid = to_regclass(e.parent_table)
    and c.confdeltype = 'r' and c.confupdtype = 'r'
    and array(
      select a.attname::text
      from unnest(c.conkey) with ordinality k(attnum, position)
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
      order by k.position
    ) = e.child_columns
    and array(
      select a.attname::text
      from unnest(c.confkey) with ordinality k(attnum, position)
      join pg_attribute a on a.attrelid = c.confrelid and a.attnum = k.attnum
      order by k.position
    ) = e.parent_columns,
    false
  ) as company_boundary_enforced,
  pg_get_constraintdef(c.oid) as definition
from expected e
left join pg_constraint c
  on c.conrelid = 'public.company_outlet_access'::regclass
  and c.conname = e.constraint_name
order by e.constraint_name;

select count(*) = 3 as grant_identity_columns_all_not_null
from pg_attribute
where attrelid = 'public.company_outlet_access'::regclass
  and attname in ('membership_id', 'company_id', 'outlet_id')
  and attnotnull and not attisdropped;

select count(*) as invalid_cross_company_grant_count -- must be 0
from public.company_outlet_access a
left join public.company_memberships m on m.id = a.membership_id
left join public.outlets o on o.id = a.outlet_id
where m.id is null or o.id is null
  or a.company_id is distinct from m.company_id
  or a.company_id is distinct from o.company_id;

select
  a.attnotnull = false as company_id_still_nullable,
  c.convalidated and c.confdeltype = 'r'
    and c.confrelid = 'public.companies'::regclass as company_fk_restricts_delete,
  pg_get_constraintdef(c.oid) as definition
from pg_attribute a
join pg_constraint c on c.conrelid = a.attrelid
  and c.conname = 'outlets_company_id_fkey'
where a.attrelid = 'public.outlets'::regclass and a.attname = 'company_id';

-- 4. No-backfill expectations immediately after Phase 1A:
-- company/membership/platform/audit counts = 0; every outlet remains unassigned.
select
  (select count(*) from public.outlets) as total_outlets,
  (select count(*) from public.outlets where company_id is null) as unassigned_outlets,
  (select count(*) from public.companies) as company_count,
  (select count(*) from public.company_memberships) as membership_count,
  (select count(*) from public.company_memberships where is_active) as active_membership_count,
  (select count(*) from public.company_outlet_access) as branch_grant_count,
  (select count(*) from public.platform_users) as platform_user_count,
  (select count(*) from public.platform_users where platform_role = 'PLATFORM_ADMIN')
    as platform_admin_count,
  (select count(*) from public.platform_users
    where platform_role = 'PLATFORM_ADMIN' and is_active) as active_platform_admin_count,
  (select count(*) from public.control_plane_audit_events) as audit_event_count;

select c.id as company_id, c.code, count(m.id) as membership_count,
  count(m.id) filter (where m.is_active) as active_membership_count
from public.companies c
left join public.company_memberships m on m.company_id = c.id
group by c.id, c.code
order by c.code;

-- 5. No raw-table privileges for API roles (including inherited PUBLIC grants).
select r.role_name, t.table_name,
  has_table_privilege(r.role_name, t.table_name,
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_raw_privilege
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
cross join (values
  ('public.companies'), ('public.company_memberships'),
  ('public.company_outlet_access'), ('public.platform_users'),
  ('public.control_plane_audit_events')
) t(table_name)
order by r.role_name, t.table_name;

-- 6. Only authenticated has EXECUTE on the four public read RPCs.
select r.role_name, f.signature,
  has_function_privilege(r.role_name, f.signature, 'EXECUTE') as can_execute
from (values ('anon'), ('authenticated'), ('service_role')) r(role_name)
cross join (values
  ('public.get_my_platform_access()'), ('public.get_my_companies()'),
  ('public.get_my_company_outlets(uuid)'), ('public.get_my_company_memberships()')
) f(signature)
order by r.role_name, f.signature;

-- 7. Inspect owner/search_path/definer flags and the audit mutation trigger.
select p.oid::regprocedure as function_signature,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as fixed_configuration
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'private' and p.proname in (
    'is_platform_admin', 'current_company_membership',
    'can_view_company', 'can_access_company_outlet'
  )) or (n.nspname = 'public' and p.proname in (
    'get_my_platform_access', 'get_my_companies',
    'get_my_company_outlets', 'get_my_company_memberships'
  ))
order by p.oid::regprocedure::text;

select tgname, tgenabled, pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.control_plane_audit_events'::regclass
  and tgname = 'control_plane_audit_events_append_only';

commit;
