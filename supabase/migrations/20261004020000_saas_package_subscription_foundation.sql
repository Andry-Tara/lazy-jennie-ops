-- PHASE 1C:
-- SaaS module/package/subscription/payment foundation.
--
-- IMPORTANT:
-- - NO operational entitlement enforcement yet.
-- - NO changes to POS / Waiter / Kitchen / Cashier Shift authorization.
-- - NO automatic package assignment.
-- - NO automatic subscription assignment.
-- - NO platform administrator provisioning.
-- - NO browser-facing raw-table policies.
-- - Existing companies/outlets/profiles/memberships remain untouched.
--
-- Subscription history is append-oriented:
-- each subscription row represents one commercial term.
-- Renewals create a new row linked with renewed_from_subscription_id.
--
-- Payment confirmation is stored here, but application-level privileged
-- confirmation/activation workflows are introduced later.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- MODULE CATALOG
-- ============================================================

create table public.saas_modules (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,
  description text,

  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),

  sort_order integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saas_modules_code_normalized_check
    check (
      code = upper(btrim(code))
      and code ~ '^[A-Z][A-Z0-9_]{0,63}$'
    ),

  constraint saas_modules_name_not_blank_check
    check (btrim(name) <> '')
);

comment on table public.saas_modules is
  'Global SaaS module catalog. Catalog presence does not grant operational access.';

-- ============================================================
-- PACKAGE CATALOG
-- ============================================================

create table public.saas_packages (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,
  name text not null,
  description text,

  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE')),

  billing_cycle text not null default 'MONTHLY'
    check (
      billing_cycle in (
        'MONTHLY',
        'QUARTERLY',
        'YEARLY',
        'CUSTOM'
      )
    ),

  default_price numeric(14,2) not null default 0
    check (default_price >= 0),

  currency text not null default 'IDR'
    check (
      currency = upper(btrim(currency))
      and currency ~ '^[A-Z]{3}$'
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint saas_packages_code_normalized_check
    check (
      code = upper(btrim(code))
      and code ~ '^[A-Z][A-Z0-9_]{0,63}$'
    ),

  constraint saas_packages_name_not_blank_check
    check (btrim(name) <> '')
);

comment on table public.saas_packages is
  'Global commercial package templates. Package rows do not by themselves authorize an outlet.';

-- ============================================================
-- PACKAGE -> MODULE MAPPING
-- ============================================================

create table public.saas_package_modules (
  package_id uuid not null
    references public.saas_packages(id)
    on update restrict
    on delete restrict,

  module_id uuid not null
    references public.saas_modules(id)
    on update restrict
    on delete restrict,

  created_at timestamptz not null default now(),

  primary key (package_id, module_id)
);

create index saas_package_modules_module_id_idx
  on public.saas_package_modules(module_id);

comment on table public.saas_package_modules is
  'Module composition of a SaaS package template.';

-- ============================================================
-- OUTLET SUBSCRIPTIONS
--
-- One row = one commercial subscription term.
--
-- Example:
-- 2026-10-01 -> 2026-11-01 = one row
-- renewal creates another row linked to the previous row.
-- ============================================================

create table public.outlet_subscriptions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on update restrict
    on delete restrict,

  outlet_id uuid not null,

  package_id uuid not null
    references public.saas_packages(id)
    on update restrict
    on delete restrict,

  status text not null default 'PENDING_PAYMENT'
    check (
      status in (
        'PENDING_PAYMENT',
        'ACTIVE',
        'EXPIRED',
        'SUSPENDED',
        'CANCELLED'
      )
    ),

  starts_at timestamptz not null,
  ends_at timestamptz not null,

  activated_at timestamptz,
  suspended_at timestamptz,
  cancelled_at timestamptz,

  renewed_from_subscription_id uuid
    references public.outlet_subscriptions(id)
    on update restrict
    on delete restrict,

  notes text,

  created_by uuid
    references auth.users(id)
    on update restrict
    on delete restrict,

  updated_by uuid
    references auth.users(id)
    on update restrict
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint outlet_subscriptions_company_outlet_fkey
    foreign key (outlet_id, company_id)
    references public.outlets(id, company_id)
    on update restrict
    on delete restrict,

  constraint outlet_subscriptions_valid_period_check
    check (ends_at > starts_at),

  constraint outlet_subscriptions_id_scope_key
    unique (id, company_id, outlet_id),

  constraint outlet_subscriptions_term_key
    unique (outlet_id, starts_at, ends_at)
);

create index outlet_subscriptions_company_idx
  on public.outlet_subscriptions(company_id);

create index outlet_subscriptions_outlet_idx
  on public.outlet_subscriptions(outlet_id);

create index outlet_subscriptions_package_idx
  on public.outlet_subscriptions(package_id);

create index outlet_subscriptions_status_idx
  on public.outlet_subscriptions(status);

create index outlet_subscriptions_outlet_ends_idx
  on public.outlet_subscriptions(outlet_id, ends_at desc);

create unique index outlet_subscriptions_one_active_per_outlet_idx
  on public.outlet_subscriptions(outlet_id)
  where status = 'ACTIVE';

create unique index outlet_subscriptions_single_renewal_child_idx
  on public.outlet_subscriptions(renewed_from_subscription_id)
  where renewed_from_subscription_id is not null;

comment on table public.outlet_subscriptions is
  'Commercial subscription terms per outlet. Phase 1C stores lifecycle state only; it does not enforce operational module access.';

-- ============================================================
-- SUBSCRIPTION PAYMENTS
-- ============================================================

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid not null
    references public.outlet_subscriptions(id)
    on update restrict
    on delete restrict,

  amount numeric(14,2) not null
    check (amount > 0),

  currency text not null default 'IDR'
    check (
      currency = upper(btrim(currency))
      and currency ~ '^[A-Z]{3}$'
    ),

  payment_method text not null default 'MANUAL_TRANSFER'
    check (
      payment_method in (
        'MANUAL_TRANSFER',
        'CASH',
        'OTHER'
      )
    ),

  status text not null default 'PENDING'
    check (
      status in (
        'PENDING',
        'CONFIRMED',
        'REJECTED',
        'VOID'
      )
    ),

  reference_no text,

  paid_at timestamptz,

  confirmed_at timestamptz,

  confirmed_by uuid
    references auth.users(id)
    on update restrict
    on delete restrict,

  rejected_at timestamptz,

  rejected_by uuid
    references auth.users(id)
    on update restrict
    on delete restrict,

  rejection_reason text,

  notes text,

  created_by uuid
    references auth.users(id)
    on update restrict
    on delete restrict,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscription_payments_confirmed_state_check
    check (
      status <> 'CONFIRMED'
      or (
        confirmed_at is not null
        and confirmed_by is not null
      )
    ),

  constraint subscription_payments_rejected_state_check
    check (
      status <> 'REJECTED'
      or (
        rejected_at is not null
        and rejected_by is not null
        and nullif(btrim(rejection_reason), '') is not null
      )
    )
);

create index subscription_payments_subscription_idx
  on public.subscription_payments(subscription_id);

create index subscription_payments_status_idx
  on public.subscription_payments(status);

create index subscription_payments_created_idx
  on public.subscription_payments(created_at desc);

create unique index subscription_payments_one_confirmed_per_subscription_idx
  on public.subscription_payments(subscription_id)
  where status = 'CONFIRMED';

comment on table public.subscription_payments is
  'Manual subscription payment records for the Pilot SaaS flow. No card credentials, bank passwords or payment secrets may be stored here.';

-- ============================================================
-- CATALOG CODE IMMUTABILITY
-- ============================================================

create function private.saas_protect_catalog_code()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.code is distinct from old.code then
    raise exception 'SaaS catalog code is immutable'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

-- ============================================================
-- SUBSCRIPTION SCOPE VALIDATION
--
-- Prevent:
-- company A subscription -> company B outlet
-- renewal chain jumping between outlets/companies
-- ============================================================

create function private.saas_validate_subscription_scope()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  v_outlet_company_id uuid;
  v_parent_company_id uuid;
  v_parent_outlet_id uuid;
begin
  select o.company_id
    into v_outlet_company_id
  from public.outlets o
  where o.id = new.outlet_id;

  if not found then
    raise exception 'Subscription outlet does not exist'
      using errcode = '23503';
  end if;

  if v_outlet_company_id is null then
    raise exception 'Subscription outlet has no company ownership'
      using errcode = '23514';
  end if;

  if v_outlet_company_id is distinct from new.company_id then
    raise exception 'Subscription company does not match outlet company'
      using errcode = '23514';
  end if;

  if new.renewed_from_subscription_id is not null then

    if new.renewed_from_subscription_id = new.id then
      raise exception 'Subscription cannot renew from itself'
        using errcode = '23514';
    end if;

    select
      s.company_id,
      s.outlet_id
    into
      v_parent_company_id,
      v_parent_outlet_id
    from public.outlet_subscriptions s
    where s.id = new.renewed_from_subscription_id;

    if not found then
      raise exception 'Renewal source subscription does not exist'
        using errcode = '23503';
    end if;

    if v_parent_company_id is distinct from new.company_id
       or v_parent_outlet_id is distinct from new.outlet_id then

      raise exception 'Renewal source must belong to the same company and outlet'
        using errcode = '23514';
    end if;

  end if;

  return new;
end;
$function$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- Reuse Phase 1A helper.
-- ============================================================

create trigger saas_modules_set_updated_at
before update on public.saas_modules
for each row
execute function private.control_plane_set_updated_at();

create trigger saas_packages_set_updated_at
before update on public.saas_packages
for each row
execute function private.control_plane_set_updated_at();

create trigger outlet_subscriptions_set_updated_at
before update on public.outlet_subscriptions
for each row
execute function private.control_plane_set_updated_at();

create trigger subscription_payments_set_updated_at
before update on public.subscription_payments
for each row
execute function private.control_plane_set_updated_at();

create trigger saas_modules_protect_code
before update of code on public.saas_modules
for each row
execute function private.saas_protect_catalog_code();

create trigger saas_packages_protect_code
before update of code on public.saas_packages
for each row
execute function private.saas_protect_catalog_code();

create trigger outlet_subscriptions_validate_scope
before insert or update of
  company_id,
  outlet_id,
  renewed_from_subscription_id
on public.outlet_subscriptions
for each row
execute function private.saas_validate_subscription_scope();

-- ============================================================
-- CLOSED RAW TABLE SURFACE
--
-- As in Phase 1A:
-- browser/API roles do NOT get raw-table access.
-- Privileged RPCs/UI are introduced separately.
-- ============================================================

alter table public.saas_modules
  enable row level security;

alter table public.saas_packages
  enable row level security;

alter table public.saas_package_modules
  enable row level security;

alter table public.outlet_subscriptions
  enable row level security;

alter table public.subscription_payments
  enable row level security;

revoke all privileges on table
  public.saas_modules,
  public.saas_packages,
  public.saas_package_modules,
  public.outlet_subscriptions,
  public.subscription_payments
from public, anon, authenticated, service_role;

revoke all privileges on function
  private.saas_protect_catalog_code(),
  private.saas_validate_subscription_scope()
from public, anon, authenticated, service_role;

commit;
