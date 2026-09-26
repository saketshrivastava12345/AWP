-- ===========================================================================
-- AURIX 0002 - row level security
--
-- Model:
--   anon + authenticated  -> SELECT on the public catalogue
--   authenticated         -> full control of their own favorites, and of their
--                            own profiles row except its `role`
--   admin                 -> INSERT/UPDATE/DELETE on the catalogue
--
-- RLS is enabled on every table in `public`. Any table without a policy is
-- therefore closed by default, which is the behaviour we want.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- is_admin()
--
-- SECURITY DEFINER is essential here, not incidental: the policies on
-- `profiles` call this function, and it reads `profiles`. Without DEFINER the
-- read would itself be subject to those policies and recurse infinitely
-- (Postgres raises "infinite recursion detected in policy").
--
-- search_path is pinned so the function body cannot be hijacked by a caller
-- setting a malicious search_path.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$fn$;

comment on function public.is_admin() is
  'True when the calling user has profiles.role = admin. SECURITY DEFINER to avoid RLS recursion on profiles.';

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- The role-escalation guard from 0001 can now be attached, since it calls
-- is_admin().
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.tg_protect_profile_role();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

do $do$
declare
  t text;
begin
  foreach t in array array[
    'countries', 'manufacturers', 'categories', 'car_models',
    'engines', 'transmissions', 'car_variants',
    'performance_specs', 'dimensions', 'fuel_specs', 'ev_specs',
    'part_categories', 'parts', 'part_relations', 'variant_parts',
    'features', 'variant_features', 'car_media',
    'profiles', 'favorites'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$do$;

-- ---------------------------------------------------------------------------
-- Catalogue tables: public read, admin write
--
-- Generated in a loop rather than written out 72 times. Every catalogue table
-- gets exactly the same four policies, so a loop also guarantees none is
-- accidentally left out or given a subtly different rule.
-- ---------------------------------------------------------------------------

do $do$
declare
  t text;
begin
  foreach t in array array[
    'countries', 'manufacturers', 'categories', 'car_models',
    'engines', 'transmissions',
    'performance_specs', 'dimensions', 'fuel_specs', 'ev_specs',
    'part_categories', 'parts', 'part_relations', 'variant_parts',
    'features', 'variant_features', 'car_media'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_select_public', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_admin())',
      t || '_insert_admin', t);

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
      t || '_update_admin', t);

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      t || '_delete_admin', t);
  end loop;
end;
$do$;

-- car_variants is handled separately: unpublished drafts are visible to admins
-- only. Because car_catalog runs with security_invoker, this single policy also
-- hides drafts from the grid, search and compare pages for free.
create policy car_variants_select_public
  on public.car_variants for select to anon, authenticated
  using (is_published or public.is_admin());

create policy car_variants_insert_admin
  on public.car_variants for insert to authenticated
  with check (public.is_admin());

create policy car_variants_update_admin
  on public.car_variants for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy car_variants_delete_admin
  on public.car_variants for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles
--
-- A user may read and update only their own row. `role` is additionally
-- protected by the profiles_protect_role trigger above, because a WITH CHECK
-- clause cannot express "every column except this one may change".
--
-- There is deliberately no INSERT policy: rows are created exclusively by the
-- on_auth_user_created trigger, which is SECURITY DEFINER and bypasses RLS.
-- ---------------------------------------------------------------------------

create policy profiles_select_own
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or public.is_admin());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

create policy profiles_delete_admin
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- favorites: entirely private to their owner
-- ---------------------------------------------------------------------------

create policy favorites_select_own
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy favorites_insert_own
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy favorites_delete_own
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Grants
--
-- RLS filters rows, but a role still needs the table-level privilege first.
-- These grants are deliberately broad for `authenticated` on catalogue tables;
-- the admin-only policies above are what actually restrict writes.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;

do $do$
declare
  t text;
begin
  foreach t in array array[
    'countries', 'manufacturers', 'categories', 'car_models',
    'engines', 'transmissions', 'car_variants',
    'performance_specs', 'dimensions', 'fuel_specs', 'ev_specs',
    'part_categories', 'parts', 'part_relations', 'variant_parts',
    'features', 'variant_features', 'car_media'
  ]
  loop
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$do$;

grant insert, delete on public.favorites to authenticated;
grant update on public.profiles to authenticated;

-- Anonymous visitors read the catalogue but never write anything.
revoke insert, update, delete on all tables in schema public from anon;
