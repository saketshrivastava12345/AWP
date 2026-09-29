-- ===========================================================================
-- AURIX 0006 - where the engine sits
--
-- The 3D anatomy tour flies the camera to the engine. For most cars that is
-- under the bonnet, but a 911's flat-six hangs behind the rear axle and a
-- Huracán's V10 sits between the cabin and the rear axle. Guessing from the
-- body type or category would put the 911's engine under its luggage lid, so
-- the position is recorded as data instead.
--
-- It is a property of the MODEL, not the variant: every 911 is rear-engined.
-- NULL means "no combustion engine" (battery-electric models) or "not
-- recorded"; the viewer then shows no engine rather than inventing one.
--
-- Values are filled in by supabase/seed.sql, which is idempotent, so running
-- `npm run db:seed` after this migration populates an existing database.
-- ===========================================================================

create type public.engine_position as enum ('front', 'mid', 'rear');

alter table public.car_models
  add column engine_position public.engine_position;

comment on column public.car_models.engine_position is
  'front: ahead of the cabin. mid: between the cabin and the rear axle. rear: behind the rear axle. NULL for battery-electric models.';
