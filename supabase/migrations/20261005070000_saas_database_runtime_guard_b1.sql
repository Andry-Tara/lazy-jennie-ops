begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- PHASE 1
-- HARD GUARD B1
--
-- Adds SaaS subscription/module enforcement to confirmed
-- database authorization helpers while preserving the
-- existing operational role/location permission model.
--
-- LEGACY_UNMANAGED outlets remain allowed during rollout.
-- ============================================================


-- ============================================================
-- 1. SIMPLE BOOLEAN SAAS GATE
-- ============================================================

create or replace function private.saas_runtime_module_allowed(
  p_outlet_id uuid,
  p_operational_module_code text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

  select coalesce(
    (
      select
        s.access_allowed

      from private.saas_runtime_module_state(
        p_outlet_id,
        p_operational_module_code
      ) s

      limit 1
    ),
    false
  );

$function$;

revoke all
on function private.saas_runtime_module_allowed(
  uuid,
  text
)
from public, anon, authenticated;


-- ============================================================
-- 2. GENERIC LOCATION MODULE ACCESS
--
-- EXISTING:
-- permission
-- + outlet scope
--
-- NEW:
-- permission
-- + SaaS entitlement/enabled
-- + outlet scope
-- ============================================================

create or replace function private.can_access_location_module(
  p_module_code text,
  p_action text,
  p_outlet_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_outlet uuid;
begin

  if not private.has_module_permission(
    upper(
      trim(
        p_module_code
      )
    ),
    upper(
      trim(
        p_action
      )
    )
  ) then
    return false;
  end if;


  if p_outlet_id is null then
    return false;
  end if;


  -- Commercial subscription/module gate.
  -- LEGACY_UNMANAGED remains allowed by
  -- saas_runtime_module_state().
  if not private.saas_runtime_module_allowed(
    p_outlet_id,
    p_module_code
  ) then
    return false;
  end if;


  if private.is_global_role() then
    return true;
  end if;


  v_user_outlet :=
    private.current_outlet_id();


  return
    v_user_outlet is not null
    and v_user_outlet =
      p_outlet_id;

end;
$function$;


-- ============================================================
-- 3. GENERIC POST LOCATION MODULE
--
-- Preserve the old NULL-outlet behavior because several RPCs
-- intentionally perform their own "location required"
-- validation after this helper.
-- ============================================================

create or replace function private.can_post_location_module(
  p_module_code text,
  p_outlet_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_outlet uuid;
begin

  if not private.has_module_permission(
    upper(
      trim(
        p_module_code
      )
    ),
    'POST'
  ) then
    return false;
  end if;


  -- Only enforce commercial outlet state once an outlet
  -- has actually been supplied.
  if p_outlet_id is not null
     and not private.saas_runtime_module_allowed(
       p_outlet_id,
       p_module_code
     )
  then
    return false;
  end if;


  if private.is_global_role() then
    return true;
  end if;


  v_user_outlet :=
    private.current_outlet_id();


  if v_user_outlet is null then
    return false;
  end if;


  -- Preserve existing RPC validation semantics.
  if p_outlet_id is null then
    return true;
  end if;


  return
    v_user_outlet =
      p_outlet_id;

end;
$function$;


-- ============================================================
-- 4. SALES ROW ACCESS
--
-- SALES_HISTORY maps commercially to POS.
-- This prevents direct secure-view/API reads after POS access
-- expires or is disabled for a managed outlet.
-- ============================================================

create or replace function private.can_view_sales_row(
  p_outlet_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_role text;
  v_user_outlet uuid;
begin

  if not private.has_module_permission(
    'SALES_HISTORY',
    'VIEW'
  ) then
    return false;
  end if;


  if p_outlet_id is null then
    return false;
  end if;


  if not private.saas_runtime_module_allowed(
    p_outlet_id,
    'SALES_HISTORY'
  ) then
    return false;
  end if;


  v_role :=
    private.current_role_code();


  v_user_outlet :=
    private.current_outlet_id();


  if v_role in (
    'SUPER_ADMIN',
    'MANAGEMENT',
    'FINANCE'
  ) then
    return true;
  end if;


  if v_role in (
    'OUTLET_MANAGER',
    'CASHIER'
  ) then
    return
      v_user_outlet is not null
      and p_outlet_id =
        v_user_outlet;
  end if;


  return false;

end;
$function$;


-- ============================================================
-- 5. KITCHEN VIEW
--
-- IMPORTANT:
-- The old helper allowed Kitchen visibility through
-- can_view_sales_row().
--
-- We preserve that operational permission compatibility,
-- BUT only after KITCHEN itself passes the SaaS gate.
--
-- Therefore:
-- POS ON + KITCHEN OFF
-- cannot open KDS anymore.
-- ============================================================

create or replace function private.can_view_kitchen_row(
  p_outlet_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_user_outlet uuid;
begin

  if p_outlet_id is null then
    return false;
  end if;


  if not private.saas_runtime_module_allowed(
    p_outlet_id,
    'KITCHEN'
  ) then
    return false;
  end if;


  -- Preserve existing POS / Sales operational access.
  if private.can_view_sales_row(
    p_outlet_id
  ) then
    return true;
  end if;


  if not private.has_module_permission(
    'KITCHEN',
    'VIEW'
  ) then
    return false;
  end if;


  -- Existing restaurant operational KDS configuration
  -- remains a separate requirement.
  if not exists (
    select 1
    from public.outlet_app_profiles ap
    where ap.outlet_id =
      p_outlet_id
      and ap.is_active =
        true
      and ap.kds_enabled =
        true
  ) then
    return false;
  end if;


  if private.is_global_role() then
    return true;
  end if;


  v_user_outlet :=
    private.current_outlet_id();


  return
    v_user_outlet is not null
    and v_user_outlet =
      p_outlet_id;

end;
$function$;


-- ============================================================
-- 6. KITCHEN WRITE
--
-- Old operational compatibility:
-- POS POST OR KITCHEN POST
--
-- New commercial requirement:
-- KITCHEN must itself be enabled.
-- ============================================================

create or replace function private.can_post_kitchen_action(
  p_outlet_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$

  select

    p_outlet_id is not null

    and

    private.saas_runtime_module_allowed(
      p_outlet_id,
      'KITCHEN'
    )

    and

    (
      private.can_post_location_module(
        'POS',
        p_outlet_id
      )

      or

      private.can_post_location_module(
        'KITCHEN',
        p_outlet_id
      )
    );

$function$;


-- ============================================================
-- 7. PRIVILEGES
--
-- Preserve private-helper behavior: callable through owner/
-- SECURITY DEFINER dependencies, not directly exposed.
-- ============================================================

revoke all
on function private.can_access_location_module(
  text,
  text,
  uuid
)
from public;

revoke all
on function private.can_post_location_module(
  text,
  uuid
)
from public;

revoke all
on function private.can_view_sales_row(
  uuid
)
from public;

revoke all
on function private.can_view_kitchen_row(
  uuid
)
from public;

revoke all
on function private.can_post_kitchen_action(
  uuid
)
from public;


-- ============================================================
-- 8. POSTCHECK
-- ============================================================

do $check$
begin

  if to_regprocedure(
    'private.saas_runtime_module_allowed(uuid,text)'
  ) is null then
    raise exception
      'Missing SaaS runtime boolean gate';
  end if;

  if to_regprocedure(
    'private.can_access_location_module(text,text,uuid)'
  ) is null then
    raise exception
      'Missing location module helper';
  end if;

  if to_regprocedure(
    'private.can_post_location_module(text,uuid)'
  ) is null then
    raise exception
      'Missing post module helper';
  end if;

  if to_regprocedure(
    'private.can_view_sales_row(uuid)'
  ) is null then
    raise exception
      'Missing sales row helper';
  end if;

  if to_regprocedure(
    'private.can_view_kitchen_row(uuid)'
  ) is null then
    raise exception
      'Missing kitchen view helper';
  end if;

  if to_regprocedure(
    'private.can_post_kitchen_action(uuid)'
  ) is null then
    raise exception
      'Missing kitchen post helper';
  end if;

end;
$check$;

commit;
