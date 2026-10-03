-- PHASE 1A: company ownership + memberships only.
-- No subscription enforcement. No operational authorization replacement.
-- No Tenant #2 onboarding until later isolation phases: legacy global roles
-- still have their existing operational scope, including unassigned outlets.
--
-- No seeds/backfill: company ownership and administrator provisioning require
-- a separately reviewed mapping. profiles.outlet_id/role_id remain unchanged.
-- Run the read-only supabase/checks/phase_1a_precheck.sql BEFORE applying this
-- migration and retain its mapping_baseline JSON for the postcheck.
--
-- This migration intentionally fails on object-name collisions instead of
-- replacing potentially existing authorization code. Apply as the database
-- owner through the reviewed migration process, never from the browser.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (btrim(name) <> ''),
  legal_name text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  timezone text not null default 'Asia/Jakarta'
    check (btrim(timezone) <> ''),
  currency text not null default 'IDR'
    check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_code_normalized_check
    check (code = upper(btrim(code)) and code ~ '^[A-Z][A-Z0-9_]{0,63}$')
);

comment on table public.companies is
  'Phase 1A company ownership. No subscription enforcement or automatic ownership mapping.';

alter table public.outlets
  add column company_id uuid,
  add constraint outlets_company_id_fkey
    foreign key (company_id) references public.companies(id)
    on update restrict on delete restrict,
  add constraint outlets_id_company_id_key unique (id, company_id);

create index outlets_company_id_idx on public.outlets(company_id);

comment on column public.outlets.company_id is
  'Nullable until reviewed ownership backfill. NULL does not authorize any company member.';

create table public.company_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id)
    on update restrict on delete restrict,
  company_id uuid not null references public.companies(id)
    on update restrict on delete restrict,
  membership_role text not null default 'COMPANY_MEMBER'
    check (membership_role in (
      'COMPANY_OWNER', 'COMPANY_ADMIN', 'COMPANY_MANAGEMENT', 'COMPANY_MEMBER'
    )),
  branch_scope text not null default 'ASSIGNED_BRANCHES'
    check (branch_scope in ('ALL_BRANCHES', 'ASSIGNED_BRANCHES')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_memberships_profile_company_key unique (profile_id, company_id),
  constraint company_memberships_id_company_key unique (id, company_id)
);

create index company_memberships_company_id_idx
  on public.company_memberships(company_id);

comment on column public.company_memberships.membership_role is
  'Company-scoped label only; never implies platform authority or replaces legacy operational roles.';

comment on column public.company_memberships.branch_scope is
  'Branch visibility is explicit, independent of membership_role and legacy profiles.outlet_id.';

create table public.company_outlet_access (
  membership_id uuid not null,
  company_id uuid not null,
  outlet_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (membership_id, outlet_id),
  constraint company_outlet_access_membership_company_fkey
    foreign key (membership_id, company_id)
    references public.company_memberships(id, company_id)
    on update restrict on delete restrict,
  constraint company_outlet_access_outlet_company_fkey
    foreign key (outlet_id, company_id)
    references public.outlets(id, company_id)
    on update restrict on delete restrict
);

create index company_outlet_access_outlet_company_idx
  on public.company_outlet_access(outlet_id, company_id);

create index company_outlet_access_company_id_idx
  on public.company_outlet_access(company_id);

comment on table public.company_outlet_access is
  'Explicit grants used only for ASSIGNED_BRANCHES. Both composite FKs enforce the same company; NULL/unassigned outlets cannot receive grants.';

create table public.platform_users (
  user_id uuid primary key references auth.users(id)
    on update restrict on delete restrict,
  platform_role text not null
    check (platform_role in ('PLATFORM_ADMIN', 'PLATFORM_SUPPORT')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_users is
  'Explicit platform provisioning only. Legacy SUPER_ADMIN confers no platform authority. PLATFORM_SUPPORT has no implicit company/outlet access in Phase 1A.';

create table public.control_plane_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id)
    on update restrict on delete restrict,
  company_id uuid references public.companies(id)
    on update restrict on delete restrict,
  outlet_id uuid references public.outlets(id)
    on update restrict on delete restrict,
  event_type text not null check (btrim(event_type) <> ''),
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index control_plane_audit_events_company_created_idx
  on public.control_plane_audit_events(company_id, created_at desc);

create index control_plane_audit_events_outlet_created_idx
  on public.control_plane_audit_events(outlet_id, created_at desc);

comment on table public.control_plane_audit_events is
  'Append-only storage for reviewed privileged provisioning and future control-plane/billing writes. No automatic event capture or browser insert endpoint in Phase 1A. Never store credentials, tokens or payment-card data in metadata.';

-- New trigger helpers only. Existing operational helpers/triggers are untouched.
create function private.control_plane_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

create function private.control_plane_protect_company_code()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.code is distinct from old.code then
    raise exception 'Company code is immutable'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

create function private.control_plane_reject_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception 'Control-plane audit events are append-only'
    using errcode = '42501';
end;
$function$;

create trigger companies_set_updated_at
before update on public.companies
for each row execute function private.control_plane_set_updated_at();

create trigger companies_protect_code
before update of code on public.companies
for each row execute function private.control_plane_protect_company_code();

create trigger company_memberships_set_updated_at
before update on public.company_memberships
for each row execute function private.control_plane_set_updated_at();

create trigger platform_users_set_updated_at
before update on public.platform_users
for each row execute function private.control_plane_set_updated_at();

create trigger control_plane_audit_events_append_only
before update or delete or truncate on public.control_plane_audit_events
for each statement execute function private.control_plane_reject_audit_mutation();

-- Closed raw-table surface. There are deliberately no browser-facing policies.
-- Owner-executed read RPCs below apply explicit caller scope via auth.uid().
-- Do not FORCE RLS: the owner needs to read these tables inside those RPCs.
alter table public.companies enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_outlet_access enable row level security;
alter table public.platform_users enable row level security;
alter table public.control_plane_audit_events enable row level security;

revoke all privileges on table
  public.companies,
  public.company_memberships,
  public.company_outlet_access,
  public.platform_users,
  public.control_plane_audit_events
from public, anon, authenticated, service_role;

-- These helpers authorize control-plane VISIBILITY, not operational activity.
-- They intentionally retain visibility for suspended/cancelled companies and
-- inactive outlets. Future subscription checks must be separate.
create function private.is_platform_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.platform_users pu
    where pu.user_id = auth.uid()
      and pu.platform_role = 'PLATFORM_ADMIN'
      and pu.is_active
  );
$function$;

create function private.current_company_membership(p_company_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $function$
  select cm.id
  from public.company_memberships cm
  join public.profiles p on p.id = cm.profile_id
  where cm.profile_id = auth.uid()
    and cm.company_id = p_company_id
    and cm.is_active
    and p.is_active;
$function$;

create function private.can_view_company(p_company_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.companies c
    where c.id = p_company_id
      and (
        private.is_platform_admin()
        or private.current_company_membership(c.id) is not null
      )
  );
$function$;

create function private.can_access_company_outlet(
  p_company_id uuid,
  p_outlet_id uuid
)
returns boolean
language sql stable security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.outlets o
    where o.id = p_outlet_id
      and o.company_id is not distinct from p_company_id
      and (
        private.is_platform_admin()
        or exists (
          select 1 from public.company_memberships cm
          where cm.id = private.current_company_membership(p_company_id)
            and (
              cm.branch_scope = 'ALL_BRANCHES'
              or (
                cm.branch_scope = 'ASSIGNED_BRANCHES'
                and exists (
                  select 1 from public.company_outlet_access coa
                  where coa.membership_id = cm.id
                    and coa.company_id = o.company_id
                    and coa.outlet_id = o.id
                )
              )
            )
        )
      )
  );
$function$;

comment on function private.can_access_company_outlet(uuid, uuid) is
  'Control-plane visibility only; not an operational entitlement. NULL company is allowed only for explicit platform admins viewing unassigned outlets.';

-- Public read API: explicit columns; no caller-supplied identity or role.
create function public.get_my_platform_access()
returns table (platform_role text, is_active boolean, is_platform_admin boolean)
language sql stable security definer
set search_path = ''
as $function$
  select pu.platform_role, pu.is_active, pu.platform_role = 'PLATFORM_ADMIN'
  from public.platform_users pu
  where pu.user_id = auth.uid() and pu.is_active;
$function$;

create function public.get_my_companies()
returns table (
  id uuid, code text, name text, legal_name text, status text,
  timezone text, currency text, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer
set search_path = ''
as $function$
  select c.id, c.code, c.name, c.legal_name, c.status,
    c.timezone, c.currency, c.created_at, c.updated_at
  from public.companies c
  where private.can_view_company(c.id)
  order by c.name, c.id;
$function$;

create function public.get_my_company_outlets(p_company_id uuid)
returns table (
  id uuid, company_id uuid, code text, name text, type text,
  timezone text, is_active boolean
)
language sql stable security definer
set search_path = ''
as $function$
  select o.id, o.company_id, o.code::text, o.name::text, o.type::text,
    o.timezone::text, o.is_active
  from public.outlets o
  where o.company_id is not distinct from p_company_id
    and private.can_access_company_outlet(p_company_id, o.id)
  order by o.name, o.id;
$function$;

comment on function public.get_my_company_outlets(uuid) is
  'Lists authorized branches including inactive branches. Pass NULL to list unassigned outlets (explicit PLATFORM_ADMIN only); NULL is never a wildcard.';

create function public.get_my_company_memberships()
returns table (
  id uuid, company_id uuid, membership_role text, branch_scope text,
  is_active boolean, created_at timestamptz, updated_at timestamptz
)
language sql stable security definer
set search_path = ''
as $function$
  select cm.id, cm.company_id, cm.membership_role, cm.branch_scope,
    cm.is_active, cm.created_at, cm.updated_at
  from public.company_memberships cm
  where cm.profile_id = auth.uid()
    and cm.id = private.current_company_membership(cm.company_id)
  order by cm.company_id;
$function$;

-- Supabase default privileges can grant functions/tables automatically.
-- Revoke explicitly on every new function, without changing schema defaults
-- or privileges of any existing operational object.
revoke all privileges on function
  private.control_plane_set_updated_at(),
  private.control_plane_protect_company_code(),
  private.control_plane_reject_audit_mutation(),
  private.is_platform_admin(),
  private.current_company_membership(uuid),
  private.can_view_company(uuid),
  private.can_access_company_outlet(uuid, uuid),
  public.get_my_platform_access(),
  public.get_my_companies(),
  public.get_my_company_outlets(uuid),
  public.get_my_company_memberships()
from public, anon, authenticated, service_role;

grant execute on function
  public.get_my_platform_access(),
  public.get_my_companies(),
  public.get_my_company_outlets(uuid),
  public.get_my_company_memberships()
to authenticated;

commit;
