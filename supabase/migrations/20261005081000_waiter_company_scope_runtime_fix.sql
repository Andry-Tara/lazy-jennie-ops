begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- ECOSUITE
-- WAITER COMPANY-SCOPE RUNTIME FIX
--
-- Problem:
-- Company/global owner may correctly have profiles.outlet_id NULL.
--
-- SaaS route access already uses:
--   private.can_access_company_outlet()
--
-- Legacy waiter secure views still used:
--   private.can_view_waiter_location()
--
-- Result:
-- route allowed, but branch selector empty.
--
-- Fix:
-- use the new company/outlet boundary while preserving:
-- - WAITER role permission
-- - SaaS entitlement + enabled state
-- - operational waiter_mode_enabled
-- ============================================================


create or replace function private.can_view_waiter_runtime(
  p_outlet_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
begin

  if auth.uid() is null then
    return false;
  end if;


  if p_outlet_id is null then
    return false;
  end if;


  select
    o.company_id
  into
    v_company_id

  from public.outlets o

  where o.id =
    p_outlet_id

    and o.is_active =
      true

    and o.type::text =
      'OUTLET'::text;


  if not found then
    return false;
  end if;


  -- Existing role / permission matrix.
  if not private.has_module_permission(
    'WAITER',
    'VIEW'
  ) then
    return false;
  end if;


  -- Company / branch access.
  --
  -- This supports:
  -- - branch user -> assigned/allowed branch
  -- - company owner -> all branches in own company
  -- without forcing profiles.outlet_id.
  if not private.can_access_company_outlet(
    v_company_id,
    p_outlet_id
  ) then
    return false;
  end if;


  -- Commercial entitlement + module toggle.
  if not private.saas_runtime_module_allowed(
    p_outlet_id,
    'WAITER'
  ) then
    return false;
  end if;


  -- Existing restaurant operational setting.
  if not private.waiter_mode_enabled(
    p_outlet_id
  ) then
    return false;
  end if;


  return true;

end;
$function$;


revoke all
on function private.can_view_waiter_runtime(uuid)
from public, anon;


-- ============================================================
-- WAITER OUTLETS
-- ============================================================

create or replace view public.waiter_outlets_secure
as

select
  o.id,
  o.code,
  o.name

from public.outlets o

where private.can_view_waiter_runtime(
  o.id
);


-- ============================================================
-- WAITER TABLE MAP
-- ============================================================

create or replace view public.waiter_table_map_secure
as

select
  t.id,
  t.outlet_id,

  o.code
    as outlet_code,

  o.name
    as outlet_name,

  t.code,
  t.name,
  t.capacity,

  t.status,
  t.is_active,
  t.qr_token,

  active_order.id
    as active_order_id,

  active_order.order_no
    as active_order_no,

  active_order.status
    as active_order_status,

  active_order.payment_status
    as active_payment_status,

  active_order.grand_total
    as active_order_total,

  active_order.opened_at
    as active_order_opened_at,

  (
    select
      count(*)::integer

    from public.restaurant_orders ro_count

    where ro_count.table_id =
      t.id

      and ro_count.payment_status
        is distinct from 'PAID'::text

      and ro_count.status
        is distinct from 'CANCELLED'::text
  )
    as active_order_count

from public.restaurant_tables t

join public.outlets o
  on o.id =
    t.outlet_id

left join lateral (
  select
    ro.id,
    ro.order_no,
    ro.status,
    ro.payment_status,
    ro.grand_total,
    ro.opened_at

  from public.restaurant_orders ro

  where ro.table_id =
    t.id

    and ro.payment_status
      is distinct from 'PAID'::text

    and ro.status
      is distinct from 'CANCELLED'::text

  order by
    ro.opened_at desc

  limit 1

) active_order
  on true

where t.is_active =
  true

  and private.can_view_waiter_runtime(
    t.outlet_id
  );


-- ============================================================
-- PRESERVE APP READ GRANTS
-- ============================================================

revoke all
on public.waiter_outlets_secure
from anon;

revoke all
on public.waiter_table_map_secure
from anon;

grant select
on public.waiter_outlets_secure
to authenticated;

grant select
on public.waiter_table_map_secure
to authenticated;


-- ============================================================
-- POSTCHECK
-- ============================================================

do $check$
declare
  v_outlet_definition text;
  v_table_definition text;
begin

  if to_regprocedure(
    'private.can_view_waiter_runtime(uuid)'
  ) is null then
    raise exception
      'Waiter runtime helper missing';
  end if;


  select pg_get_viewdef(
    'public.waiter_outlets_secure'::regclass,
    true
  )
  into v_outlet_definition;


  if position(
    'can_view_waiter_runtime'
    in v_outlet_definition
  ) = 0 then
    raise exception
      'waiter_outlets_secure runtime gate missing';
  end if;


  select pg_get_viewdef(
    'public.waiter_table_map_secure'::regclass,
    true
  )
  into v_table_definition;


  if position(
    'can_view_waiter_runtime'
    in v_table_definition
  ) = 0 then
    raise exception
      'waiter_table_map_secure runtime gate missing';
  end if;


  if not has_table_privilege(
    'authenticated',
    'public.waiter_outlets_secure',
    'SELECT'
  ) then
    raise exception
      'Authenticated waiter outlet SELECT missing';
  end if;


  if not has_table_privilege(
    'authenticated',
    'public.waiter_table_map_secure',
    'SELECT'
  ) then
    raise exception
      'Authenticated waiter table SELECT missing';
  end if;

end;
$check$;

commit;
