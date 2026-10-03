-- ============================================================
-- PHASE 1B PRECHECK
-- Existing Company / Outlet / Membership Mapping
--
-- READ ONLY
--
-- Purpose:
-- - Inspect current production state BEFORE Phase 1B migration.
-- - Validate the two reviewed companies and four reviewed outlets.
-- - Show deterministic vs unresolved profile mappings.
-- - Inspect existing control-plane rows.
-- - Detect cross-company anomalies.
-- - Capture legacy helper hashes for preservation.
-- - Produce one exportable result set.
--
-- This query DOES NOT:
-- - create/update/delete data
-- - apply migrations
-- - backfill companies
-- - create memberships
-- - create branch grants
-- - provision platform users
-- - change operational permissions
-- ============================================================

with

-- ============================================================
-- 1. REVIEWED BUSINESS MAPPING
-- ============================================================

target_companies(code, expected_name) as (
  values
    ('RANGKA'::text, 'Rangka Cafe'::text),
    ('LAZYJENNIE'::text, 'Lazy Jennie'::text)
),

target_outlets(outlet_code, expected_company_code) as (
  values
    ('RC-001'::text, 'RANGKA'::text),
    ('LJ-001'::text, 'LAZYJENNIE'::text),
    ('LJ-002'::text, 'LAZYJENNIE'::text),
    ('CK-LJ'::text, 'LAZYJENNIE'::text)
),

legacy_helper_signatures(signature) as (
  values
    ('private.can_access_location_module(text,text,uuid)'::text),
    ('private.can_post_location_module(text,uuid)'::text),
    ('private.can_view_sales_row(uuid)'::text),
    ('private.current_role_code()'::text),
    ('private.is_global_role()'::text)
),


-- ============================================================
-- 2. TARGET COMPANY CHECK
-- ============================================================

company_check as (
  select
    tc.code,
    tc.expected_name,

    count(c.id) as match_count,

    max(c.id::text) as existing_company_id,
    max(c.name::text) as existing_name,
    max(c.status::text) as existing_status,

    case
      when count(c.id) = 0 then
        'ABSENT_READY_CREATE'

      when count(c.id) = 1
       and max(c.name::text) = tc.expected_name then
        'ALREADY_PRESENT_MATCH'

      when count(c.id) = 1 then
        'CODE_COLLISION_REVIEW'

      else
        'DUPLICATE_CODE_BLOCKER'
    end as status

  from target_companies tc

  left join public.companies c
    on upper(trim(c.code::text)) = tc.code

  group by
    tc.code,
    tc.expected_name
),


-- ============================================================
-- 3. TARGET OUTLET CHECK
-- ============================================================

outlet_check as (
  select
    t.outlet_code,
    t.expected_company_code,

    count(o.id) as match_count,

    count(o.id) filter (
      where o.company_id is null
    ) as unassigned_match_count,

    count(o.id) filter (
      where existing_company.code::text = t.expected_company_code
    ) as expected_owner_match_count,

    case
      when count(o.id) = 0 then
        'MISSING_OUTLET_BLOCKER'

      when count(o.id) > 1 then
        'DUPLICATE_OUTLET_CODE_BLOCKER'

      when count(o.id) = 1
       and count(o.id) filter (
         where o.company_id is null
       ) = 1 then
        'READY_UNASSIGNED'

      when count(o.id) = 1
       and count(o.id) filter (
         where existing_company.code::text = t.expected_company_code
       ) = 1 then
        'ALREADY_CORRECT'

      else
        'OWNERSHIP_CONFLICT_BLOCKER'
    end as status,

    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'code', o.code,
          'name', o.name,
          'type', o.type,
          'company_id', o.company_id,
          'existing_company_code', existing_company.code,
          'existing_company_name', existing_company.name,
          'is_active', o.is_active
        )
        order by o.id
      ) filter (
        where o.id is not null
      ),
      '[]'::jsonb
    ) as matches

  from target_outlets t

  left join public.outlets o
    on o.code::text = t.outlet_code

  left join public.companies existing_company
    on existing_company.id = o.company_id

  group by
    t.outlet_code,
    t.expected_company_code
),


-- ============================================================
-- 4. PROFILE MAPPING ANALYSIS
--
-- Rules:
--
-- SUPER_ADMIN
--   -> unresolved
--
-- NULL outlet
--   -> unresolved
--
-- non-target outlet
--   -> unmapped
--
-- MANAGEMENT on target outlet
--   -> COMPANY_MANAGEMENT / ALL_BRANCHES
--
-- other target-outlet role
--   -> COMPANY_MEMBER / ASSIGNED_BRANCHES
--      + home outlet grant
-- ============================================================

profile_mapping as (
  select
    p.id as profile_id,

    p.full_name,
    p.email,

    p.is_active as profile_is_active,

    p.role_id,
    r.code::text as role_code,

    p.outlet_id,
    o.code::text as home_outlet_code,
    o.name::text as home_outlet_name,

    t.expected_company_code as target_company_code,

    case
      when r.code::text = 'SUPER_ADMIN' then
        'UNRESOLVED_SUPER_ADMIN'

      when p.outlet_id is null then
        'UNRESOLVED_NULL_OUTLET'

      when p.outlet_id is not null
       and o.id is null then
        'UNRESOLVED_MISSING_HOME_OUTLET'

      when r.id is null then
        'UNRESOLVED_MISSING_ROLE'

      when t.outlet_code is null then
        'UNMAPPED_NON_TARGET_OUTLET'

      else
        'AUTO_MAP'
    end as mapping_status,

    case
      when r.code::text = 'SUPER_ADMIN' then null

      when p.outlet_id is null then null

      when o.id is null then null

      when r.id is null then null

      when t.outlet_code is null then null

      when r.code::text = 'MANAGEMENT' then
        'COMPANY_MANAGEMENT'

      else
        'COMPANY_MEMBER'
    end as proposed_membership_role,

    case
      when r.code::text = 'SUPER_ADMIN' then null

      when p.outlet_id is null then null

      when o.id is null then null

      when r.id is null then null

      when t.outlet_code is null then null

      when r.code::text = 'MANAGEMENT' then
        'ALL_BRANCHES'

      else
        'ASSIGNED_BRANCHES'
    end as proposed_branch_scope,

    case
      when r.code::text = 'SUPER_ADMIN' then null

      when p.outlet_id is null then null

      when o.id is null then null

      when r.id is null then null

      when t.outlet_code is null then null

      when r.code::text = 'MANAGEMENT' then null

      else
        o.code::text
    end as proposed_home_branch_grant,

    jsonb_build_object(
      'is_super_admin',
      coalesce(r.code::text = 'SUPER_ADMIN', false),

      'has_null_outlet',
      p.outlet_id is null,

      'is_target_outlet',
      t.outlet_code is not null,

      'existing_outlet_company_id',
      o.company_id
    ) as mapping_evidence

  from public.profiles p

  left join public.roles r
    on r.id = p.role_id

  left join public.outlets o
    on o.id = p.outlet_id

  left join target_outlets t
    on t.outlet_code = o.code::text
),


-- ============================================================
-- 5. EXISTING MEMBERSHIP STATE
-- ============================================================

existing_memberships as (
  select
    cm.id as membership_id,

    cm.profile_id,

    p.full_name,
    p.email,

    cm.company_id,
    c.code::text as company_code,
    c.name::text as company_name,

    cm.membership_role,
    cm.branch_scope,
    cm.is_active,

    cm.created_at,
    cm.updated_at

  from public.company_memberships cm

  left join public.profiles p
    on p.id = cm.profile_id

  left join public.companies c
    on c.id = cm.company_id
),


-- ============================================================
-- 6. EXISTING BRANCH ACCESS
-- ============================================================

existing_branch_access as (
  select
    coa.membership_id,

    coa.company_id,
    c.code::text as company_code,

    coa.outlet_id,
    o.code::text as outlet_code,
    o.name::text as outlet_name,

    cm.profile_id,

    coa.created_at

  from public.company_outlet_access coa

  left join public.company_memberships cm
    on cm.id = coa.membership_id

  left join public.companies c
    on c.id = coa.company_id

  left join public.outlets o
    on o.id = coa.outlet_id
),


-- ============================================================
-- 7. CROSS-COMPANY ANOMALIES
-- ============================================================

cross_company_anomalies as (
  select
    coa.membership_id,

    coa.company_id as access_company_id,

    cm.company_id as membership_company_id,

    coa.outlet_id,

    o.company_id as outlet_company_id,

    cm.profile_id,

    o.code::text as outlet_code,

    case
      when cm.id is null then
        'MISSING_MEMBERSHIP'

      when o.id is null then
        'MISSING_OUTLET'

      when coa.company_id is distinct from cm.company_id then
        'ACCESS_MEMBERSHIP_COMPANY_MISMATCH'

      when coa.company_id is distinct from o.company_id then
        'ACCESS_OUTLET_COMPANY_MISMATCH'

      else
        'UNKNOWN'
    end as anomaly

  from public.company_outlet_access coa

  left join public.company_memberships cm
    on cm.id = coa.membership_id

  left join public.outlets o
    on o.id = coa.outlet_id

  where cm.id is null
     or o.id is null
     or coa.company_id is distinct from cm.company_id
     or coa.company_id is distinct from o.company_id
),


-- ============================================================
-- 8. LEGACY HELPER HASHES
-- ============================================================

helper_check as (
  select
    h.signature,

    p.oid,

    case
      when p.oid is null then
        'MISSING_BLOCKER'
      else
        'PRESENT'
    end as status,

    case
      when p.oid is null then null
      else md5(
        pg_get_functiondef(p.oid)
      )
    end as definition_md5

  from legacy_helper_signatures h

  left join pg_proc p
    on p.oid = to_regprocedure(h.signature)
),


-- ============================================================
-- 9. PHASE 1A CONTROL-PLANE COUNTS
-- ============================================================

control_plane_counts as (
  select
    (select count(*) from public.companies)
      as company_count,

    (select count(*) from public.company_memberships)
      as membership_count,

    (select count(*) from public.company_outlet_access)
      as branch_grant_count,

    (select count(*) from public.platform_users)
      as platform_user_count,

    (select count(*) from public.control_plane_audit_events)
      as audit_event_count
),


-- ============================================================
-- 10. BASELINE PAYLOAD
--
-- Save/export this row.
-- We will use it for Phase 1B postcheck.
-- ============================================================

baseline_payload as (
  select
    jsonb_build_object(

      'baseline_version',
      'phase_1b_v1',

      'captured_at',
      transaction_timestamp(),

      'target_outlets',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'code', o.code,
              'name', o.name,
              'type', o.type,
              'address', o.address,
              'phone', o.phone,
              'timezone', o.timezone,
              'is_active', o.is_active,
              'company_id', o.company_id
            )
            order by o.code
          )

          from public.outlets o

          where o.code::text in (
            'RC-001',
            'LJ-001',
            'LJ-002',
            'CK-LJ'
          )
        ),
        '[]'::jsonb
      ),

      'profiles',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'role_id', p.role_id,
              'outlet_id', p.outlet_id,
              'is_active', p.is_active
            )
            order by p.id
          )

          from public.profiles p
        ),
        '[]'::jsonb
      ),

      'legacy_helpers',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'signature', h.signature,
              'definition_md5', h.definition_md5
            )
            order by h.signature
          )

          from helper_check h
        ),
        '[]'::jsonb
      ),

      'existing_companies',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'code', c.code,
              'name', c.name,
              'status', c.status
            )
            order by c.code
          )

          from public.companies c
        ),
        '[]'::jsonb
      ),

      'existing_memberships',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', m.membership_id,
              'profile_id', m.profile_id,
              'company_id', m.company_id,
              'membership_role', m.membership_role,
              'branch_scope', m.branch_scope,
              'is_active', m.is_active
            )
            order by m.membership_id
          )

          from existing_memberships m
        ),
        '[]'::jsonb
      ),

      'existing_branch_access',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'membership_id', a.membership_id,
              'company_id', a.company_id,
              'outlet_id', a.outlet_id
            )
            order by
              a.membership_id,
              a.outlet_id
          )

          from existing_branch_access a
        ),
        '[]'::jsonb
      ),

      'existing_platform_users',
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'user_id', pu.user_id,
              'platform_role', pu.platform_role,
              'is_active', pu.is_active
            )
            order by pu.user_id
          )

          from public.platform_users pu
        ),
        '[]'::jsonb
      )

    ) as baseline
),


-- ============================================================
-- 11. SUMMARY STATUS
-- ============================================================

summary_row as (
  select
    case
      when exists (
        select 1
        from company_check
        where status in (
          'CODE_COLLISION_REVIEW',
          'DUPLICATE_CODE_BLOCKER'
        )
      )
      then 'BLOCKED_COMPANY_COLLISION'

      when exists (
        select 1
        from outlet_check
        where status in (
          'MISSING_OUTLET_BLOCKER',
          'DUPLICATE_OUTLET_CODE_BLOCKER',
          'OWNERSHIP_CONFLICT_BLOCKER'
        )
      )
      then 'BLOCKED_OUTLET_MAPPING'

      when exists (
        select 1
        from cross_company_anomalies
      )
      then 'BLOCKED_CROSS_COMPANY_ANOMALY'

      else 'READY_FOR_REVIEW'
    end as status,

    jsonb_build_object(

      'target_company_count',
      (
        select count(*)
        from target_companies
      ),

      'target_outlet_count',
      (
        select count(*)
        from target_outlets
      ),

      'target_outlets_ready_or_correct',
      (
        select count(*)
        from outlet_check
        where status in (
          'READY_UNASSIGNED',
          'ALREADY_CORRECT'
        )
      ),

      'profiles_total',
      (
        select count(*)
        from profile_mapping
      ),

      'profiles_auto_map',
      (
        select count(*)
        from profile_mapping
        where mapping_status = 'AUTO_MAP'
      ),

      'profiles_unresolved',
      (
        select count(*)
        from profile_mapping
        where mapping_status like 'UNRESOLVED_%'
      ),

      'profiles_non_target_unmapped',
      (
        select count(*)
        from profile_mapping
        where mapping_status = 'UNMAPPED_NON_TARGET_OUTLET'
      ),

      'existing_company_count',
      cpc.company_count,

      'existing_membership_count',
      cpc.membership_count,

      'existing_branch_grant_count',
      cpc.branch_grant_count,

      'existing_platform_user_count',
      cpc.platform_user_count,

      'existing_audit_event_count',
      cpc.audit_event_count,

      'cross_company_anomaly_count',
      (
        select count(*)
        from cross_company_anomalies
      ),

      'missing_legacy_helper_count',
      (
        select count(*)
        from helper_check
        where status <> 'PRESENT'
      )

    ) as details

  from control_plane_counts cpc
),


-- ============================================================
-- 12. FINAL EXPORT ROWS
-- ============================================================

rows as (

  -- --------------------------------------------------------
  -- SUMMARY
  -- --------------------------------------------------------

  select
    '00_SUMMARY'::text
      as section,

    s.status::text
      as status,

    'phase_1b_precheck'::text
      as object_key,

    s.details
      as details

  from summary_row s


  union all


  -- --------------------------------------------------------
  -- TARGET COMPANIES
  -- --------------------------------------------------------

  select
    '10_TARGET_COMPANIES',

    c.status,

    c.code,

    jsonb_build_object(
      'expected_name', c.expected_name,
      'match_count', c.match_count,
      'existing_company_id', c.existing_company_id,
      'existing_name', c.existing_name,
      'existing_status', c.existing_status
    )

  from company_check c


  union all


  -- --------------------------------------------------------
  -- TARGET OUTLETS
  -- --------------------------------------------------------

  select
    '20_TARGET_OUTLETS',

    o.status,

    o.outlet_code,

    jsonb_build_object(
      'expected_company_code', o.expected_company_code,
      'match_count', o.match_count,
      'unassigned_match_count', o.unassigned_match_count,
      'expected_owner_match_count', o.expected_owner_match_count,
      'matches', o.matches
    )

  from outlet_check o


  union all


  -- --------------------------------------------------------
  -- ALL PROFILE MAPPING DECISIONS
  -- --------------------------------------------------------

  select
    '30_PROFILE_MAPPING',

    p.mapping_status,

    p.profile_id::text,

    jsonb_build_object(
      'full_name', p.full_name,
      'email', p.email,
      'profile_is_active', p.profile_is_active,
      'role_id', p.role_id,
      'role_code', p.role_code,
      'outlet_id', p.outlet_id,
      'home_outlet_code', p.home_outlet_code,
      'home_outlet_name', p.home_outlet_name,
      'target_company_code', p.target_company_code,
      'proposed_membership_role', p.proposed_membership_role,
      'proposed_branch_scope', p.proposed_branch_scope,
      'proposed_home_branch_grant', p.proposed_home_branch_grant,
      'mapping_evidence', p.mapping_evidence
    )

  from profile_mapping p


  union all


  -- --------------------------------------------------------
  -- ONLY UNRESOLVED IDENTITIES
  -- --------------------------------------------------------

  select
    '31_UNRESOLVED_IDENTITIES',

    p.mapping_status,

    p.profile_id::text,

    jsonb_build_object(
      'full_name', p.full_name,
      'email', p.email,
      'role_code', p.role_code,
      'outlet_id', p.outlet_id,
      'home_outlet_code', p.home_outlet_code,
      'reason', p.mapping_status
    )

  from profile_mapping p

  where p.mapping_status like 'UNRESOLVED_%'


  union all


  -- --------------------------------------------------------
  -- EXISTING MEMBERSHIPS
  -- --------------------------------------------------------

  select
    '40_EXISTING_MEMBERSHIPS',

    'EXISTING',

    m.membership_id::text,

    jsonb_build_object(
      'profile_id', m.profile_id,
      'full_name', m.full_name,
      'email', m.email,
      'company_id', m.company_id,
      'company_code', m.company_code,
      'company_name', m.company_name,
      'membership_role', m.membership_role,
      'branch_scope', m.branch_scope,
      'is_active', m.is_active
    )

  from existing_memberships m


  union all


  -- --------------------------------------------------------
  -- EXISTING BRANCH ACCESS
  -- --------------------------------------------------------

  select
    '41_EXISTING_BRANCH_ACCESS',

    'EXISTING',

    concat(
      a.membership_id::text,
      ':',
      a.outlet_id::text
    ),

    jsonb_build_object(
      'membership_id', a.membership_id,
      'profile_id', a.profile_id,
      'company_id', a.company_id,
      'company_code', a.company_code,
      'outlet_id', a.outlet_id,
      'outlet_code', a.outlet_code,
      'outlet_name', a.outlet_name
    )

  from existing_branch_access a


  union all


  -- --------------------------------------------------------
  -- EXISTING PLATFORM USERS
  -- --------------------------------------------------------

  select
    '42_EXISTING_PLATFORM_USERS',

    case
      when pu.is_active then
        'ACTIVE'
      else
        'INACTIVE'
    end,

    pu.user_id::text,

    jsonb_build_object(
      'platform_role', pu.platform_role,
      'is_active', pu.is_active,
      'created_at', pu.created_at,
      'updated_at', pu.updated_at
    )

  from public.platform_users pu


  union all


  -- --------------------------------------------------------
  -- CONTROL PLANE COUNTS
  -- --------------------------------------------------------

  select
    '43_CONTROL_PLANE_COUNTS',

    'INFO',

    'current_counts',

    jsonb_build_object(
      'company_count', cpc.company_count,
      'membership_count', cpc.membership_count,
      'branch_grant_count', cpc.branch_grant_count,
      'platform_user_count', cpc.platform_user_count,
      'audit_event_count', cpc.audit_event_count
    )

  from control_plane_counts cpc


  union all


  -- --------------------------------------------------------
  -- CROSS-COMPANY ANOMALIES
  -- --------------------------------------------------------

  select
    '50_CROSS_COMPANY_ANOMALIES',

    'BLOCKER',

    concat(
      coalesce(a.membership_id::text, 'NULL'),
      ':',
      coalesce(a.outlet_id::text, 'NULL')
    ),

    jsonb_build_object(
      'anomaly', a.anomaly,
      'profile_id', a.profile_id,
      'access_company_id', a.access_company_id,
      'membership_company_id', a.membership_company_id,
      'outlet_company_id', a.outlet_company_id,
      'outlet_id', a.outlet_id,
      'outlet_code', a.outlet_code
    )

  from cross_company_anomalies a


  union all


  -- --------------------------------------------------------
  -- LEGACY HELPERS
  -- --------------------------------------------------------

  select
    '60_LEGACY_HELPERS',

    h.status,

    h.signature,

    jsonb_build_object(
      'definition_md5', h.definition_md5
    )

  from helper_check h


  union all


  -- --------------------------------------------------------
  -- BASELINE FOR POSTCHECK
  -- --------------------------------------------------------

  select
    '90_BASELINE_JSON',

    'SAVE_FOR_POSTCHECK',

    'phase_1b_baseline',

    b.baseline

  from baseline_payload b
)

select
  section,
  status,
  object_key,
  details

from rows

order by
  section,
  object_key,
  status;