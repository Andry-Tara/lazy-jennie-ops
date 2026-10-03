-- PHASE 1C.3
-- Platform Admin read API.
--
-- No operational entitlement enforcement.
-- No subscription mutation yet.
-- Raw control-plane / SaaS tables stay closed.
-- Authenticated browser access is only through guarded SECURITY DEFINER RPCs.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- GUARD
-- ============================================================

create function private.require_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.is_platform_admin() then
    raise exception 'Platform administrator access required'
      using errcode = '42501';
  end if;
end;
$function$;

-- ============================================================
-- OVERVIEW
-- ============================================================

create function public.platform_admin_get_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  perform private.require_platform_admin();

  select jsonb_build_object(
    'companies',
      (select count(*) from public.companies),

    'outlets',
      (select count(*) from public.outlets
       where company_id is not null),

    'modules',
      (select count(*) from public.saas_modules),

    'packages',
      (select count(*) from public.saas_packages),

    'subscriptions',
      (select count(*) from public.outlet_subscriptions),

    'active_subscriptions',
      (
        select count(*)
        from public.outlet_subscriptions
        where status = 'ACTIVE'
      ),

    'pending_payments',
      (
        select count(*)
        from public.subscription_payments
        where status = 'PENDING'
      ),

    'confirmed_payments',
      (
        select count(*)
        from public.subscription_payments
        where status = 'CONFIRMED'
      ),

    'platform_users',
      (select count(*) from public.platform_users)
  )
  into v_result;

  return v_result;
end;
$function$;

-- ============================================================
-- COMPANIES
-- ============================================================

create function public.platform_admin_list_companies()
returns table (
  id uuid,
  code text,
  name text,
  legal_name text,
  status text,
  timezone text,
  currency text,
  outlet_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    c.id,
    c.code,
    c.name,
    c.legal_name,
    c.status,
    c.timezone,
    c.currency,

    (
      select count(*)
      from public.outlets o
      where o.company_id = c.id
    ) as outlet_count,

    c.created_at,
    c.updated_at

  from public.companies c

  order by c.name, c.id;
end;
$function$;

-- ============================================================
-- OUTLETS
-- ============================================================

create function public.platform_admin_list_outlets()
returns table (
  id uuid,
  company_id uuid,
  company_code text,
  company_name text,
  code text,
  name text,
  type text,
  timezone text,
  is_active boolean,
  current_subscription_id uuid,
  current_subscription_status text,
  current_package_code text,
  current_package_name text,
  subscription_starts_at timestamptz,
  subscription_ends_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    o.id,
    o.company_id,
    c.code,
    c.name,
    o.code::text,
    o.name::text,
    o.type::text,
    o.timezone::text,
    o.is_active,

    s.id,
    s.status,
    p.code,
    p.name,
    s.starts_at,
    s.ends_at

  from public.outlets o

  join public.companies c
    on c.id = o.company_id

  left join lateral (
    select os.*
    from public.outlet_subscriptions os
    where os.outlet_id = o.id
    order by
      case os.status
        when 'ACTIVE' then 0
        when 'PENDING_PAYMENT' then 1
        when 'SUSPENDED' then 2
        when 'EXPIRED' then 3
        when 'CANCELLED' then 4
        else 5
      end,
      os.ends_at desc,
      os.created_at desc
    limit 1
  ) s on true

  left join public.saas_packages p
    on p.id = s.package_id

  order by c.name, o.name, o.id;
end;
$function$;

-- ============================================================
-- MODULES
-- ============================================================

create function public.platform_admin_list_modules()
returns table (
  id uuid,
  code text,
  name text,
  description text,
  status text,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    m.id,
    m.code,
    m.name,
    m.description,
    m.status,
    m.sort_order,
    m.created_at,
    m.updated_at

  from public.saas_modules m

  order by m.sort_order, m.code;
end;
$function$;

-- ============================================================
-- PACKAGES + MODULE COMPOSITION
-- ============================================================

create function public.platform_admin_list_packages()
returns table (
  id uuid,
  code text,
  name text,
  description text,
  status text,
  billing_cycle text,
  default_price numeric,
  currency text,
  modules jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    p.id,
    p.code,
    p.name,
    p.description,
    p.status,
    p.billing_cycle,
    p.default_price,
    p.currency,

    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', m.id,
            'code', m.code,
            'name', m.name,
            'status', m.status
          )
          order by m.sort_order, m.code
        )

        from public.saas_package_modules pm

        join public.saas_modules m
          on m.id = pm.module_id

        where pm.package_id = p.id
      ),
      '[]'::jsonb
    ) as modules,

    p.created_at,
    p.updated_at

  from public.saas_packages p

  order by p.name, p.id;
end;
$function$;

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

create function public.platform_admin_list_subscriptions()
returns table (
  id uuid,
  company_id uuid,
  company_code text,
  company_name text,
  outlet_id uuid,
  outlet_code text,
  outlet_name text,
  package_id uuid,
  package_code text,
  package_name text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  activated_at timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,
  renewed_from_subscription_id uuid,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    s.id,
    s.company_id,
    c.code,
    c.name,

    s.outlet_id,
    o.code::text,
    o.name::text,

    s.package_id,
    p.code,
    p.name,

    s.status,
    s.starts_at,
    s.ends_at,
    s.activated_at,
    s.suspended_at,
    s.cancelled_at,
    s.renewed_from_subscription_id,
    s.notes,
    s.created_at,
    s.updated_at

  from public.outlet_subscriptions s

  join public.companies c
    on c.id = s.company_id

  join public.outlets o
    on o.id = s.outlet_id

  join public.saas_packages p
    on p.id = s.package_id

  order by s.created_at desc, s.id desc;
end;
$function$;

-- ============================================================
-- PAYMENTS
-- ============================================================

create function public.platform_admin_list_payments()
returns table (
  id uuid,
  subscription_id uuid,
  company_code text,
  outlet_code text,
  package_code text,
  amount numeric,
  currency text,
  payment_method text,
  status text,
  reference_no text,
  paid_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  notes text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  return query
  select
    pay.id,
    pay.subscription_id,

    c.code,
    o.code::text,
    pkg.code,

    pay.amount,
    pay.currency,
    pay.payment_method,
    pay.status,
    pay.reference_no,
    pay.paid_at,
    pay.confirmed_at,
    pay.confirmed_by,
    pay.rejected_at,
    pay.rejected_by,
    pay.rejection_reason,
    pay.notes,
    pay.created_at

  from public.subscription_payments pay

  join public.outlet_subscriptions s
    on s.id = pay.subscription_id

  join public.companies c
    on c.id = s.company_id

  join public.outlets o
    on o.id = s.outlet_id

  join public.saas_packages pkg
    on pkg.id = s.package_id

  order by pay.created_at desc, pay.id desc;
end;
$function$;

-- ============================================================
-- AUDIT EVENTS
-- ============================================================

create function public.platform_admin_list_audit_events(
  p_limit integer default 100
)
returns table (
  id uuid,
  actor_user_id uuid,
  company_id uuid,
  company_code text,
  outlet_id uuid,
  outlet_code text,
  event_type text,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform private.require_platform_admin();

  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Audit limit must be between 1 and 500'
      using errcode = '22023';
  end if;

  return query
  select
    e.id,
    e.actor_user_id,
    e.company_id,
    c.code,
    e.outlet_id,
    o.code::text,
    e.event_type,
    e.target_type,
    e.target_id,
    e.metadata,
    e.created_at

  from public.control_plane_audit_events e

  left join public.companies c
    on c.id = e.company_id

  left join public.outlets o
    on o.id = e.outlet_id

  order by e.created_at desc, e.id desc

  limit p_limit;
end;
$function$;

-- ============================================================
-- PRIVILEGES
-- ============================================================

revoke all privileges on function
  private.require_platform_admin(),
  public.platform_admin_get_overview(),
  public.platform_admin_list_companies(),
  public.platform_admin_list_outlets(),
  public.platform_admin_list_modules(),
  public.platform_admin_list_packages(),
  public.platform_admin_list_subscriptions(),
  public.platform_admin_list_payments(),
  public.platform_admin_list_audit_events(integer)
from public, anon, authenticated, service_role;

grant execute on function
  public.platform_admin_get_overview(),
  public.platform_admin_list_companies(),
  public.platform_admin_list_outlets(),
  public.platform_admin_list_modules(),
  public.platform_admin_list_packages(),
  public.platform_admin_list_subscriptions(),
  public.platform_admin_list_payments(),
  public.platform_admin_list_audit_events(integer)
to authenticated;

commit;
