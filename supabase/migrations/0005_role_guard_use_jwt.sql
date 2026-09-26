-- ===========================================================================
-- AURIX 0005 - detect API callers by JWT, not by current_user
--
-- WHAT 0004 GOT WRONG
-- 0004 tried to distinguish an API caller from a database administrator with:
--
--     current_user in ('anon', 'authenticated')
--
-- That does not work here, because tg_protect_profile_role is SECURITY
-- DEFINER — and inside a SECURITY DEFINER function `current_user` is the
-- function's OWNER (postgres), never the caller. The condition was therefore
-- false for everyone, and the guard stopped running at all: an ordinary
-- authenticated user could promote themselves to admin.
--
-- `session_user` is no better: PostgREST reaches the role with SET ROLE, which
-- leaves session_user unchanged.
--
-- THE CORRECT SIGNAL
-- PostgREST sets `request.jwt.claims` on every request it proxies, including
-- anonymous ones. A direct connection — psql, the SQL Editor, a migration, this
-- project's scripts — sets nothing. So the presence of a JWT is exactly the
-- "did this arrive through the API" test, and it is visible inside a SECURITY
-- DEFINER function.
--
-- service_role is the one API caller that should be permitted: it is an
-- administrative key that already bypasses RLS everywhere else.
-- ===========================================================================

create or replace function public.tg_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
declare
  claims json;
  jwt_role text;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Missing or unparseable claims mean this did not come through PostgREST.
  begin
    claims := nullif(current_setting('request.jwt.claims', true), '')::json;
  exception when others then
    claims := null;
  end;

  -- No JWT: a direct database connection doing administration. Allowed —
  -- this is how the first admin is created.
  if claims is null then
    return new;
  end if;

  jwt_role := claims ->> 'role';

  -- The service-role key is an administrative credential.
  if jwt_role = 'service_role' then
    return new;
  end if;

  -- Everyone else arriving through the API must already be an admin.
  if not public.is_admin() then
    new.role := old.role;
  end if;

  return new;
end;
$fn$;

comment on function public.tg_protect_profile_role() is
  'Prevents API callers changing profiles.role unless they are already an admin, or are using the service-role key. Direct database connections (no JWT) are permitted, so the first admin can be created.';
