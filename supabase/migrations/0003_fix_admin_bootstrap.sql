-- ===========================================================================
-- Allow the first administrator to be created
-- ===========================================================================
-- The role-escalation guard in 0001 was unconditional:
--
--   if new.role is distinct from old.role and not is_admin() then raise ...
--
-- `is_admin()` resolves the CURRENT user via auth.uid(). Run from the SQL
-- editor, from a migration, or over a service-role connection there is no
-- authenticated user, auth.uid() is null, and is_admin() is therefore false.
-- So the guard rejected the very statement the deployment guide tells an
-- operator to run, and there was no way to promote anybody. A guard nobody
-- can get past is a bug, not a strong guard.
--
-- The fix distinguishes the two callers rather than weakening the rule:
--
--   * A request carrying a user (auth.uid() is not null) is a client, whether
--     that is the customer-facing profile form or a handcrafted API call.
--     Those still require an existing admin, exactly as before.
--
--   * A statement with no authenticated user is already privileged: it is the
--     SQL editor, a migration, or a service-role connection. Nothing reaches
--     this trigger anonymously, because the RLS policy on `profiles` only
--     permits a customer to update the row where id = auth.uid(), which never
--     matches when auth.uid() is null. So allowing that path opens nothing a
--     caller did not already hold.
--
-- Net effect: the escalation path that mattered stays shut, and the shop can
-- be bootstrapped.
-- ===========================================================================

create or replace function prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Only an administrator may change a user role';
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- Promoting the first administrator
-- ===========================================================================
-- Register through the site first so the profile row exists, then run this
-- once in the SQL editor with your own address:
--
--   update profiles set role = 'admin' where email = 'you@example.com';
--
-- Confirm it took:
--
--   select email, role from profiles where role = 'admin';
--
-- There is still no self-service path to admin from the application. Promotion
-- remains a deliberate statement run by a human with database access.
-- ===========================================================================
