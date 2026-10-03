-- PHASE 1B POSTCHECK - READ ONLY.
-- Paste the phase_1b_precheck.sql mapping_baseline JSON into every marked
-- literal below. Missing baseline produces NOT_VERIFIED, never a false PASS.
--
-- This verifies control-plane mapping only. Legacy operational helpers remain
-- authoritative and global roles may still have cross-outlet visibility. Do
-- not onboard an external/new tenant before future tenant enforcement.

begin transaction isolation level repeatable read read only;

-- A. Both reviewed company identities exist exactly once with exact names.
with expected(code, name) as (
  values
    ('RANGKA'::text, 'Rangka Cafe'::text),
    ('LAZYJENNIE'::text, 'Lazy Jennie'::text)
), checks as (
  select e.code, e.name,
    count(c.id) as match_count,
    count(c.id) filter (where c.code = e.code and c.name = e.name) as exact_count
  from expected e
  left join public.companies c on upper(btrim(c.code)) = e.code
  group by e.code, e.name
)
select
  'company_' || code as check_name,
  case when match_count = 1 and exact_count = 1 then 'PASS'
    else 'FAIL: expected one exact company identity' end as result,
  match_count
from checks
order by code;

select
  'company_set_exactly_RANGKA_and_LAZYJENNIE' as check_name,
  case when count(*) = 2
      and count(*) filter (where code in ('RANGKA', 'LAZYJENNIE')) = 2
    then 'PASS' else 'FAIL: unexpected or missing company record' end as result,
  count(*) as company_count
from public.companies;

-- B. The four exact outlet codes have exactly the reviewed ownership.
with expected(outlet_code, company_code) as (
  values
    ('RC-001'::text, 'RANGKA'::text),
    ('LJ-001'::text, 'LAZYJENNIE'::text),
    ('LJ-002'::text, 'LAZYJENNIE'::text),
    ('CK-LJ'::text, 'LAZYJENNIE'::text)
)
select
  'outlet_' || e.outlet_code as check_name,
  case
    when count(o.id) = 1
      and count(o.id) filter (where c.code = e.company_code) = 1 then 'PASS'
    else 'FAIL: missing, duplicate, or incorrectly owned outlet'
  end as result,
  count(o.id) as exact_code_match_count,
  max(c.code) as actual_company_code,
  e.company_code as expected_company_code
from expected e
left join public.outlets o on o.code::text = e.outlet_code
left join public.companies c on c.id = o.company_id
group by e.outlet_code, e.company_code
order by e.outlet_code;

-- C, G, H, I. Baseline-dependent preservation and no-silent-assignment checks.
with supplied as (
  select $phase1b_baseline$
{}
$phase1b_baseline$::jsonb as baseline -- REPLACE {} WITH PRECHECK JSON
), baseline_state as (
  select baseline,
    coalesce(
      baseline ->> 'baseline_version' = '1'
      and jsonb_typeof(baseline -> 'target_outlets') = 'array'
      and jsonb_typeof(baseline -> 'profiles') = 'array'
      and jsonb_typeof(baseline -> 'memberships') = 'array'
      and jsonb_typeof(baseline -> 'platform_users') = 'array'
      and jsonb_typeof(baseline -> 'legacy_helpers') = 'array',
      false
    ) as supplied_ok
  from supplied
), baseline_profiles as (
  select x.*
  from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'profiles'
      else '[]'::jsonb end)
    as x(id uuid, outlet_id uuid, role_id uuid, is_active boolean)
), baseline_memberships as (
  select x.*
  from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'memberships'
      else '[]'::jsonb end)
    as x(id uuid, profile_id uuid, company_id uuid)
), baseline_helpers as (
  select x.*
  from baseline_state b,
    jsonb_to_recordset(case when supplied_ok then baseline -> 'legacy_helpers'
      else '[]'::jsonb end)
    as x(signature text, definition_md5 text)
), current_target_outlets as (
  select coalesce(jsonb_agg(to_jsonb(o) - 'company_id' order by o.id), '[]'::jsonb) value
  from public.outlets o
  where o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
), current_profiles as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'outlet_id', p.outlet_id, 'role_id', p.role_id,
    'is_active', p.is_active
  ) order by p.id), '[]'::jsonb) value
  from public.profiles p
), ambiguous_new_memberships as (
  select count(*) as difference_count
  from baseline_profiles p
  left join public.roles r on r.id = p.role_id
  left join public.outlets o on o.id = p.outlet_id
  join public.company_memberships cm on cm.profile_id = p.id
  left join baseline_memberships old on old.id = cm.id
  where old.id is null
    and (
      p.outlet_id is null
      or r.code::text = 'SUPER_ADMIN'
      or o.id is null
      or o.code::text not in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
    )
), helper_changes as (
  select count(*) as difference_count
  from baseline_helpers h
  left join pg_proc p on p.oid = to_regprocedure(h.signature)
  where p.oid is null or h.definition_md5 is distinct from md5(pg_get_functiondef(p.oid))
), checks as (
  select 'target_outlet_operational_metadata_unchanged'::text as check_name,
    case when not b.supplied_ok then null
      else (b.baseline -> 'target_outlets') = c.value end as passed,
    null::bigint as difference_count
  from baseline_state b cross join current_target_outlets c
  union all
  select 'profile_home_role_and_active_state_unchanged',
    case when not b.supplied_ok then null
      else (b.baseline -> 'profiles') = p.value end,
    null::bigint
  from baseline_state b cross join current_profiles p
  union all
  select 'no_ambiguous_identity_silently_assigned',
    case when not b.supplied_ok then null else a.difference_count = 0 end,
    case when b.supplied_ok then a.difference_count else null end
  from baseline_state b cross join ambiguous_new_memberships a
  union all
  select 'platform_users_unchanged',
    case when not b.supplied_ok then null else
      (b.baseline -> 'platform_users') = coalesce((
        select jsonb_agg(to_jsonb(pu) order by pu.user_id)
        from public.platform_users pu
      ), '[]'::jsonb) end,
    null::bigint
  from baseline_state b
  union all
  select 'legacy_operational_helpers_unchanged',
    case when not b.supplied_ok or not exists (select 1 from baseline_helpers)
      then null else h.difference_count = 0 end,
    case when b.supplied_ok then h.difference_count else null end
  from baseline_state b cross join helper_changes h
)
select check_name,
  case when passed is null then 'NOT_VERIFIED: supply complete precheck baseline'
    when passed then 'PASS' else 'FAIL: investigate difference' end as result,
  difference_count
from checks
order by check_name;

-- D. Every eligible profile has exactly one expected home-company membership
-- and no membership in another company.
with resolved as (
  select
    p.id as profile_id,
    o.id as outlet_id,
    o.company_id,
    p.is_active,
    r.code::text as role_code,
    case when r.code::text = 'MANAGEMENT'
      then 'COMPANY_MANAGEMENT' else 'COMPANY_MEMBER' end as membership_role,
    case when r.code::text = 'MANAGEMENT'
      then 'ALL_BRANCHES' else 'ASSIGNED_BRANCHES' end as branch_scope
  from public.profiles p
  join public.outlets o on o.id = p.outlet_id
    and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
  left join public.roles r on r.id = p.role_id
  where r.code::text is distinct from 'SUPER_ADMIN'
), checks as (
  select r.*,
    count(cm.id) filter (where cm.company_id = r.company_id) as home_membership_count,
    count(cm.id) filter (where cm.company_id <> r.company_id) as other_membership_count,
    count(cm.id) filter (
      where cm.company_id = r.company_id
        and (cm.membership_role, cm.branch_scope, cm.is_active)
          = (r.membership_role, r.branch_scope, r.is_active)
    ) as exact_membership_count
  from resolved r
  left join public.company_memberships cm on cm.profile_id = r.profile_id
  group by r.profile_id, r.outlet_id, r.company_id, r.is_active, r.role_code,
    r.membership_role, r.branch_scope
)
select
  profile_id,
  role_code,
  membership_role as expected_membership_role,
  branch_scope as expected_branch_scope,
  case
    when home_membership_count = 1 and other_membership_count = 0
      and exact_membership_count = 1 then 'PASS'
    else 'FAIL: membership does not match resolved home company' end as result
from checks
order by profile_id;

-- E. ASSIGNED_BRANCHES has exactly its home grant; ALL_BRANCHES has no grants.
with mapped as (
  select cm.id as membership_id, cm.profile_id, cm.company_id, cm.branch_scope,
    p.outlet_id as home_outlet_id
  from public.company_memberships cm
  join public.profiles p on p.id = cm.profile_id
  join public.outlets o on o.id = p.outlet_id
    and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
  left join public.roles r on r.id = p.role_id
  where r.code::text is distinct from 'SUPER_ADMIN'
)
select
  m.profile_id,
  m.membership_id,
  m.branch_scope,
  case
    when m.branch_scope = 'ASSIGNED_BRANCHES'
      and count(a.outlet_id) = 1
      and count(a.outlet_id) filter (
        where a.company_id = m.company_id and a.outlet_id = m.home_outlet_id
      ) = 1 then 'PASS'
    when m.branch_scope = 'ALL_BRANCHES' and count(a.outlet_id) = 0 then 'PASS'
    else 'FAIL: branch grants do not match branch scope/home outlet'
  end as result
from mapped m
left join public.company_outlet_access a on a.membership_id = m.membership_id
group by m.profile_id, m.membership_id, m.company_id, m.branch_scope, m.home_outlet_id
order by m.profile_id;

-- F. Composite company boundaries must have no violating rows.
select
  'no_cross_company_outlet_access' as check_name,
  case when count(*) = 0 then 'PASS'
    else 'FAIL: cross-company or orphan grant exists' end as result,
  count(*) as anomaly_count
from public.company_outlet_access a
left join public.company_memberships m on m.id = a.membership_id
left join public.outlets o on o.id = a.outlet_id
where m.id is null or o.id is null
   or a.company_id is distinct from m.company_id
   or a.company_id is distinct from o.company_id;

-- Explicit unresolved mapping report. These rows are expected to stay
-- unassigned by Phase 1B unless they had a reviewed membership before it.
select
  p.id as profile_id,
  p.employee_code,
  p.full_name,
  p.is_active,
  r.code as role_code,
  p.outlet_id,
  o.code as outlet_code,
  case
    when p.outlet_id is null then 'UNRESOLVED: NULL home outlet'
    when o.id is null then 'UNRESOLVED: dangling/missing home outlet'
    when r.code::text = 'SUPER_ADMIN'
      then 'UNRESOLVED: legacy platform-like role'
    else 'UNRESOLVED: home outlet outside reviewed four-code map'
  end as result,
  count(cm.id) as current_membership_count
from public.profiles p
left join public.roles r on r.id = p.role_id
left join public.outlets o on o.id = p.outlet_id
left join public.company_memberships cm on cm.profile_id = p.id
where p.outlet_id is null
   or o.id is null
   or r.code::text = 'SUPER_ADMIN'
   or o.code::text not in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
group by p.id, p.employee_code, p.full_name, p.is_active, r.code,
  p.outlet_id, o.id, o.code
order by result, r.code, p.id;

-- J. Phase 1A closed-table RLS/policy/revoke posture remains intact.
with control_tables(table_name) as (
  values
    ('companies'::text), ('company_memberships'::text),
    ('company_outlet_access'::text), ('platform_users'::text),
    ('control_plane_audit_events'::text)
), table_checks as (
  select t.table_name,
    c.oid is not null and c.relrowsecurity and not c.relforcerowsecurity
      and (select count(*) from pg_policy p where p.polrelid = c.oid) = 0
      as structure_ok,
    not exists (
      select 1
      from (values ('anon'), ('authenticated'), ('service_role')) roles(role_name)
      where has_table_privilege(
        roles.role_name, 'public.' || t.table_name,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
      )
    ) as revokes_ok
  from control_tables t
  left join pg_class c on c.oid = to_regclass('public.' || t.table_name)
), rpc_checks as (
  select not exists (
    select 1
    from (values
      ('public.get_my_platform_access()'),
      ('public.get_my_companies()'),
      ('public.get_my_company_outlets(uuid)'),
      ('public.get_my_company_memberships()')
    ) f(signature)
    cross join (values
      ('anon', false), ('authenticated', true), ('service_role', false)
    ) r(role_name, expected_execute)
    where has_function_privilege(r.role_name, f.signature, 'EXECUTE')
      is distinct from r.expected_execute
  ) as grants_ok
)
select
  'phase_1a_rls_policies_and_revokes_intact' as check_name,
  case when bool_and(t.structure_ok and t.revokes_ok) and r.grants_ok then 'PASS'
    else 'FAIL: Phase 1A RLS, policy, table revoke, or RPC grant drift' end as result
from table_checks t cross join rpc_checks r
group by r.grants_ok;

-- Inspect exact composite constraint columns/parents as an additional assertion.
with expected(name, parent_table, child_columns, parent_columns) as (
  values
    ('company_outlet_access_membership_company_fkey'::text,
      'public.company_memberships'::text,
      array['membership_id', 'company_id']::text[], array['id', 'company_id']::text[]),
    ('company_outlet_access_outlet_company_fkey'::text,
      'public.outlets'::text,
      array['outlet_id', 'company_id']::text[], array['id', 'company_id']::text[])
), checks as (
  select e.name,
    c.contype = 'f' and c.convalidated and not c.condeferrable
      and c.confdeltype = 'r' and c.confupdtype = 'r'
      and c.confrelid = to_regclass(e.parent_table)
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
      ) = e.parent_columns as constraint_ok
  from expected e
  left join pg_constraint c
    on c.conrelid = 'public.company_outlet_access'::regclass
    and c.conname = e.name
)
select
  'phase_1a_composite_company_foreign_keys_intact' as check_name,
  case when count(*) = 2 and bool_and(constraint_ok)
    then 'PASS' else 'FAIL: composite company boundary constraint drift' end as result
from checks;

commit;
