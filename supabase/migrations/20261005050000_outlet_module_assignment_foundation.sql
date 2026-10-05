-- ============================================================
-- ECOSUITE
-- OUTLET MODULE ASSIGNMENT FOUNDATION
--
-- Commercial entitlement:
--   Package modules + optional subscription add-ons
--
-- Operational enablement:
--   Per-outlet module setting
--
-- Existing restaurant-specific outlet_app_profiles
-- remain untouched.
-- ============================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- PACKAGE DEFAULT ENABLEMENT
--
-- A module can be commercially included in a package but
-- operationally disabled by default.
--
-- Example:
-- POS COMPLETE includes INVENTORY,
-- but Inventory does not have to be used immediately.
-- ============================================================

alter table public.saas_package_modules
  add column if not exists default_enabled boolean
  not null default true;

comment on column
  public.saas_package_modules.default_enabled
is
  'Default operational enablement when a module is included by a package. Entitlement and enablement are separate concepts.';

-- POS Complete includes Inventory commercially,
-- but do not force operational Inventory usage.
update public.saas_package_modules pm
set default_enabled = false
from public.saas_packages p,
     public.saas_modules m
where pm.package_id = p.id
  and pm.module_id = m.id
  and p.code = 'POS_COMPLETE'
  and m.code = 'INVENTORY';

-- Everything else currently included in packages
-- remains enabled by default.
update public.saas_package_modules pm
set default_enabled = true
from public.saas_packages p,
     public.saas_modules m
where pm.package_id = p.id
  and pm.module_id = m.id
  and not (
    p.code = 'POS_COMPLETE'
    and m.code = 'INVENTORY'
  );

-- ============================================================
-- OUTLET MODULE SETTINGS
--
-- Operational choice only.
--
-- Does NOT itself grant commercial entitlement.
-- ============================================================

create table public.outlet_module_settings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on update restrict
    on delete restrict,

  outlet_id uuid not null,

  module_id uuid not null
    references public.saas_modules(id)
    on update restrict
    on delete restrict,

  enabled boolean not null default false,

  created_by uuid
    references auth.users(id)
    on update restrict
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on update restrict
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint outlet_module_settings_company_outlet_fkey
    foreign key (outlet_id, company_id)
    references public.outlets(id, company_id)
    on update restrict
    on delete restrict,

  constraint outlet_module_settings_outlet_module_key
    unique (outlet_id, module_id)
);

create index outlet_module_settings_company_idx
  on public.outlet_module_settings(company_id);

create index outlet_module_settings_module_idx
  on public.outlet_module_settings(module_id);

comment on table public.outlet_module_settings is
  'Per-outlet operational module enablement. A setting never grants entitlement by itself.';

-- ============================================================
-- SUBSCRIPTION MODULE ADD-ONS
--
-- Extra commercial entitlement beyond package composition.
--
-- Example:
-- POS COMPLETE + ATTENDANCE add-on.
-- ============================================================

create table public.outlet_subscription_module_addons (
  id uuid primary key default gen_random_uuid(),

  subscription_id uuid not null,

  company_id uuid not null
    references public.companies(id)
    on update restrict
    on delete restrict,

  outlet_id uuid not null,

  module_id uuid not null
    references public.saas_modules(id)
    on update restrict
    on delete restrict,

  status text not null default 'ACTIVE'
    check (
      status in (
        'ACTIVE',
        'REMOVED'
      )
    ),

  notes text,

  created_by uuid
    references auth.users(id)
    on update restrict
    on delete set null,

  updated_by uuid
    references auth.users(id)
    on update restrict
    on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint outlet_subscription_module_addons_subscription_scope_fkey
    foreign key (
      subscription_id,
      company_id,
      outlet_id
    )
    references public.outlet_subscriptions(
      id,
      company_id,
      outlet_id
    )
    on update restrict
    on delete restrict,

  constraint outlet_subscription_module_addons_unique_module
    unique (
      subscription_id,
      module_id
    )
);

create index outlet_subscription_module_addons_outlet_idx
  on public.outlet_subscription_module_addons(outlet_id);

create index outlet_subscription_module_addons_module_idx
  on public.outlet_subscription_module_addons(module_id);

comment on table public.outlet_subscription_module_addons is
  'Commercial module add-ons attached to one outlet subscription term.';

-- ============================================================
-- UPDATED_AT
-- ============================================================

create trigger outlet_module_settings_set_updated_at
before update on public.outlet_module_settings
for each row
execute function private.control_plane_set_updated_at();

create trigger outlet_subscription_module_addons_set_updated_at
before update on public.outlet_subscription_module_addons
for each row
execute function private.control_plane_set_updated_at();

-- ============================================================
-- SECURITY
-- ============================================================

alter table public.outlet_module_settings
  enable row level security;

alter table public.outlet_subscription_module_addons
  enable row level security;

revoke all
on table public.outlet_module_settings
from public, anon, authenticated;

revoke all
on table public.outlet_subscription_module_addons
from public, anon, authenticated;

-- ============================================================
-- GENERIC EFFECTIVE MODULE RESOLVER
--
-- package entitlement
--        +
-- add-on entitlement
--        +
-- outlet enabled state
--        =
-- effective module access
--
-- This is still NOT wired into operational routes.
-- ============================================================

create function private.resolve_outlet_module_access(
  p_outlet_id uuid,
  p_module_code text
)
returns table (
  company_id uuid,
  outlet_id uuid,

  module_id uuid,
  module_code text,
  module_name text,

  subscription_id uuid,
  package_id uuid,
  package_code text,
  package_name text,

  stored_subscription_status text,
  effective_subscription_status text,

  starts_at timestamptz,
  ends_at timestamptz,

  package_included boolean,
  addon_entitled boolean,
  entitled boolean,

  default_enabled boolean,
  setting_exists boolean,
  enabled boolean,

  access_allowed boolean,
  reason text
)
language sql
stable
set search_path = ''
as $function$

with module_row as (
  select
    m.id,
    m.code,
    m.name,
    m.status
  from public.saas_modules m
  where m.code = upper(
    btrim(
      coalesce(
        p_module_code,
        ''
      )
    )
  )
),

commercial as (
  select r.*
  from private.resolve_outlet_module_entitlement(
    p_outlet_id,
    p_module_code
  ) r
),

resolved as (
  select
    c.company_id,
    c.outlet_id,

    m.id as module_id,
    m.code as module_code,
    m.name as module_name,

    c.subscription_id,
    c.package_id,
    c.package_code,
    c.package_name,

    c.stored_subscription_status,
    c.effective_subscription_status,

    c.starts_at,
    c.ends_at,

    coalesce(
      c.module_in_package,
      false
    ) as package_included,

    coalesce(
      addon.status = 'ACTIVE',
      false
    ) as addon_entitled,

    coalesce(
      pm.default_enabled,
      false
    ) as package_default_enabled,

    settings.id is not null
      as setting_exists,

    settings.enabled
      as explicit_enabled,

    c.company_status,
    c.outlet_active,
    c.module_exists,
    c.module_active

  from commercial c

  left join module_row m
    on true

  left join public.saas_package_modules pm
    on pm.package_id = c.package_id
   and pm.module_id = m.id

  left join public.outlet_subscription_module_addons addon
    on addon.subscription_id = c.subscription_id
   and addon.module_id = m.id

  left join public.outlet_module_settings settings
    on settings.outlet_id = c.outlet_id
   and settings.module_id = m.id
)

select
  company_id,
  outlet_id,

  module_id,
  module_code,
  module_name,

  subscription_id,
  package_id,
  package_code,
  package_name,

  stored_subscription_status,
  effective_subscription_status,

  starts_at,
  ends_at,

  package_included,
  addon_entitled,

  (
    company_status = 'ACTIVE'
    and outlet_active
    and module_exists
    and module_active
    and effective_subscription_status = 'ACTIVE'
    and (
      package_included
      or addon_entitled
    )
  ) as entitled,

  case
    when package_included
      then package_default_enabled

    when addon_entitled
      then true

    else false
  end as default_enabled,

  setting_exists,

  coalesce(
    explicit_enabled,

    case
      when package_included
        then package_default_enabled

      when addon_entitled
        then true

      else false
    end,

    false
  ) as enabled,

  (
    company_status = 'ACTIVE'
    and outlet_active
    and module_exists
    and module_active
    and effective_subscription_status = 'ACTIVE'
    and (
      package_included
      or addon_entitled
    )
    and coalesce(
      explicit_enabled,

      case
        when package_included
          then package_default_enabled

        when addon_entitled
          then true

        else false
      end,

      false
    )
  ) as access_allowed,

  case
    when company_status <> 'ACTIVE'
      then 'COMPANY_INACTIVE'

    when not outlet_active
      then 'OUTLET_INACTIVE'

    when not module_exists
      then 'MODULE_UNKNOWN'

    when not module_active
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

    when not (
      package_included
      or addon_entitled
    )
      then 'MODULE_NOT_ENTITLED'

    when not coalesce(
      explicit_enabled,

      case
        when package_included
          then package_default_enabled

        when addon_entitled
          then true

        else false
      end,

      false
    )
      then 'MODULE_DISABLED'

    else 'ALLOWED'
  end as reason

from resolved;

$function$;

revoke all
on function private.resolve_outlet_module_access(
  uuid,
  text
)
from public, anon, authenticated;

-- ============================================================
-- PLATFORM ADMIN MODULE MATRIX
-- ============================================================

create function public.platform_admin_get_outlet_module_config(
  p_outlet_id uuid
)
returns table (
  company_id uuid,
  company_code text,
  company_name text,

  outlet_id uuid,
  outlet_code text,
  outlet_name text,

  subscription_id uuid,

  package_id uuid,
  package_code text,
  package_name text,

  module_id uuid,
  module_code text,
  module_name text,

  package_included boolean,
  addon_entitled boolean,
  entitled boolean,

  default_enabled boolean,
  setting_exists boolean,
  enabled boolean,

  access_allowed boolean,
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

    r.subscription_id,

    r.package_id,
    r.package_code,
    r.package_name,

    r.module_id,
    r.module_code,
    r.module_name,

    r.package_included,
    r.addon_entitled,
    r.entitled,

    r.default_enabled,
    r.setting_exists,
    r.enabled,

    r.access_allowed,
    r.reason

  from public.saas_modules m

  cross join lateral
    private.resolve_outlet_module_access(
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
on function public.platform_admin_get_outlet_module_config(
  uuid
)
from public, anon;

grant execute
on function public.platform_admin_get_outlet_module_config(
  uuid
)
to authenticated;

-- ============================================================
-- SET OUTLET MODULE ENABLED
-- ============================================================

create function public.platform_admin_set_outlet_module_enabled(
  p_outlet_id uuid,
  p_module_code text,
  p_enabled boolean
)
returns table (
  module_code text,
  entitled boolean,
  enabled boolean,
  access_allowed boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;
  v_company_id uuid;
  v_module_id uuid;
  v_module_code text;

  v_entitled boolean;
begin
  perform private.require_platform_admin();

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;

  select
    o.company_id
  into
    v_company_id
  from public.outlets o
  where o.id = p_outlet_id;

  if not found then
    raise exception
      'Outlet not found'
      using errcode = 'P0002';
  end if;

  select
    m.id,
    m.code
  into
    v_module_id,
    v_module_code
  from public.saas_modules m
  where m.code = upper(
    btrim(
      coalesce(
        p_module_code,
        ''
      )
    )
  )
    and m.status = 'ACTIVE';

  if not found then
    raise exception
      'Active module not found'
      using errcode = 'P0002';
  end if;

  select
    r.entitled
  into
    v_entitled
  from private.resolve_outlet_module_access(
    p_outlet_id,
    v_module_code
  ) r;

  if p_enabled
     and not coalesce(
       v_entitled,
       false
     )
  then
    raise exception
      'Module % is not commercially entitled for this outlet',
      v_module_code
      using errcode = '42501';
  end if;

  insert into public.outlet_module_settings (
    company_id,
    outlet_id,
    module_id,
    enabled,
    created_by,
    updated_by
  )
  values (
    v_company_id,
    p_outlet_id,
    v_module_id,
    p_enabled,
    v_actor,
    v_actor
  )
  on conflict (
    outlet_id,
    module_id
  )
  do update set
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = now();

  insert into public.control_plane_audit_events (
    actor_user_id,
    event_type,
    target_type,
    target_id,
    company_id,
    outlet_id,
    metadata
  )
  values (
    v_actor,

    case
      when p_enabled
        then 'OUTLET_MODULE_ENABLED'
      else 'OUTLET_MODULE_DISABLED'
    end,

    'OUTLET_MODULE_SETTING',
    p_outlet_id,
    v_company_id,
    p_outlet_id,

    jsonb_build_object(
      'module_code',
      v_module_code,
      'enabled',
      p_enabled
    )
  );

  return query

  select
    r.module_code,
    r.entitled,
    r.enabled,
    r.access_allowed,
    r.reason

  from private.resolve_outlet_module_access(
    p_outlet_id,
    v_module_code
  ) r;
end;
$function$;

revoke all
on function public.platform_admin_set_outlet_module_enabled(
  uuid,
  text,
  boolean
)
from public, anon;

grant execute
on function public.platform_admin_set_outlet_module_enabled(
  uuid,
  text,
  boolean
)
to authenticated;

-- ============================================================
-- SET MODULE ADD-ON
--
-- Add-on entitlement is attached to the current ACTIVE
-- subscription term.
-- ============================================================

create function public.platform_admin_set_outlet_module_addon(
  p_outlet_id uuid,
  p_module_code text,
  p_granted boolean,
  p_notes text default null
)
returns table (
  module_code text,
  package_included boolean,
  addon_entitled boolean,
  entitled boolean,
  enabled boolean,
  access_allowed boolean,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;

  v_company_id uuid;

  v_subscription_id uuid;
  v_package_id uuid;

  v_module_id uuid;
  v_module_code text;

  v_package_included boolean;
begin
  perform private.require_platform_admin();

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;

  select
    o.company_id
  into
    v_company_id
  from public.outlets o
  where o.id = p_outlet_id;

  if not found then
    raise exception
      'Outlet not found'
      using errcode = 'P0002';
  end if;

  select
    s.id,
    s.package_id
  into
    v_subscription_id,
    v_package_id
  from public.outlet_subscriptions s
  where s.outlet_id = p_outlet_id
    and s.status = 'ACTIVE'
    and now() >= s.starts_at
    and now() < s.ends_at
  order by s.starts_at desc
  limit 1;

  if not found then
    raise exception
      'No active subscription for outlet'
      using errcode = 'P0002';
  end if;

  select
    m.id,
    m.code
  into
    v_module_id,
    v_module_code
  from public.saas_modules m
  where m.code = upper(
    btrim(
      coalesce(
        p_module_code,
        ''
      )
    )
  )
    and m.status = 'ACTIVE';

  if not found then
    raise exception
      'Active module not found'
      using errcode = 'P0002';
  end if;

  select exists (
    select 1
    from public.saas_package_modules pm
    where pm.package_id =
      v_package_id
      and pm.module_id =
        v_module_id
  )
  into v_package_included;

  if p_granted
     and v_package_included
  then
    raise exception
      'Module % is already included in the package',
      v_module_code
      using errcode = '22023';
  end if;

  insert into public.outlet_subscription_module_addons (
    subscription_id,
    company_id,
    outlet_id,
    module_id,
    status,
    notes,
    created_by,
    updated_by
  )
  values (
    v_subscription_id,
    v_company_id,
    p_outlet_id,
    v_module_id,

    case
      when p_granted
        then 'ACTIVE'
      else 'REMOVED'
    end,

    nullif(
      btrim(
        coalesce(
          p_notes,
          ''
        )
      ),
      ''
    ),

    v_actor,
    v_actor
  )
  on conflict (
    subscription_id,
    module_id
  )
  do update set
    status =
      case
        when p_granted
          then 'ACTIVE'
        else 'REMOVED'
      end,

    notes =
      coalesce(
        nullif(
          btrim(
            coalesce(
              p_notes,
              ''
            )
          ),
          ''
        ),
        public.outlet_subscription_module_addons.notes
      ),

    updated_by =
      excluded.updated_by,

    updated_at =
      now();

  if p_granted then

    insert into public.outlet_module_settings (
      company_id,
      outlet_id,
      module_id,
      enabled,
      created_by,
      updated_by
    )
    values (
      v_company_id,
      p_outlet_id,
      v_module_id,
      true,
      v_actor,
      v_actor
    )
    on conflict (
      outlet_id,
      module_id
    )
    do update set
      enabled = true,
      updated_by = excluded.updated_by,
      updated_at = now();

  else

    update public.outlet_module_settings
    set
      enabled = false,
      updated_by = v_actor,
      updated_at = now()
    where outlet_id =
      p_outlet_id
      and module_id =
        v_module_id;

  end if;

  insert into public.control_plane_audit_events (
    actor_user_id,
    event_type,
    target_type,
    target_id,
    company_id,
    outlet_id,
    metadata
  )
  values (
    v_actor,

    case
      when p_granted
        then 'OUTLET_MODULE_ADDON_GRANTED'
      else 'OUTLET_MODULE_ADDON_REMOVED'
    end,

    'OUTLET_SUBSCRIPTION_MODULE_ADDON',
    v_subscription_id,
    v_company_id,
    p_outlet_id,

    jsonb_build_object(
      'module_code',
      v_module_code,
      'granted',
      p_granted,
      'notes',
      p_notes
    )
  );

  return query

  select
    r.module_code,
    r.package_included,
    r.addon_entitled,
    r.entitled,
    r.enabled,
    r.access_allowed,
    r.reason

  from private.resolve_outlet_module_access(
    p_outlet_id,
    v_module_code
  ) r;
end;
$function$;

revoke all
on function public.platform_admin_set_outlet_module_addon(
  uuid,
  text,
  boolean,
  text
)
from public, anon;

grant execute
on function public.platform_admin_set_outlet_module_addon(
  uuid,
  text,
  boolean,
  text
)
to authenticated;

-- ============================================================
-- CHANGE ACTIVE SUBSCRIPTION PACKAGE
--
-- Same subscription term.
-- No delete.
-- No expiry reset.
-- Audit preserved.
-- ============================================================

create function public.platform_admin_change_outlet_subscription_package(
  p_outlet_id uuid,
  p_package_id uuid,
  p_notes text default null
)
returns table (
  subscription_id uuid,
  old_package_code text,
  new_package_code text,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid;

  v_company_id uuid;

  v_subscription_id uuid;
  v_old_package_id uuid;
  v_old_package_code text;

  v_new_package_code text;

  v_starts_at timestamptz;
  v_ends_at timestamptz;
begin
  perform private.require_platform_admin();

  v_actor := auth.uid();

  if v_actor is null then
    raise exception
      'Authentication required'
      using errcode = '42501';
  end if;

  select
    o.company_id
  into
    v_company_id
  from public.outlets o
  where o.id = p_outlet_id;

  if not found then
    raise exception
      'Outlet not found'
      using errcode = 'P0002';
  end if;

  select
    p.code
  into
    v_new_package_code
  from public.saas_packages p
  where p.id = p_package_id
    and p.status = 'ACTIVE';

  if not found then
    raise exception
      'Active package not found'
      using errcode = 'P0002';
  end if;

  select
    s.id,
    s.package_id,
    p.code,
    s.starts_at,
    s.ends_at
  into
    v_subscription_id,
    v_old_package_id,
    v_old_package_code,
    v_starts_at,
    v_ends_at
  from public.outlet_subscriptions s
  join public.saas_packages p
    on p.id = s.package_id
  where s.outlet_id = p_outlet_id
    and s.status = 'ACTIVE'
    and now() >= s.starts_at
    and now() < s.ends_at
  order by s.starts_at desc
  limit 1;

  if not found then
    raise exception
      'No active subscription for outlet'
      using errcode = 'P0002';
  end if;

  if v_old_package_id = p_package_id then
    raise exception
      'Outlet already uses package %',
      v_new_package_code
      using errcode = '22023';
  end if;

  update public.outlet_subscriptions
  set
    package_id =
      p_package_id,

    updated_by =
      v_actor,

    updated_at =
      now()
  where id =
    v_subscription_id;

  insert into public.control_plane_audit_events (
    actor_user_id,
    event_type,
    target_type,
    target_id,
    company_id,
    outlet_id,
    metadata
  )
  values (
    v_actor,
    'OUTLET_SUBSCRIPTION_PACKAGE_CHANGED',
    'OUTLET_SUBSCRIPTION',
    v_subscription_id,
    v_company_id,
    p_outlet_id,

    jsonb_build_object(
      'old_package_code',
      v_old_package_code,
      'new_package_code',
      v_new_package_code,
      'notes',
      p_notes
    )
  );

  return query
  select
    v_subscription_id,
    v_old_package_code,
    v_new_package_code,
    v_starts_at,
    v_ends_at;
end;
$function$;

revoke all
on function public.platform_admin_change_outlet_subscription_package(
  uuid,
  uuid,
  text
)
from public, anon;

grant execute
on function public.platform_admin_change_outlet_subscription_package(
  uuid,
  uuid,
  text
)
to authenticated;

-- ============================================================
-- POST CHECK
-- ============================================================

do $check$
declare
  v_inventory_default boolean;
begin
  select
    pm.default_enabled
  into
    v_inventory_default
  from public.saas_package_modules pm
  join public.saas_packages p
    on p.id = pm.package_id
  join public.saas_modules m
    on m.id = pm.module_id
  where p.code = 'POS_COMPLETE'
    and m.code = 'INVENTORY';

  if v_inventory_default is distinct from false then
    raise exception
      'POS_COMPLETE Inventory default must be disabled';
  end if;
end;
$check$;

commit;
