-- ===========================================================================
-- AURIX 0001 - core schema
-- Country -> Manufacturer -> Model -> Variant -> Specifications -> Parts
--
-- Conventions:
--   * uuid primary keys, gen_random_uuid() (pgcrypto ships with Supabase)
--   * slugs use a domain-validated text type, unique within their parent scope
--   * every spec value is NULLABLE on purpose: unknown figures stay NULL and
--     the UI renders "Not available". CHECK constraints only guard ranges that
--     are physically impossible, never presence.
-- ===========================================================================

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Domains and enums
-- ---------------------------------------------------------------------------

create domain public.slug as text
  check (value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

comment on domain public.slug is
  'Lowercase URL segment: alphanumerics separated by single hyphens.';

create type public.fuel_type as enum
  ('petrol', 'diesel', 'hybrid', 'phev', 'electric', 'hydrogen');

create type public.drive_type as enum
  ('fwd', 'rwd', 'awd', '4wd');

create type public.transmission_type as enum
  ('manual', 'automatic', 'dct', 'amt', 'cvt', 'single_speed');

create type public.body_type as enum
  ('hatchback', 'sedan', 'coupe', 'convertible', 'roadster',
   'suv', 'wagon', 'mpv', 'pickup', 'off_road');

create type public.manufacturer_segment as enum
  ('luxury', 'performance', 'mass', 'ev', 'commercial');

-- Combustion layouts only. Electric drive is modelled by fuel_type + ev_specs,
-- so that "V8"-style filtering never has to reason about motors.
create type public.engine_layout as enum
  ('inline', 'vee', 'flat', 'w', 'rotary');

create type public.aspiration as enum
  ('naturally_aspirated', 'turbocharged', 'twin_turbo',
   'supercharged', 'twincharged');

create type public.range_standard as enum
  ('wltp', 'epa', 'arai', 'nedc', 'cltc');

create type public.media_type as enum ('image', 'glb');

create type public.user_role as enum ('user', 'admin');

-- Named groups of the procedural 3D car. Parts reference one of these so the
-- parts encyclopedia can highlight the right group in the viewer.
create type public.viewer_group as enum
  ('body', 'engine', 'transmission', 'suspension', 'brakes',
   'wheels', 'interior', 'electronics', 'battery');

-- ---------------------------------------------------------------------------
-- Shared trigger helper
-- ---------------------------------------------------------------------------

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- countries
-- ---------------------------------------------------------------------------

create table public.countries (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique,
  slug               public.slug not null unique,
  iso_code           char(2) not null unique,
  flag_emoji         text,
  description        text,
  automotive_history text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger countries_updated_at
  before update on public.countries
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- manufacturers
-- ---------------------------------------------------------------------------

create table public.manufacturers (
  id            uuid primary key default gen_random_uuid(),
  country_id    uuid not null references public.countries(id) on delete restrict,
  name          text not null,
  slug          public.slug not null unique,
  logo_url      text,
  founded_year  smallint check (founded_year between 1800 and 2100),
  headquarters  text,
  description   text,
  segment       public.manufacturer_segment not null default 'mass',
  website       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (country_id, name)
);

comment on column public.manufacturers.country_id is
  'ON DELETE RESTRICT: removing a country must not silently orphan its brands.';

create trigger manufacturers_updated_at
  before update on public.manufacturers
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          public.slug not null unique,
  description   text,
  display_order smallint not null default 0
);

-- ---------------------------------------------------------------------------
-- car_models
-- ---------------------------------------------------------------------------

create table public.car_models (
  id               uuid primary key default gen_random_uuid(),
  manufacturer_id  uuid not null references public.manufacturers(id) on delete cascade,
  category_id      uuid not null references public.categories(id) on delete restrict,
  name             text not null,
  slug             public.slug not null,
  generation       text,
  body_type        public.body_type not null,
  description      text,
  production_start smallint check (production_start between 1885 and 2100),
  production_end   smallint check (production_end between 1885 and 2100),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- The route is /cars/[manufacturer]/[model]/[variant], so a model slug only
  -- has to be unique inside its manufacturer.
  unique (manufacturer_id, slug),
  constraint car_models_year_order
    check (production_end is null or production_start is null
           or production_end >= production_start)
);

create trigger car_models_updated_at
  before update on public.car_models
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- engines  (combustion only)
-- ---------------------------------------------------------------------------

create table public.engines (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  layout              public.engine_layout not null,
  cylinders           smallint check (cylinders between 1 and 16),
  displacement_cc     integer  check (displacement_cc > 0),
  aspiration          public.aspiration not null default 'naturally_aspirated',
  fuel_system         text,
  compression_ratio   numeric(4,2) check (compression_ratio > 0),
  redline_rpm         integer check (redline_rpm > 0),
  cooling             text,
  valves_per_cylinder smallint check (valves_per_cylinder between 1 and 8),
  notes               text,
  source              text,
  -- Human-readable label ("V8", "Inline-4", "Flat-6"). Stored rather than
  -- computed in the app so the catalog view can select it directly.
  configuration       text generated always as (
    case layout
      when 'vee'    then 'V'       || coalesce(cylinders::text, '?')
      when 'inline' then 'Inline-' || coalesce(cylinders::text, '?')
      when 'flat'   then 'Flat-'   || coalesce(cylinders::text, '?')
      when 'w'      then 'W'       || coalesce(cylinders::text, '?')
      when 'rotary' then coalesce(cylinders::text, '?') || '-Rotor'
    end
  ) stored
);

-- ---------------------------------------------------------------------------
-- transmissions
-- ---------------------------------------------------------------------------

create table public.transmissions (
  id     uuid primary key default gen_random_uuid(),
  name   text not null unique,
  type   public.transmission_type not null,
  gears  smallint check (gears between 1 and 12),
  notes  text,
  -- A single-speed reduction gear is the only type that must have 1 gear.
  constraint transmissions_single_speed_gears
    check (type <> 'single_speed' or gears is null or gears = 1)
);

-- ---------------------------------------------------------------------------
-- car_variants
-- ---------------------------------------------------------------------------

create table public.car_variants (
  id               uuid primary key default gen_random_uuid(),
  model_id         uuid not null references public.car_models(id) on delete cascade,
  name             text not null,
  slug             public.slug not null,
  year_start       smallint not null check (year_start between 1885 and 2100),
  year_end         smallint check (year_end between 1885 and 2100),
  base_price       numeric(14,2) check (base_price >= 0),
  price_currency   char(3),
  fuel_type        public.fuel_type not null,
  drive_type       public.drive_type not null,
  engine_id        uuid references public.engines(id) on delete set null,
  transmission_id  uuid references public.transmissions(id) on delete set null,
  description      text,
  source           text,
  notes            text,
  is_published     boolean not null default true,
  search_document  tsvector,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (model_id, slug),

  constraint car_variants_year_order
    check (year_end is null or year_end >= year_start),

  -- A price without its currency is meaningless, and vice versa.
  constraint car_variants_price_currency_together
    check ((base_price is null) = (price_currency is null)),

  -- Battery-electric cars have no combustion engine row.
  constraint car_variants_electric_has_no_engine
    check (fuel_type <> 'electric' or engine_id is null)
);

comment on column public.car_variants.source is
  'Where the published figures came from. Part of the data-honesty rule: unknown values stay NULL rather than being estimated.';

create trigger car_variants_updated_at
  before update on public.car_variants
  for each row execute function public.tg_set_updated_at();

-- ---------------------------------------------------------------------------
-- Specification satellites (all 1:1 with a variant)
-- ---------------------------------------------------------------------------

create table public.performance_specs (
  variant_id      uuid primary key references public.car_variants(id) on delete cascade,
  power_hp        integer      check (power_hp > 0),
  power_rpm       integer      check (power_rpm > 0),
  torque_nm       integer      check (torque_nm > 0),
  torque_rpm      integer      check (torque_rpm > 0),
  top_speed_kmh   integer      check (top_speed_kmh > 0),
  zero_to_100_s   numeric(4,2) check (zero_to_100_s > 0),
  zero_to_200_s   numeric(5,2) check (zero_to_200_s > 0),
  quarter_mile_s  numeric(5,2) check (quarter_mile_s > 0),
  braking_100_0_m numeric(5,1) check (braking_100_0_m > 0),
  source          text,
  notes           text,
  constraint performance_specs_200_after_100
    check (zero_to_200_s is null or zero_to_100_s is null
           or zero_to_200_s > zero_to_100_s)
);

create table public.dimensions (
  variant_id           uuid primary key references public.car_variants(id) on delete cascade,
  length_mm            integer check (length_mm > 0),
  width_mm             integer check (width_mm > 0),
  height_mm            integer check (height_mm > 0),
  wheelbase_mm         integer check (wheelbase_mm > 0),
  kerb_weight_kg       integer check (kerb_weight_kg > 0),
  ground_clearance_mm  integer check (ground_clearance_mm > 0),
  boot_capacity_l      integer check (boot_capacity_l >= 0),
  seating_capacity     smallint check (seating_capacity between 1 and 9),
  source               text,
  notes                text,
  constraint dimensions_wheelbase_within_length
    check (wheelbase_mm is null or length_mm is null or wheelbase_mm < length_mm)
);

create table public.fuel_specs (
  variant_id        uuid primary key references public.car_variants(id) on delete cascade,
  tank_capacity_l   numeric(5,1) check (tank_capacity_l > 0),
  mileage_kmpl      numeric(5,2) check (mileage_kmpl > 0),
  co2_g_km          integer check (co2_g_km >= 0),
  emission_standard text,
  source            text,
  notes             text
);

create table public.ev_specs (
  variant_id          uuid primary key references public.car_variants(id) on delete cascade,
  battery_kwh         numeric(6,2) check (battery_kwh > 0),
  usable_battery_kwh  numeric(6,2) check (usable_battery_kwh > 0),
  range_km            integer check (range_km > 0),
  range_standard      public.range_standard,
  max_charge_kw       integer check (max_charge_kw > 0),
  charge_10_80_min    integer check (charge_10_80_min > 0),
  motor_count         smallint check (motor_count between 1 and 4),
  source              text,
  notes               text,
  -- A range figure is not comparable without its test standard, so refuse to
  -- store one without the other.
  constraint ev_specs_range_needs_standard
    check (range_km is null or range_standard is not null),
  constraint ev_specs_usable_lte_gross
    check (usable_battery_kwh is null or battery_kwh is null
           or usable_battery_kwh <= battery_kwh)
);

-- ---------------------------------------------------------------------------
-- Parts encyclopedia
-- ---------------------------------------------------------------------------

create table public.part_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  slug          public.slug not null unique,
  description   text,
  display_order smallint not null default 0
);

create table public.parts (
  id                    uuid primary key default gen_random_uuid(),
  category_id           uuid not null references public.part_categories(id) on delete restrict,
  name                  text not null,
  slug                  public.slug not null unique,
  description           text,
  function              text,
  typical_materials     text,
  location              text,
  common_failure_points text,
  performance_impact    text,
  image_url             text,
  -- Which group of the procedural 3D car to highlight for this part.
  viewer_group          public.viewer_group,
  display_order         smallint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger parts_updated_at
  before update on public.parts
  for each row execute function public.tg_set_updated_at();

-- One canonical row per unordered pair (enforced by the ordering CHECK), so a
-- relationship can never drift out of sync with its mirror image. Queries read
-- it in both directions with a UNION.
create table public.part_relations (
  part_id         uuid not null references public.parts(id) on delete cascade,
  related_part_id uuid not null references public.parts(id) on delete cascade,
  primary key (part_id, related_part_id),
  constraint part_relations_canonical_order check (part_id < related_part_id)
);

create table public.variant_parts (
  variant_id uuid not null references public.car_variants(id) on delete cascade,
  part_id    uuid not null references public.parts(id) on delete cascade,
  detail     text,
  primary key (variant_id, part_id)
);

comment on column public.variant_parts.detail is
  'Variant-specific note, e.g. "Carbon-ceramic discs, 420 mm front".';

-- ---------------------------------------------------------------------------
-- Features
-- ---------------------------------------------------------------------------

create table public.features (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        public.slug not null unique,
  category    text,
  description text
);

create table public.variant_features (
  variant_id uuid not null references public.car_variants(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete cascade,
  detail     text,
  primary key (variant_id, feature_id)
);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

create table public.car_media (
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid references public.car_variants(id) on delete cascade,
  model_id      uuid references public.car_models(id) on delete cascade,
  type          public.media_type not null,
  url           text not null,
  alt           text,
  is_primary    boolean not null default false,
  display_order smallint not null default 0,
  credit        text,
  created_at    timestamptz not null default now(),
  -- Attached to exactly one owner: a variant or a model, never both or neither.
  constraint car_media_exactly_one_owner
    check (num_nonnulls(variant_id, model_id) = 1)
);

-- At most one primary image per owner.
create unique index car_media_one_primary_per_variant
  on public.car_media (variant_id) where is_primary and variant_id is not null;
create unique index car_media_one_primary_per_model
  on public.car_media (model_id) where is_primary and model_id is not null;

-- The 3D viewer loads at most one GLB per variant.
create unique index car_media_one_glb_per_variant
  on public.car_media (variant_id) where type = 'glb' and variant_id is not null;

-- ---------------------------------------------------------------------------
-- Users: profiles and favorites
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         public.user_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

create table public.favorites (
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.car_variants(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

-- ===========================================================================
-- Triggers: derived data and cross-table invariants
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Full-text search document
--
-- The searchable text spans manufacturer + model + variant, which live in
-- three tables. A GENERATED column cannot reference other tables and a VIEW
-- cannot be indexed, so the index has to live on a real column of
-- car_variants, maintained by a BEFORE trigger (no recursion: it assigns to
-- NEW directly rather than issuing an UPDATE).
--
-- Weights: A = brand/model, B = variant name, C = category/country, D = prose.
-- The 'simple' dictionary is used for proper nouns so that stemming does not
-- mangle names like "Ferrari" or "Quattro"; prose uses 'english'.
-- ---------------------------------------------------------------------------

create or replace function public.tg_car_variants_search_document()
returns trigger
language plpgsql
as $fn$
declare
  v_manufacturer text;
  v_model        text;
  v_category     text;
  v_country      text;
begin
  select mf.name, m.name, c.name, co.name
    into v_manufacturer, v_model, v_category, v_country
  from public.car_models m
  join public.manufacturers mf on mf.id = m.manufacturer_id
  join public.countries co     on co.id = mf.country_id
  join public.categories c     on c.id  = m.category_id
  where m.id = new.model_id;

  new.search_document :=
       setweight(to_tsvector('simple',  coalesce(v_manufacturer, '')), 'A')
    || setweight(to_tsvector('simple',  coalesce(v_model, '')),        'A')
    || setweight(to_tsvector('simple',  coalesce(new.name, '')),       'B')
    || setweight(to_tsvector('simple',  coalesce(v_category, '')),     'C')
    || setweight(to_tsvector('simple',  coalesce(v_country, '')),      'C')
    || setweight(to_tsvector('english', coalesce(new.description, '')), 'D');

  return new;
end;
$fn$;

create trigger car_variants_search_document
  before insert or update on public.car_variants
  for each row execute function public.tg_car_variants_search_document();

-- When a model or manufacturer is renamed, the variants' search documents go
-- stale. Touching the rows re-fires the BEFORE trigger above.
create or replace function public.tg_refresh_variant_search_for_model()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name then
    update public.car_variants set updated_at = updated_at where model_id = new.id;
  end if;
  return new;
end;
$fn$;

create trigger car_models_refresh_search
  after update on public.car_models
  for each row execute function public.tg_refresh_variant_search_for_model();

create or replace function public.tg_refresh_variant_search_for_manufacturer()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name then
    update public.car_variants v
       set updated_at = v.updated_at
      from public.car_models m
     where m.id = v.model_id and m.manufacturer_id = new.id;
  end if;
  return new;
end;
$fn$;

create trigger manufacturers_refresh_search
  after update on public.manufacturers
  for each row execute function public.tg_refresh_variant_search_for_manufacturer();

-- ---------------------------------------------------------------------------
-- Powertrain consistency
--
-- "fuel_specs only for ICE/hybrid" and "ev_specs only for EV/PHEV" are
-- cross-table rules: a CHECK constraint cannot read car_variants, so these are
-- triggers.
-- ---------------------------------------------------------------------------

create or replace function public.tg_fuel_specs_powertrain()
returns trigger
language plpgsql
as $fn$
declare
  v_fuel public.fuel_type;
begin
  select fuel_type into v_fuel
    from public.car_variants where id = new.variant_id;

  if v_fuel = 'electric' then
    raise exception
      'fuel_specs cannot be attached to a battery-electric variant (%)',
      new.variant_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

create trigger fuel_specs_powertrain
  before insert or update on public.fuel_specs
  for each row execute function public.tg_fuel_specs_powertrain();

create or replace function public.tg_ev_specs_powertrain()
returns trigger
language plpgsql
as $fn$
declare
  v_fuel public.fuel_type;
begin
  select fuel_type into v_fuel
    from public.car_variants where id = new.variant_id;

  if v_fuel not in ('electric', 'phev', 'hybrid') then
    raise exception
      'ev_specs cannot be attached to a % variant (%)', v_fuel, new.variant_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

create trigger ev_specs_powertrain
  before insert or update on public.ev_specs
  for each row execute function public.tg_ev_specs_powertrain();

-- ---------------------------------------------------------------------------
-- Profile bootstrap: every auth user gets exactly one profile row.
-- SECURITY DEFINER because the inserting role is the auth system, not the user.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Role escalation guard
--
-- RLS lets a user UPDATE their own profiles row, but they must not be able to
-- make themselves an admin. A WITH CHECK clause cannot express "this column
-- specifically may not change", so a BEFORE trigger restores the old value.
-- ---------------------------------------------------------------------------

create or replace function public.tg_protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $fn$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$fn$;
-- NOTE: the trigger itself is created in 0002_rls.sql, after is_admin() exists.

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Foreign keys (Postgres does not index the referencing side automatically).
create index manufacturers_country_id_idx   on public.manufacturers (country_id);
create index car_models_manufacturer_id_idx on public.car_models (manufacturer_id);
create index car_models_category_id_idx     on public.car_models (category_id);
create index car_variants_model_id_idx      on public.car_variants (model_id);
create index car_variants_engine_id_idx     on public.car_variants (engine_id);
create index car_variants_transmission_id_idx on public.car_variants (transmission_id);
create index parts_category_id_idx          on public.parts (category_id);
create index part_relations_related_idx     on public.part_relations (related_part_id);
create index variant_parts_part_id_idx      on public.variant_parts (part_id);
create index variant_features_feature_id_idx on public.variant_features (feature_id);
create index car_media_variant_id_idx       on public.car_media (variant_id);
create index car_media_model_id_idx         on public.car_media (model_id);
create index favorites_variant_id_idx       on public.favorites (variant_id);

-- Filter facets used by /cars and the query parser.
create index car_variants_fuel_type_idx  on public.car_variants (fuel_type);
create index car_variants_drive_type_idx on public.car_variants (drive_type);
create index car_variants_base_price_idx on public.car_variants (base_price);
create index car_variants_year_start_idx on public.car_variants (year_start);
create index car_models_body_type_idx    on public.car_models (body_type);
create index engines_layout_cylinders_idx on public.engines (layout, cylinders);
create index engines_aspiration_idx      on public.engines (aspiration);
create index transmissions_type_idx      on public.transmissions (type);
create index manufacturers_segment_idx   on public.manufacturers (segment);

-- Sort/range facets. DESC NULLS LAST matches how the grid orders by default,
-- so the index can serve the ordering directly.
create index performance_specs_power_hp_idx
  on public.performance_specs (power_hp desc nulls last);
create index performance_specs_top_speed_idx
  on public.performance_specs (top_speed_kmh desc nulls last);
create index performance_specs_zero_to_100_idx
  on public.performance_specs (zero_to_100_s asc nulls last);

-- Search: full-text over the maintained document, plus trigram indexes for
-- fuzzy/partial matching on names (so "porche" or "hurac" still find things).
create index car_variants_search_document_idx
  on public.car_variants using gin (search_document);
create index car_variants_name_trgm_idx
  on public.car_variants using gin (name extensions.gin_trgm_ops);
create index car_models_name_trgm_idx
  on public.car_models using gin (name extensions.gin_trgm_ops);
create index manufacturers_name_trgm_idx
  on public.manufacturers using gin (name extensions.gin_trgm_ops);
create index parts_name_trgm_idx
  on public.parts using gin (name extensions.gin_trgm_ops);

-- ===========================================================================
-- car_catalog: the read-optimized view behind the grid, search and compare.
--
-- security_invoker = true is REQUIRED. Without it a view executes with the
-- privileges of its owner, which would bypass the row level security on every
-- base table it reads.
-- ===========================================================================

create view public.car_catalog
with (security_invoker = true)
as
select
  v.id                      as variant_id,
  v.slug                    as variant_slug,
  v.name                    as variant_name,
  v.year_start,
  v.year_end,
  v.base_price,
  v.price_currency,
  v.fuel_type,
  v.drive_type,
  v.description             as variant_description,
  v.is_published,
  v.search_document,

  m.id                      as model_id,
  m.slug                    as model_slug,
  m.name                    as model_name,
  m.generation,
  m.body_type,

  mf.id                     as manufacturer_id,
  mf.slug                   as manufacturer_slug,
  mf.name                   as manufacturer_name,
  mf.logo_url               as manufacturer_logo_url,
  mf.segment                as manufacturer_segment,

  co.id                     as country_id,
  co.slug                   as country_slug,
  co.name                   as country_name,
  co.flag_emoji             as country_flag_emoji,

  cat.id                    as category_id,
  cat.slug                  as category_slug,
  cat.name                  as category_name,

  ps.power_hp,
  ps.torque_nm,
  ps.top_speed_kmh,
  ps.zero_to_100_s,

  d.kerb_weight_kg,
  d.length_mm,

  e.id                      as engine_id,
  e.name                    as engine_name,
  e.layout                  as engine_layout,
  e.cylinders               as engine_cylinders,
  e.displacement_cc,
  e.aspiration,
  e.configuration           as engine_configuration,

  t.id                      as transmission_id,
  t.name                    as transmission_name,
  t.type                    as transmission_type,
  t.gears                   as transmission_gears,

  ev.battery_kwh,
  ev.range_km,
  ev.range_standard,

  fs.mileage_kmpl,

  -- Power-to-weight in hp per tonne, the input to the Car DNA performance bar.
  case
    when ps.power_hp is not null and d.kerb_weight_kg is not null
    then round((ps.power_hp::numeric * 1000) / d.kerb_weight_kg, 1)
  end                       as power_to_weight_hp_per_tonne,

  -- Primary image for the grid card, if one has been registered.
  (
    select cm.url
    from public.car_media cm
    where cm.variant_id = v.id and cm.type = 'image' and cm.is_primary
    limit 1
  )                         as primary_image_url,

  -- Whether a GLB exists, so the viewer knows before loading whether to expect
  -- a real model or fall back to the procedural car.
  exists (
    select 1 from public.car_media cm
    where cm.variant_id = v.id and cm.type = 'glb'
  )                         as has_glb

from public.car_variants v
join public.car_models     m   on m.id  = v.model_id
join public.manufacturers  mf  on mf.id = m.manufacturer_id
join public.countries      co  on co.id = mf.country_id
join public.categories     cat on cat.id = m.category_id
left join public.performance_specs ps on ps.variant_id = v.id
left join public.dimensions        d  on d.variant_id  = v.id
left join public.ev_specs          ev on ev.variant_id = v.id
left join public.fuel_specs        fs on fs.variant_id = v.id
left join public.engines           e  on e.id = v.engine_id
left join public.transmissions     t  on t.id = v.transmission_id;

comment on view public.car_catalog is
  'Denormalized read model for the car grid, search and compare pages. Runs with security_invoker so base-table RLS still applies.';
