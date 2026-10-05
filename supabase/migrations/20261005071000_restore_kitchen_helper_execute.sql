begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- KITCHEN HELPER EXECUTE HOTFIX
--
-- B1 intentionally removed PUBLIC EXECUTE from private helpers.
-- Historically these two Kitchen helpers relied on PUBLIC
-- EXECUTE rather than an explicit authenticated grant.
--
-- Restore only the application role that actually needs them.
-- Do NOT restore PUBLIC / anon access.
-- ============================================================

revoke all
on function private.can_view_kitchen_row(uuid)
from public, anon;

grant execute
on function private.can_view_kitchen_row(uuid)
to authenticated;


revoke all
on function private.can_post_kitchen_action(uuid)
from public, anon;

grant execute
on function private.can_post_kitchen_action(uuid)
to authenticated;


do $check$
begin

  if not has_function_privilege(
    'authenticated',
    'private.can_view_kitchen_row(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'authenticated EXECUTE missing for can_view_kitchen_row';
  end if;

  if not has_function_privilege(
    'authenticated',
    'private.can_post_kitchen_action(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'authenticated EXECUTE missing for can_post_kitchen_action';
  end if;

  if has_function_privilege(
    'anon',
    'private.can_view_kitchen_row(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'anon must not execute can_view_kitchen_row';
  end if;

  if has_function_privilege(
    'anon',
    'private.can_post_kitchen_action(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'anon must not execute can_post_kitchen_action';
  end if;

end;
$check$;

commit;
