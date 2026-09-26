-- ===========================================================================
-- AURIX 0004 - let a database administrator actually set profiles.role
--
-- THE BUG
-- 0001 added tg_protect_profile_role, which reverts any change to
-- profiles.role unless public.is_admin() is true. The intent was to stop an
-- end user promoting themselves through the API, and it does that correctly.
--
-- But it also blocked the *documented* way to create the first admin:
--
--     update public.profiles set role = 'admin' where id = '...';
--
-- Run in the Supabase SQL Editor — or over any direct connection — that
-- statement executes as `postgres`, where auth.uid() is NULL, so is_admin()
-- returns false and the trigger quietly restores the old role. Postgres still
-- reports "UPDATE 1", so it looks like it worked. There was no way to create
-- the first admin at all, and the failure was silent.
--
-- THE FIX
-- Only guard callers that arrive through PostgREST. Those are the ones who
-- could be attempting escalation, and they are the only ones RLS applies to.
-- A connection as `postgres` or `service_role` is the database owner doing
-- administration; it already bypasses RLS entirely, so refusing this one
-- column achieved nothing except breaking the setup instructions.
--
-- The escalation guard itself is unchanged for API callers: an `authenticated`
-- user who is not already an admin still cannot change any role, including
-- their own.
-- ===========================================================================

create or replace function public.tg_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role is distinct from old.role
     -- `anon` and `authenticated` are the roles PostgREST switches into for
     -- API traffic. Anything else (postgres, service_role, a migration) is
     -- administration and is allowed through.
     and current_user in ('anon', 'authenticated')
     and not public.is_admin()
  then
    new.role := old.role;
  end if;

  return new;
end;
$fn$;

comment on function public.tg_protect_profile_role() is
  'Prevents API callers changing profiles.role unless they are already an admin. Database administrators (postgres, service_role) are permitted, so the first admin can be created.';
