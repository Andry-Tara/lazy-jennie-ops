-- PHASE 1C.3
-- Explicit bootstrap of the first PLATFORM_ADMIN.
--
-- Reviewed identity:
-- admin@lazyjennie.com
--
-- This does NOT modify:
-- - profiles.role_id
-- - profiles.outlet_id
-- - company memberships
-- - operational authorization helpers
--
-- The account must still be:
-- - active
-- - SUPER_ADMIN
-- - outlet_id IS NULL
-- - backed by the same auth.users identity
--
-- Any ambiguity/conflict aborts the migration.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $bootstrap$
declare
  v_user_id uuid;
  v_match_count integer;
  v_existing_role text;
  v_existing_active boolean;
begin

  -- ==========================================================
  -- Resolve exactly one reviewed identity.
  -- ==========================================================

  select count(*)
  into v_match_count
  from public.profiles p

  join public.roles r
    on r.id = p.role_id

  join auth.users u
    on u.id = p.id

  where lower(btrim(p.email::text)) = 'admin@lazyjennie.com'
    and lower(btrim(u.email::text)) = 'admin@lazyjennie.com'
    and r.code::text = 'SUPER_ADMIN'
    and p.outlet_id is null
    and p.is_active;

  if v_match_count <> 1 then
    raise exception
      'Expected exactly one active NULL-outlet SUPER_ADMIN for admin@lazyjennie.com; found %',
      v_match_count
      using errcode = '23514';
  end if;

  select p.id
  into v_user_id
  from public.profiles p

  join public.roles r
    on r.id = p.role_id

  join auth.users u
    on u.id = p.id

  where lower(btrim(p.email::text)) = 'admin@lazyjennie.com'
    and lower(btrim(u.email::text)) = 'admin@lazyjennie.com'
    and r.code::text = 'SUPER_ADMIN'
    and p.outlet_id is null
    and p.is_active;

  -- ==========================================================
  -- Existing provisioning must be either absent or identical.
  -- Never silently replace another platform role.
  -- ==========================================================

  select
    pu.platform_role,
    pu.is_active
  into
    v_existing_role,
    v_existing_active
  from public.platform_users pu
  where pu.user_id = v_user_id;

  if found then
    if v_existing_role is distinct from 'PLATFORM_ADMIN'
       or v_existing_active is distinct from true then

      raise exception
        'Existing platform user conflicts with reviewed PLATFORM_ADMIN bootstrap'
        using errcode = '23514';
    end if;

    -- Exact re-application is harmless.
    return;
  end if;

  -- ==========================================================
  -- Provision PLATFORM_ADMIN.
  -- ==========================================================

  insert into public.platform_users (
    user_id,
    platform_role,
    is_active
  )
  values (
    v_user_id,
    'PLATFORM_ADMIN',
    true
  );

  -- ==========================================================
  -- Append audit record.
  --
  -- actor_user_id stays NULL because this is a reviewed
  -- database migration, not an action performed by the user.
  -- ==========================================================

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
    null,
    null,
    null,
    'PLATFORM_ADMIN_BOOTSTRAPPED',
    'PLATFORM_USER',
    v_user_id,
    jsonb_build_object(
      'source', 'REVIEWED_MIGRATION',
      'platform_role', 'PLATFORM_ADMIN'
    )
  );

end;
$bootstrap$;

commit;
