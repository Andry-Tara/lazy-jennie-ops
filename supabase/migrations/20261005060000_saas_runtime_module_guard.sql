begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.saas_commercial_module_code(
  p_operational_module_code text
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select
    case upper(
      btrim(
        coalesce(
          p_operational_module_code,
          ''
        )
      )
    )
      when 'POS'
        then 'POS'

      when 'SALES_HISTORY'
        then 'POS'

      when 'WAITER'
        then 'WAITER'

      when 'KITCHEN'
        then 'KITCHEN'

      when 'REPORTS'
        then 'REPORTS'

      when 'SALES_REPORT'
        then 'REPORTS'

      when 'INVENTORY'
        then 'INVENTORY'

      when 'INVENTORY_VALUATION'
        then 'INVENTORY'

      when 'RECEIVING'
        then 'INVENTORY'

      when 'STOCK_TRANSFER'
        then 'INVENTORY'

      when 'STOCK_OPNAME'
        then 'INVENTORY'

      when 'WASTE'
        then 'INVENTORY'

      when 'ATTENDANCE'
        then 'ATTENDANCE'

      else null
    end;
$function$;

revoke all
on function private.saas_commercial_module_code(text)
from public, anon, authenticated;


create function private.saas_runtime_module_state(
  p_outlet_id uuid,
  p_operational_module_code text
)
returns table (
  commercial_module_code text,
  managed_by_saas boolean,
  access_allowed boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_commercial_code text;
  v_managed boolean;
  v_allowed boolean;
  v_reason text;
begin
  if p_outlet_id is null then
    return query
    select
      null::text,
      false,
      false,
      'OUTLET_REQUIRED'::text;
    return;
  end if;

  if not exists (
    select 1
    from public.outlets o
    where o.id = p_outlet_id
      and o.is_active = true
  ) then
    return query
    select
      null::text,
      false,
      false,
      'OUTLET_INACTIVE_OR_NOT_FOUND'::text;
    return;
  end if;

  v_commercial_code :=
    private.saas_commercial_module_code(
      p_operational_module_code
    );

  if v_commercial_code is null then
    return query
    select
      null::text,
      false,
      true,
      'MODULE_NOT_COMMERCIALIZED'::text;
    return;
  end if;

  select exists (
    select 1
    from public.outlet_subscriptions s
    where s.outlet_id = p_outlet_id
  )
  into v_managed;

  if not v_managed then
    return query
    select
      v_commercial_code,
      false,
      true,
      'LEGACY_UNMANAGED'::text;
    return;
  end if;

  select
    r.access_allowed,
    r.reason
  into
    v_allowed,
    v_reason
  from private.resolve_outlet_module_access(
    p_outlet_id,
    v_commercial_code
  ) r;

  return query
  select
    v_commercial_code,
    true,
    coalesce(
      v_allowed,
      false
    ),
    coalesce(
      v_reason,
      'ACCESS_DENIED'
    );
end;
$function$;

revoke all
on function private.saas_runtime_module_state(
  uuid,
  text
)
from public, anon, authenticated;


create function public.get_my_runtime_module_outlets(
  p_module_code text
)
returns table (
  company_id uuid,
  company_code text,
  company_name text,

  outlet_id uuid,
  outlet_code text,
  outlet_name text,

  commercial_module_code text,
  managed_by_saas boolean,
  access_allowed boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;

  return query

  select
    o.company_id,
    c.code::text,
    c.name::text,

    o.id,
    o.code::text,
    o.name::text,

    runtime.commercial_module_code,
    runtime.managed_by_saas,
    runtime.access_allowed,
    runtime.reason

  from public.outlets o

  join public.companies c
    on c.id = o.company_id

  cross join lateral
    private.saas_runtime_module_state(
      o.id,
      p_module_code
    ) runtime

  where o.is_active = true

    and private.can_access_company_outlet(
      o.company_id,
      o.id
    )

  order by
    c.name,
    o.name;
end;
$function$;

revoke all
on function public.get_my_runtime_module_outlets(text)
from public, anon;

grant execute
on function public.get_my_runtime_module_outlets(text)
to authenticated;

comment on function public.get_my_runtime_module_outlets(text) is
  'Runtime SaaS module gate. Existing outlets without subscription remain legacy-unmanaged during controlled rollout.';

commit;
