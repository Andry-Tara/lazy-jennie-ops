begin;

set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- ============================================================
-- WAITER RUNTIME HELPER EXECUTE HOTFIX
--
-- waiter_outlets_secure / waiter_table_map_secure now depend on
-- private.can_view_waiter_runtime(uuid).
--
-- Keep it closed to PUBLIC / anon, but allow authenticated
-- application sessions to evaluate the secure views.
-- ============================================================

revoke all
on function private.can_view_waiter_runtime(uuid)
from public, anon;

grant execute
on function private.can_view_waiter_runtime(uuid)
to authenticated;


do $check$
begin

  if not has_function_privilege(
    'authenticated',
    'private.can_view_waiter_runtime(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'authenticated EXECUTE missing for can_view_waiter_runtime';
  end if;


  if has_function_privilege(
    'anon',
    'private.can_view_waiter_runtime(uuid)',
    'EXECUTE'
  ) then
    raise exception
      'anon must not execute can_view_waiter_runtime';
  end if;

end;
$check$;

commit;
