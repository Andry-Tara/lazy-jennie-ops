-- PHASE 1B: reviewed ownership/access mapping for the four existing locations.
-- Control-plane data only. This does not replace or modify operational access.
-- Legacy global operational roles may retain cross-outlet visibility until a
-- future tenant-enforcement phase. Do not onboard an external/new tenant first.
--
-- Mapping policy:
--   MANAGEMENT with a target home outlet -> COMPANY_MANAGEMENT / ALL_BRANCHES
--   every other non-SUPER_ADMIN profile with a target home outlet
--     -> COMPANY_MEMBER / ASSIGNED_BRANCHES plus its home-outlet grant
--   SUPER_ADMIN, NULL-outlet, and non-target-outlet profiles -> untouched
--
-- Run phase_1b_precheck.sql and review every UNRESOLVED row before deployment.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Keep the reviewed ownership/profile snapshot stable for the whole backfill.
lock table
  public.companies,
  public.outlets,
  public.profiles,
  public.roles,
  public.company_memberships,
  public.company_outlet_access
in share row exclusive mode;

-- Fail before writing if the reviewed company identities are ambiguous.
do $phase1b$
declare
  v_code text;
  v_name text;
  v_count bigint;
begin
  for v_code, v_name in
    select * from (values
      ('RANGKA'::text, 'Rangka Cafe'::text),
      ('LAZYJENNIE'::text, 'Lazy Jennie'::text)
    ) expected(code, name)
  loop
    select count(*) into v_count
    from public.companies c
    where upper(btrim(c.code)) = v_code;

    if v_count > 1 then
      raise exception 'Phase 1B: company code % has % normalized matches', v_code, v_count
        using errcode = '23505';
    end if;

    if v_count = 1 and not exists (
      select 1
      from public.companies c
      where upper(btrim(c.code)) = v_code
        and c.code = v_code
        and c.name = v_name
    ) then
      raise exception 'Phase 1B: company code % exists with unexpected code or name', v_code
        using errcode = '23514';
    end if;
  end loop;

  select count(*) into v_count
  from public.companies c
  where upper(btrim(c.code)) not in ('RANGKA', 'LAZYJENNIE');

  if v_count <> 0 then
    raise exception 'Phase 1B: found % company records outside the reviewed RANGKA/LAZYJENNIE set',
      v_count using errcode = '23514';
  end if;
end;
$phase1b$;

insert into public.companies (code, name)
select expected.code, expected.name
from (values
  ('RANGKA'::text, 'Rangka Cafe'::text),
  ('LAZYJENNIE'::text, 'Lazy Jennie'::text)
) expected(code, name)
where not exists (
  select 1
  from public.companies c
  where upper(btrim(c.code)) = expected.code
);

-- Every reviewed outlet code must resolve once and only once. Existing
-- ownership is accepted only when it already matches the reviewed company.
do $phase1b$
declare
  v_outlet_code text;
  v_company_code text;
  v_count bigint;
  v_conflicts bigint;
begin
  for v_outlet_code, v_company_code in
    select * from (values
      ('RC-001'::text, 'RANGKA'::text),
      ('LJ-001'::text, 'LAZYJENNIE'::text),
      ('LJ-002'::text, 'LAZYJENNIE'::text),
      ('CK-LJ'::text, 'LAZYJENNIE'::text)
    ) expected(outlet_code, company_code)
  loop
    select count(*) into v_count
    from public.outlets o
    where o.code::text = v_outlet_code;

    if v_count <> 1 then
      raise exception 'Phase 1B: required outlet code % matched % rows; expected exactly 1',
        v_outlet_code, v_count using errcode = '23514';
    end if;

    select count(*) into v_conflicts
    from public.outlets o
    join public.companies expected_company
      on expected_company.code = v_company_code
    where o.code::text = v_outlet_code
      and o.company_id is not null
      and o.company_id <> expected_company.id;

    if v_conflicts <> 0 then
      raise exception 'Phase 1B: outlet % already belongs to an unexpected company',
        v_outlet_code using errcode = '23514';
    end if;
  end loop;
end;
$phase1b$;

with expected(outlet_code, company_code) as (
  values
    ('RC-001'::text, 'RANGKA'::text),
    ('LJ-001'::text, 'LAZYJENNIE'::text),
    ('LJ-002'::text, 'LAZYJENNIE'::text),
    ('CK-LJ'::text, 'LAZYJENNIE'::text)
)
update public.outlets o
set company_id = c.id
from expected e
join public.companies c on c.code = e.company_code
where o.code::text = e.outlet_code
  and o.company_id is null;

-- Reject incompatible pre-existing mappings. Re-applying an already-complete
-- migration is safe; it never rewrites membership semantics.
do $phase1b$
declare
  v_conflict record;
begin
  with resolved as (
    select
      p.id as profile_id,
      p.is_active,
      o.id as outlet_id,
      o.company_id,
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
  )
  select r.profile_id, 'membership for another company'::text as reason
    into v_conflict
  from resolved r
  join public.company_memberships cm on cm.profile_id = r.profile_id
  where cm.company_id <> r.company_id
  limit 1;

  if found then
    raise exception 'Phase 1B: profile % has conflicting existing %',
      v_conflict.profile_id, v_conflict.reason using errcode = '23514';
  end if;

  with resolved as (
    select
      p.id as profile_id,
      p.is_active,
      o.id as outlet_id,
      o.company_id,
      case when r.code::text = 'MANAGEMENT'
        then 'COMPANY_MANAGEMENT' else 'COMPANY_MEMBER' end as membership_role,
      case when r.code::text = 'MANAGEMENT'
        then 'ALL_BRANCHES' else 'ASSIGNED_BRANCHES' end as branch_scope
    from public.profiles p
    join public.outlets o on o.id = p.outlet_id
      and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
    left join public.roles r on r.id = p.role_id
    where r.code::text is distinct from 'SUPER_ADMIN'
  )
  select r.profile_id, 'membership semantics'::text as reason
    into v_conflict
  from resolved r
  join public.company_memberships cm
    on cm.profile_id = r.profile_id and cm.company_id = r.company_id
  where (cm.membership_role, cm.branch_scope, cm.is_active) is distinct from
    (r.membership_role, r.branch_scope, r.is_active)
  limit 1;

  if found then
    raise exception 'Phase 1B: profile % has conflicting existing %',
      v_conflict.profile_id, v_conflict.reason using errcode = '23514';
  end if;

  with resolved as (
    select p.id as profile_id, o.id as outlet_id, o.company_id,
      case when r.code::text = 'MANAGEMENT'
        then 'ALL_BRANCHES' else 'ASSIGNED_BRANCHES' end as branch_scope
    from public.profiles p
    join public.outlets o on o.id = p.outlet_id
      and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
    left join public.roles r on r.id = p.role_id
    where r.code::text is distinct from 'SUPER_ADMIN'
  )
  select r.profile_id, 'non-home or unnecessary outlet grant'::text as reason
    into v_conflict
  from resolved r
  join public.company_memberships cm
    on cm.profile_id = r.profile_id and cm.company_id = r.company_id
  join public.company_outlet_access coa on coa.membership_id = cm.id
  where r.branch_scope = 'ALL_BRANCHES'
     or coa.outlet_id <> r.outlet_id
     or coa.company_id <> r.company_id
  limit 1;

  if found then
    raise exception 'Phase 1B: profile % has conflicting existing %',
      v_conflict.profile_id, v_conflict.reason using errcode = '23514';
  end if;
end;
$phase1b$;

with resolved as (
  select
    p.id as profile_id,
    o.company_id,
    p.is_active,
    case when r.code::text = 'MANAGEMENT'
      then 'COMPANY_MANAGEMENT' else 'COMPANY_MEMBER' end as membership_role,
    case when r.code::text = 'MANAGEMENT'
      then 'ALL_BRANCHES' else 'ASSIGNED_BRANCHES' end as branch_scope
  from public.profiles p
  join public.outlets o on o.id = p.outlet_id
    and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
  left join public.roles r on r.id = p.role_id
  where r.code::text is distinct from 'SUPER_ADMIN'
)
insert into public.company_memberships (
  profile_id, company_id, membership_role, branch_scope, is_active
)
select profile_id, company_id, membership_role, branch_scope, is_active
from resolved
on conflict (profile_id, company_id) do nothing;

with resolved as (
  select p.id as profile_id, o.id as outlet_id, o.company_id
  from public.profiles p
  join public.outlets o on o.id = p.outlet_id
    and o.code::text in ('RC-001', 'LJ-001', 'LJ-002', 'CK-LJ')
  left join public.roles r on r.id = p.role_id
  where r.code::text is distinct from 'SUPER_ADMIN'
    and r.code::text is distinct from 'MANAGEMENT'
)
insert into public.company_outlet_access (membership_id, company_id, outlet_id)
select cm.id, r.company_id, r.outlet_id
from resolved r
join public.company_memberships cm
  on cm.profile_id = r.profile_id and cm.company_id = r.company_id
on conflict (membership_id, outlet_id) do nothing;

commit;
