begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- ECOSUITE
-- PHASE 1 - HARD GUARD B2
--
-- Final confirmed runtime gaps:
--
-- 1. Direct controlled POS sale RPC
-- 2. Waiter secure read views
--
-- Existing Waiter/Restaurant write RPCs already route through
-- private.can_post_location_module(), which B1 SaaS-gates.
--
-- Inventory secure views already route through
-- private.can_access_location_module(), also SaaS-gated by B1.
-- ============================================================


-- ============================================================
-- 1. DIRECT POS SALE HARD GUARD
--
-- Keep the existing Sales Only vs Inventory routing exactly
-- as-is. Add only the POS entitlement/enabled guard.
--
-- IMPORTANT:
-- Inventory is NOT required for POS.
-- ============================================================

create or replace function public.create_posted_sale_controlled(
  p_outlet_id uuid,
  p_sale_date date,
  p_payment_method text,
  p_service_amount numeric,
  p_tax_amount numeric,
  p_notes text,
  p_items jsonb,
  p_override_stock boolean default false,
  p_override_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_sale_id uuid;

  v_sales_only boolean :=
    false;

begin

  -- ========================================================
  -- POS RUNTIME ACCESS
  -- ========================================================

  if not private.can_post_location_module(
    'POS',
    p_outlet_id
  ) then

    raise exception
      'Unauthorized POS transaction';

  end if;


  -- ========================================================
  -- OPERATION PROFILE
  -- ========================================================

  select
    (
      op.profile_code = 'SALES_ONLY'
      and
      op.inventory_enabled = false
    )

  into v_sales_only

  from public.outlet_operation_profiles op

  where op.outlet_id =
    p_outlet_id;


  v_sales_only :=
    coalesce(
      v_sales_only,
      false
    );


  -- ========================================================
  -- SALES ONLY
  --
  -- Inventory disabled remains valid.
  -- POS sale must continue without stock dependency.
  -- ========================================================

  if v_sales_only then

    select
      private.create_posted_sale_sales_only(
        p_outlet_id,
        p_sale_date,
        p_payment_method,

        coalesce(
          p_service_amount,
          0
        ),

        coalesce(
          p_tax_amount,
          0
        ),

        p_notes,
        p_items
      )

    into v_sale_id;


    return
      v_sale_id;

  end if;


  -- ========================================================
  -- FULL INVENTORY / COGS ENGINE
  --
  -- Existing behavior unchanged.
  -- ========================================================

  select
    public.create_posted_sale(
      p_outlet_id,
      p_sale_date,
      p_payment_method,

      0::numeric,

      coalesce(
        p_service_amount,
        0
      ),

      coalesce(
        p_tax_amount,
        0
      ),

      p_notes,
      p_items,

      coalesce(
        p_override_stock,
        false
      ),

      p_override_reason
    )

  into v_sale_id;


  return
    v_sale_id;

end;
$function$;


-- ============================================================
-- 2. WAITER OUTLET READ GATE
--
-- Preserve:
-- - existing waiter location authorization
-- - waiter_mode_enabled operational config
--
-- Add:
-- - SaaS WAITER entitlement + enabled state
-- ============================================================

create or replace view public.waiter_outlets_secure
as

select
  o.id,
  o.code,
  o.name

from public.outlets o

where o.is_active = true

  and o.type::text =
    'OUTLET'::text

  and private.saas_runtime_module_allowed(
    o.id,
    'WAITER'
  )

  and private.can_view_waiter_location(
    o.id
  )

  and exists (
    select 1

    from public.outlet_app_profiles ap

    where ap.outlet_id =
      o.id

      and ap.is_active =
        true

      and ap.waiter_mode_enabled =
        true
  );


-- ============================================================
-- 3. WAITER TABLE READ GATE
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
    select count(*)::integer

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

  and o.is_active =
    true

  and o.type::text =
    'OUTLET'::text

  and private.saas_runtime_module_allowed(
    t.outlet_id,
    'WAITER'
  )

  and private.can_view_waiter_location(
    t.outlet_id
  )

  and exists (
    select 1

    from public.outlet_app_profiles ap

    where ap.outlet_id =
      t.outlet_id

      and ap.is_active =
        true

      and ap.waiter_mode_enabled =
        true
  );


-- ============================================================
-- 4. POSTCHECK
-- ============================================================

do $check$
declare
  v_sale_definition text;
  v_waiter_outlets text;
  v_waiter_tables text;
begin

  select pg_get_functiondef(
    'public.create_posted_sale_controlled(uuid,date,text,numeric,numeric,text,jsonb,boolean,text)'::regprocedure
  )
  into v_sale_definition;


  if position(
    'can_post_location_module'
    in v_sale_definition
  ) = 0 then

    raise exception
      'POS controlled sale SaaS gate missing';

  end if;


  select pg_get_viewdef(
    'public.waiter_outlets_secure'::regclass,
    true
  )
  into v_waiter_outlets;


  if position(
    'saas_runtime_module_allowed'
    in v_waiter_outlets
  ) = 0 then

    raise exception
      'Waiter outlet SaaS gate missing';

  end if;


  select pg_get_viewdef(
    'public.waiter_table_map_secure'::regclass,
    true
  )
  into v_waiter_tables;


  if position(
    'saas_runtime_module_allowed'
    in v_waiter_tables
  ) = 0 then

    raise exception
      'Waiter table SaaS gate missing';

  end if;


  if not has_function_privilege(
    'authenticated',
    'public.create_posted_sale_controlled(uuid,date,text,numeric,numeric,text,jsonb,boolean,text)',
    'EXECUTE'
  ) then

    raise exception
      'Controlled POS sale authenticated grant missing';

  end if;


  if has_function_privilege(
    'anon',
    'public.create_posted_sale_controlled(uuid,date,text,numeric,numeric,text,jsonb,boolean,text)',
    'EXECUTE'
  ) then

    raise exception
      'Anonymous controlled POS execution must remain denied';

  end if;


  if not has_table_privilege(
    'authenticated',
    'public.waiter_outlets_secure',
    'SELECT'
  ) then

    raise exception
      'Authenticated waiter outlet read missing';

  end if;


  if not has_table_privilege(
    'authenticated',
    'public.waiter_table_map_secure',
    'SELECT'
  ) then

    raise exception
      'Authenticated waiter table read missing';

  end if;

end;
$check$;


commit;
