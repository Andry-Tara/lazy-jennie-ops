-- PHASE 1D
-- Platform Admin first commercial action:
-- Assign Package / Create Subscription per outlet.
--
-- Scope:
-- - POS_ONLY commercial display becomes Sales Only.
-- - Add INVENTORY module.
-- - POS_COMPLETE includes INVENTORY.
-- - Add reviewed Platform Admin RPC for initial outlet subscription creation.
--
-- NO operational entitlement enforcement yet.
-- NO POS / Waiter / KDS authorization changes.
-- NO renewal flow yet.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- COMMERCIAL CATALOG UPDATE
-- ============================================================

insert into public.saas_modules (
  code,
  name,
  description,
  status,
  sort_order
)
select
  'INVENTORY',
  'Inventory',
  'Inventory stock, movement, receiving, transfer, opname and waste operations.',
  'ACTIVE',
  50
where not exists (
  select 1
  from public.saas_modules
  where code = 'INVENTORY'
);

-- Attendance implementation is still a later product phase.
update public.saas_modules
set
  sort_order = 60,
  updated_at = now()
where code = 'ATTENDANCE'
  and sort_order <> 60;

-- Keep immutable technical code POS_ONLY.
-- Only change commercial display copy.
update public.saas_packages
set
  name = 'Sales Only',
  description = 'Core sales package for cashier transactions, orders, payment, receipt and basic sales operations.',
  updated_at = now()
where code = 'POS_ONLY';

update public.saas_packages
set
  description = 'Complete restaurant operations package including sales, waiter ordering, kitchen display, reports and inventory.',
  updated_at = now()
where code = 'POS_COMPLETE';

-- Add INVENTORY to POS_COMPLETE.
insert into public.saas_package_modules (
  package_id,
  module_id
)
select
  p.id,
  m.id
from public.saas_packages p
join public.saas_modules m
  on m.code = 'INVENTORY'
where p.code = 'POS_COMPLETE'
  and not exists (
    select 1
    from public.saas_package_modules pm
    where pm.package_id = p.id
      and pm.module_id = m.id
  );

-- ============================================================
-- PLATFORM ADMIN: CREATE INITIAL OUTLET SUBSCRIPTION
-- ============================================================

create function public.platform_admin_create_outlet_subscription(
  p_outlet_id uuid,
  p_package_id uuid,
  p_starts_on date,
  p_duration_months integer,
  p_notes text default null
)
returns table (
  subscription_id uuid,
  subscription_status text,
  starts_at timestamptz,
  ends_at timestamptz,
  package_code text,
  package_name text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor_user_id uuid;
  v_company_id uuid;
  v_company_status text;
  v_outlet_timezone text;
  v_outlet_active boolean;

  v_package_code text;
  v_package_name text;
  v_package_status text;

  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_subscription_id uuid;
begin
  perform private.require_platform_admin();

  v_actor_user_id := auth.uid();

  if v_actor_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if p_outlet_id is null then
    raise exception 'Outlet is required'
      using errcode = '22023';
  end if;

  if p_package_id is null then
    raise exception 'Package is required'
      using errcode = '22023';
  end if;

  if p_starts_on is null then
    raise exception 'Subscription start date is required'
      using errcode = '22023';
  end if;

  if p_duration_months is null
     or p_duration_months < 1
     or p_duration_months > 36 then
    raise exception 'Duration must be between 1 and 36 months'
      using errcode = '22023';
  end if;

  -- Resolve outlet and owning company.
  select
    o.company_id,
    c.status,
    coalesce(nullif(btrim(o.timezone::text), ''), 'Asia/Jakarta'),
    o.is_active
  into
    v_company_id,
    v_company_status,
    v_outlet_timezone,
    v_outlet_active
  from public.outlets o
  join public.companies c
    on c.id = o.company_id
  where o.id = p_outlet_id;

  if not found then
    raise exception 'Outlet not found'
      using errcode = 'P0002';
  end if;

  if not v_outlet_active then
    raise exception 'Cannot subscribe an inactive outlet'
      using errcode = '23514';
  end if;

  if v_company_status is distinct from 'ACTIVE' then
    raise exception 'Cannot subscribe an outlet under an inactive company'
      using errcode = '23514';
  end if;

  -- Resolve commercial package.
  select
    p.code,
    p.name,
    p.status
  into
    v_package_code,
    v_package_name,
    v_package_status
  from public.saas_packages p
  where p.id = p_package_id;

  if not found then
    raise exception 'Package not found'
      using errcode = 'P0002';
  end if;

  if v_package_status is distinct from 'ACTIVE' then
    raise exception 'Package is not active'
      using errcode = '23514';
  end if;

  -- Commercial dates are interpreted in the outlet timezone.
  v_starts_at :=
    p_starts_on::timestamp
    at time zone v_outlet_timezone;

  v_ends_at :=
    (
      p_starts_on::timestamp
      + make_interval(months => p_duration_months)
    )
    at time zone v_outlet_timezone;

  -- Phase 1D is initial assignment only.
  -- Do not create overlapping live commercial terms.
  if exists (
    select 1
    from public.outlet_subscriptions s
    where s.outlet_id = p_outlet_id
      and s.status in (
        'PENDING_PAYMENT',
        'ACTIVE',
        'SUSPENDED'
      )
      and tstzrange(
        s.starts_at,
        s.ends_at,
        '[)'
      ) && tstzrange(
        v_starts_at,
        v_ends_at,
        '[)'
      )
  ) then
    raise exception
      'Outlet already has an overlapping subscription'
      using errcode = '23505';
  end if;

  insert into public.outlet_subscriptions (
    company_id,
    outlet_id,
    package_id,
    status,
    starts_at,
    ends_at,
    activated_at,
    notes,
    created_by,
    updated_by
  )
  values (
    v_company_id,
    p_outlet_id,
    p_package_id,
    'ACTIVE',
    v_starts_at,
    v_ends_at,
    now(),
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_actor_user_id,
    v_actor_user_id
  )
  returning id
  into v_subscription_id;

  insert into public.control_plane_audit_events (
    actor_user_id,
    company_id,
    outlet_id,
    event_type,
    target_type,
    target_id,
    metadata
  )
  values (
    v_actor_user_id,
    v_company_id,
    p_outlet_id,
    'OUTLET_SUBSCRIPTION_CREATED',
    'OUTLET_SUBSCRIPTION',
    v_subscription_id,
    jsonb_build_object(
      'package_id', p_package_id,
      'package_code', v_package_code,
      'package_name', v_package_name,
      'duration_months', p_duration_months,
      'starts_at', v_starts_at,
      'ends_at', v_ends_at,
      'status', 'ACTIVE'
    )
  );

  return query
  select
    v_subscription_id,
    'ACTIVE'::text,
    v_starts_at,
    v_ends_at,
    v_package_code,
    v_package_name;
end;
$function$;

revoke all
on function public.platform_admin_create_outlet_subscription(
  uuid,
  uuid,
  date,
  integer,
  text
)
from public, anon;

grant execute
on function public.platform_admin_create_outlet_subscription(
  uuid,
  uuid,
  date,
  integer,
  text
)
to authenticated;

-- ============================================================
-- POSTCHECK
-- ============================================================

do $verify$
declare
  v_inventory_count integer;
  v_complete_inventory_count integer;
  v_sales_only_name text;
begin
  select count(*)
  into v_inventory_count
  from public.saas_modules
  where code = 'INVENTORY'
    and status = 'ACTIVE';

  if v_inventory_count <> 1 then
    raise exception
      'Expected exactly one active INVENTORY module, got %',
      v_inventory_count
      using errcode = '23514';
  end if;

  select count(*)
  into v_complete_inventory_count
  from public.saas_package_modules pm
  join public.saas_packages p
    on p.id = pm.package_id
  join public.saas_modules m
    on m.id = pm.module_id
  where p.code = 'POS_COMPLETE'
    and m.code = 'INVENTORY';

  if v_complete_inventory_count <> 1 then
    raise exception
      'POS_COMPLETE must include INVENTORY exactly once'
      using errcode = '23514';
  end if;

  select name
  into v_sales_only_name
  from public.saas_packages
  where code = 'POS_ONLY';

  if v_sales_only_name is distinct from 'Sales Only' then
    raise exception
      'POS_ONLY commercial name must be Sales Only'
      using errcode = '23514';
  end if;
end;
$verify$;

commit;
