-- ===========================================================================
-- AURIX 0003 - storage buckets
--
-- Five public-read buckets. Write access is admin-only, enforced by policies
-- on storage.objects using the same public.is_admin() helper as the catalogue.
--
-- Public read means the object URLs are stable and can be served through
-- next/image without signing, which is what car_media.url stores:
--   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('cars',          'cars',          true,  10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('manufacturers', 'manufacturers', true,   2097152,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('countries',     'countries',     true,   2097152,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('parts',         'parts',         true,  10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  -- GLB files are large; 50 MB is generous but keeps a bad upload from
  -- becoming a page-weight problem.
  ('models-3d',     'models-3d',     true,  52428800,
   array['model/gltf-binary', 'application/octet-stream'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects
--
-- Supabase enables RLS on storage.objects for us; we only add policies.
-- Dropped first so this migration can be re-run safely from the SQL Editor.
-- ---------------------------------------------------------------------------

drop policy if exists aurix_public_read    on storage.objects;
drop policy if exists aurix_admin_insert   on storage.objects;
drop policy if exists aurix_admin_update   on storage.objects;
drop policy if exists aurix_admin_delete   on storage.objects;

create policy aurix_public_read
  on storage.objects for select to anon, authenticated
  using (bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d'));

create policy aurix_admin_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d')
    and public.is_admin()
  );

create policy aurix_admin_update
  on storage.objects for update to authenticated
  using (
    bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d')
    and public.is_admin()
  )
  with check (
    bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d')
    and public.is_admin()
  );

create policy aurix_admin_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d')
    and public.is_admin()
  );
