-- PHASE 1 - ENTITLEMENT / EXPIRY SHADOW RESOLVER
--
-- READ-ONLY COMMERCIAL RESOLUTION.
--
-- IMPORTANT:
-- - NO operational authorization changes.
-- - NO POS / Waiter / Kitchen / Inventory blocking.
-- - NO modification of get_my_permissions().
-- - NO modification of existing KDS permission helpers.
--
-- This phase only answers:
--
--   Does this outlet's commercial subscription
--   currently allow this SaaS module?
--
-- Final enforcement later becomes:
--
--   existing operational permission
--   AND outlet access
--   AND SaaS entitlement
--
-- ============================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- INTERNAL RESOLVER
-- ============================================================

create function private.resolve_outlet_module_entitlement(
  p_outlet_id uuid,
  p_module_code text
)
returns table (
  company_id uuid,
  outlet_id uuid,

  requested_module_code text,
  module_exists boolean,
  module_active boolean,

  company_status text,
  outlet_active boolean,

  subscription_id uuid,
  stored_subscription_status text,
  effective_subscription_status text,

  package_id uuid,
  package_code text,
  package_name text,

  starts_at timestamptz,
  ends_at timestamptz,

  module_in_package boolean,

  allowed boolean,
  reason text
)
language sql
stable
set search_path = ''
as $function$

with base as (
  select
    o.company_id,
    o.id as outlet_id,

    upper(
      btrim(
        coalesce(
          p_module_code,
          ''
        )
      )
    ) as requested_module_code,

    m.id as module_id,
    m.status::text as module_status,

    c.status::text as company_status,
    o.is_active as outlet_active,

    s.id as subscription_id,
    s.status::text
      as stored_subscription_status,

    s.package_id,
    p.code::text as package_code,
    p.name::text as package_name,

    s.starts_at,
    s.ends_at,

    coalesce(
      exists (
        select 1
        from public.saas_package_modules pm
        where pm.package_id = s.package_id
          and pm.module_id = m.id
      ),
      false
    ) as module_in_package

  from public.outlets o

  join public.companies c
    on c.id = o.company_id

  left join public.saas_modules m
    on m.code = upper(
      btrim(
        coalesce(
          p_module_code,
          ''
        )
      )
    )

  left join lateral (
    select os.*
    from public.outlet_subscriptions os
    where os.outlet_id = o.id
    order by
      case
        when os.status = 'ACTIVE'
         and now() >= os.starts_at
         and now() < os.ends_at
          then 0

        when os.status = 'PENDING_PAYMENT'
         and now() < os.ends_at
          then 1

        when os.status = 'SUSPENDED'
         and now() < os.ends_at
          then 2

        when os.status = 'ACTIVE'
         and now() < os.starts_at
          then 3

        else 4
      end,
      os.ends_at desc,
      os.created_at desc

    limit 1
  ) s on true

  left join public.saas_packages p
    on p.id = s.package_id

  where o.id = p_outlet_id
),

effective as (
  select
    base.*,

    case
      when subscription_id is null
        then 'NO_SUBSCRIPTION'

      when stored_subscription_status = 'ACTIVE'
       and starts_at > now()
        then 'NOT_STARTED'

      when stored_subscription_status in (
        'ACTIVE',
        'PENDING_PAYMENT',
        'SUSPENDED'
      )
       and ends_at <= now()
        then 'EXPIRED'

      else stored_subscription_status
    end as effective_subscription_status

  from base
)

select
  company_id,
  outlet_id,

  requested_module_code,

  module_id is not null
    as module_exists,

  coalesce(
    module_status = 'ACTIVE',
    false
  ) as module_active,

  company_status,
  outlet_active,

  subscription_id,
  stored_subscription_status,
  effective_subscription_status,

  package_id,
  package_code,
  package_name,

  starts_at,
  ends_at,

  module_in_package,

  (
    company_status = 'ACTIVE'
    and outlet_active
    and module_id is not null
    and module_status = 'ACTIVE'
    and effective_subscription_status = 'ACTIVE'
    and module_in_package
  ) as allowed,

  case
    when company_status <> 'ACTIVE'
      then 'COMPANY_INACTIVE'

    when not outlet_active
      then 'OUTLET_INACTIVE'

    when module_id is null
      then 'MODULE_UNKNOWN'

    when module_status <> 'ACTIVE'
      then 'MODULE_INACTIVE'

    when subscription_id is null
      then 'NO_SUBSCRIPTION'

    when effective_subscription_status = 'NOT_STARTED'
      then 'SUBSCRIPTION_NOT_STARTED'

    when effective_subscription_status = 'PENDING_PAYMENT'
      then 'SUBSCRIPTION_PENDING_PAYMENT'

    when effective_subscription_status = 'SUSPENDED'
      then 'SUBSCRIPTION_SUSPENDED'

    when effective_subscription_status = 'CANCELLED'
      then 'SUBSCRIPTION_CANCELLED'

    when effective_subscription_status = 'EXPIRED'
      then 'SUBSCRIPTION_EXPIRED'

    when effective_subscription_status <> 'ACTIVE'
      then 'SUBSCRIPTION_NOT_ACTIVE'

    when not module_in_package
      then 'MODULE_NOT_INCLUDED'

    else 'ALLOWED'
  end as reason

from effective;

$function$;

comment on function private.resolve_outlet_module_entitlement(
  uuid,
  text
) is
  'Shadow-mode SaaS entitlement resolver. Does not enforce operational access.';

revoke all
on function private.resolve_outlet_module_entitlement(
  uuid,
  text
)
from public, anon, authenticated;

-- ============================================================
-- AUTHENTICATED OUTLET ENTITLEMENT READ
--
-- This is still diagnostic/read-only.
-- It respects the existing company/outlet access boundary.
-- ============================================================

create function public.get_my_outlet_module_entitlement(
  p_outlet_id uuid,
  p_module_code text
)
returns table (
  company_id uuid,
  outlet_id uuid,

  requested_module_code text,
  module_exists boolean,
  module_active boolean,

  company_status text,
  outlet_active boolean,

  subscription_id uuid,
  stored_subscription_status text,
  effective_subscription_status text,

  package_id uuid,
  package_code text,
  package_name text,

  starts_at timestamptz,
  ends_at timestamptz,

  module_in_package boolean,

  allowed boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;

  select o.company_id
  into v_company_id
  from public.outlets o
  where o.id = p_outlet_id;

  if not found then
    raise exception
      'Outlet not found'
      using errcode = 'P0002';
  end if;

  if
    not coalesce(
      private.is_platform_admin(),
      false
    )
    and not coalesce(
      private.can_access_company_outlet(
        v_company_id,
        p_outlet_id
      ),
      false
    )
  then
    raise exception
      'Outlet access denied'
      using errcode = '42501';
  end if;

  return query
  select *
  from private.resolve_outlet_module_entitlement(
    p_outlet_id,
    p_module_code
  );
end;
$function$;

revoke all
on function public.get_my_outlet_module_entitlement(
  uuid,
  text
)
from public, anon;

grant execute
on function public.get_my_outlet_module_entitlement(
  uuid,
  text
)
to authenticated;

-- ============================================================
-- PLATFORM ADMIN SHADOW MATRIX
--
-- Gives Platform Admin the complete package/module resolution
-- for one branch without changing application behavior.
-- ============================================================

create function public.platform_admin_get_outlet_entitlement_matrix(
  p_outlet_id uuid
)
returns table (
  company_id uuid,
  company_code text,
  company_name text,

  outlet_id uuid,
  outlet_code text,
  outlet_name text,

  package_code text,
  package_name text,

  stored_subscription_status text,
  effective_subscription_status text,

  starts_at timestamptz,
  ends_at timestamptz,

  module_code text,
  module_name text,

  allowed boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  if not exists (
    select 1
    from public.outlets o
    where o.id = p_outlet_id
  ) then
    raise exception
      'Outlet not found'
      using errcode = 'P0002';
  end if;

  return query

  select
    o.company_id,
    c.code::text,
    c.name::text,

    o.id,
    o.code::text,
    o.name::text,

    r.package_code,
    r.package_name,

    r.stored_subscription_status,
    r.effective_subscription_status,

    r.starts_at,
    r.ends_at,

    m.code::text,
    m.name::text,

    r.allowed,
    r.reason

  from public.saas_modules m

  cross join lateral
    private.resolve_outlet_module_entitlement(
      p_outlet_id,
      m.code
    ) r

  join public.outlets o
    on o.id = p_outlet_id

  join public.companies c
    on c.id = o.company_id

  order by
    m.sort_order,
    m.code;
end;
$function$;

revoke all
on function public.platform_admin_get_outlet_entitlement_matrix(
  uuid
)
from public, anon;

grant execute
on function public.platform_admin_get_outlet_entitlement_matrix(
  uuid
)
to authenticated;

commit;
