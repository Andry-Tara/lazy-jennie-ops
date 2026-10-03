-- PHASE 1C.2
-- Seed reviewed SaaS commercial catalog.
--
-- NO outlet subscription assignment.
-- NO entitlement enforcement.
-- NO operational authorization changes.
--
-- Module catalog:
--   POS
--   WAITER
--   KITCHEN
--   REPORTS
--   ATTENDANCE
--
-- Package catalog:
--   POS_ONLY
--   POS_COMPLETE
--   ATTENDANCE_ONLY
--
-- Prices are intentionally zero placeholders until commercial pricing
-- is explicitly reviewed.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- GUARD
-- Catalog must still be empty before this initial seed.
-- ============================================================

do $$
begin
  if exists (select 1 from public.saas_modules)
     or exists (select 1 from public.saas_packages)
     or exists (select 1 from public.saas_package_modules) then

    raise exception
      'Initial SaaS catalog seed requires empty catalog tables'
      using errcode = '23514';
  end if;
end;
$$;

-- ============================================================
-- MODULES
-- ============================================================

insert into public.saas_modules (
  code,
  name,
  description,
  status,
  sort_order
)
values
  (
    'POS',
    'POS',
    'Point of Sale transaction and cashier operation module.',
    'ACTIVE',
    10
  ),
  (
    'WAITER',
    'Waiter',
    'Table ordering and waiter order-entry module.',
    'ACTIVE',
    20
  ),
  (
    'KITCHEN',
    'Kitchen Display',
    'Kitchen Display System and kitchen order workflow module.',
    'ACTIVE',
    30
  ),
  (
    'REPORTS',
    'Reports',
    'Operational sales, transaction and management reporting module.',
    'ACTIVE',
    40
  ),
  (
    'ATTENDANCE',
    'Attendance',
    'Employee attendance module. Operational implementation may be introduced separately.',
    'ACTIVE',
    50
  );

-- ============================================================
-- PACKAGES
--
-- default_price = 0 intentionally.
-- Actual commercial pricing is configured later.
-- ============================================================

insert into public.saas_packages (
  code,
  name,
  description,
  status,
  billing_cycle,
  default_price,
  currency
)
values
  (
    'POS_ONLY',
    'POS Only',
    'Core POS package for an outlet requiring cashier sales operation.',
    'ACTIVE',
    'MONTHLY',
    0,
    'IDR'
  ),
  (
    'POS_COMPLETE',
    'POS Complete',
    'Complete restaurant POS package including waiter ordering, kitchen display and reports.',
    'ACTIVE',
    'MONTHLY',
    0,
    'IDR'
  ),
  (
    'ATTENDANCE_ONLY',
    'Attendance Only',
    'Standalone employee attendance package.',
    'ACTIVE',
    'MONTHLY',
    0,
    'IDR'
  );

-- ============================================================
-- PACKAGE COMPOSITION
-- ============================================================

-- POS_ONLY
insert into public.saas_package_modules (
  package_id,
  module_id
)
select
  p.id,
  m.id
from public.saas_packages p
join public.saas_modules m
  on m.code = 'POS'
where p.code = 'POS_ONLY';

-- POS_COMPLETE
insert into public.saas_package_modules (
  package_id,
  module_id
)
select
  p.id,
  m.id
from public.saas_packages p
cross join public.saas_modules m
where p.code = 'POS_COMPLETE'
  and m.code in (
    'POS',
    'WAITER',
    'KITCHEN',
    'REPORTS'
  );

-- ATTENDANCE_ONLY
insert into public.saas_package_modules (
  package_id,
  module_id
)
select
  p.id,
  m.id
from public.saas_packages p
join public.saas_modules m
  on m.code = 'ATTENDANCE'
where p.code = 'ATTENDANCE_ONLY';

-- ============================================================
-- VERIFY EXACT SEED
-- ============================================================

do $$
declare
  v_module_count integer;
  v_package_count integer;
  v_mapping_count integer;
begin
  select count(*)
  into v_module_count
  from public.saas_modules;

  select count(*)
  into v_package_count
  from public.saas_packages;

  select count(*)
  into v_mapping_count
  from public.saas_package_modules;

  if v_module_count <> 5 then
    raise exception
      'Expected 5 SaaS modules, got %',
      v_module_count
      using errcode = '23514';
  end if;

  if v_package_count <> 3 then
    raise exception
      'Expected 3 SaaS packages, got %',
      v_package_count
      using errcode = '23514';
  end if;

  -- POS_ONLY        = 1
  -- POS_COMPLETE    = 4
  -- ATTENDANCE_ONLY = 1
  -- Total           = 6
  if v_mapping_count <> 6 then
    raise exception
      'Expected 6 package-module mappings, got %',
      v_mapping_count
      using errcode = '23514';
  end if;
end;
$$;

commit;
