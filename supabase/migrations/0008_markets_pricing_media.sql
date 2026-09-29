-- ===========================================================================
-- AURIX 0008 - markets, sourced pricing, provenance, media and generations
--
-- Extends the existing schema; nothing is replaced. In summary:
--
--   * market_regions / market_cities: where a price applies (India ->
--     Maharashtra -> Mumbai). Countries stay the existing table.
--   * market_prices: every price is a sourced, dated observation. History is
--     the set of rows over time (effective_from / effective_to), so there is
--     no second "price_history" table to drift out of sync with the first.
--     current_market_prices is the in-force subset.
--   * Provenance (source_url, last_verified_at) on the specification tables.
--   * car_media gains licence and provenance fields, a shot type for the
--     gallery, and 3D-model metadata, including whether a model is the EXACT
--     vehicle or only a representation.
--   * car_generations, vehicle lifecycle status and per-market availability.
--   * car_colors (catalogued paint options) and recently_viewed.
--   * search_catalogue(): typo-tolerant search for the command palette.
--
-- DATA HONESTY: this migration adds structure only. It inserts no prices, no
-- colours and no availability. Those arrive through the admin tools with a
-- source, a source URL and a verification date, or not at all.
--
-- SECURITY: Supabase grants new tables to anon/authenticated by default, so
-- every table below enables RLS, gets explicit policies and explicit grants.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Lifecycle of a variant. NULL = not recorded; the UI then derives only what
-- the years say (a variant with a past year_end is no longer current).
create type public.vehicle_status as enum
  ('available', 'upcoming', 'discontinued', 'concept', 'limited', 'sold_out');

create type public.market_status as enum
  ('available', 'upcoming', 'discontinued', 'not_available');

-- What kind of figure a source published. AURIX's own sum of the components
-- ("calculated on-road") is never stored: it is derived in the UI and
-- labelled as a calculation.
create type public.price_type as enum
  ('manufacturer_list', 'dealer_list', 'ex_showroom', 'on_road', 'estimated_on_road');

create type public.media_shot as enum
  ('hero', 'front', 'rear', 'side', 'three_quarter', 'interior', 'dashboard',
   'engine', 'wheel', 'detail', 'gallery');

create type public.paint_finish as enum
  ('solid', 'metallic', 'pearl', 'matte', 'satin');

-- ---------------------------------------------------------------------------
-- Countries: the currency prices in that market are quoted in by default.
-- ---------------------------------------------------------------------------

alter table public.countries
  add column currency_code char(3)
    constraint countries_currency_code_iso check (currency_code ~ '^[A-Z]{3}$');

-- ---------------------------------------------------------------------------
-- Market geography
-- ---------------------------------------------------------------------------

create table public.market_regions (
  id            uuid primary key default gen_random_uuid(),
  country_id    uuid not null references public.countries(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  slug          public.slug not null,
  display_order smallint not null default 0,
  created_at    timestamptz not null default now(),
  unique (country_id, slug),
  unique (country_id, name),
  -- Target of market_prices' composite FK: a region cannot move country
  -- while prices reference it.
  constraint market_regions_id_country_key unique (id, country_id)
);

comment on table public.market_regions is
  'States, provinces or union territories that on-road prices can differ by.';

create table public.market_cities (
  id            uuid primary key default gen_random_uuid(),
  region_id     uuid not null references public.market_regions(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  slug          public.slug not null,
  display_order smallint not null default 0,
  created_at    timestamptz not null default now(),
  unique (region_id, slug),
  unique (region_id, name),
  constraint market_cities_id_region_key unique (id, region_id)
);

-- ---------------------------------------------------------------------------
-- Provenance on the specification tables
-- ---------------------------------------------------------------------------

alter table public.car_variants
  add column source_url text
    constraint car_variants_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.performance_specs
  add column source_url text
    constraint performance_specs_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.dimensions
  add column source_url text
    constraint dimensions_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.fuel_specs
  add column source_url text
    constraint fuel_specs_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.ev_specs
  add column source_url text
    constraint ev_specs_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.engines
  add column source_url text
    constraint engines_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

alter table public.transmissions
  add column source text,
  add column source_url text
    constraint transmissions_source_url_http check (source_url ~* '^https?://'),
  add column last_verified_at date;

-- ---------------------------------------------------------------------------
-- Generations
--
-- car_models.generation stays (the catalogue and seed read it), but a
-- generation is now a row a variant can point at, so one nameplate can carry
-- 996, 997, 991 and 992 with their own years.
-- ---------------------------------------------------------------------------

create table public.car_generations (
  id          uuid primary key default gen_random_uuid(),
  model_id    uuid not null references public.car_models(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  slug        public.slug not null,
  year_start  smallint check (year_start between 1885 and 2100),
  year_end    smallint check (year_end between 1885 and 2100),
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (model_id, slug),
  constraint car_generations_id_model_key unique (id, model_id),
  constraint car_generations_year_order
    check (year_end is null or year_start is null or year_end >= year_start)
);

create trigger car_generations_updated_at
  before update on public.car_generations
  for each row execute function public.tg_set_updated_at();

alter table public.car_variants
  add column generation_id uuid references public.car_generations(id) on delete set null,
  add column status public.vehicle_status;

comment on column public.car_variants.status is
  'Lifecycle as recorded from a source. NULL = not recorded (never guessed).';

-- A variant may only point at a generation of its own model.
create or replace function public.tg_car_variants_generation_model()
returns trigger
language plpgsql
as $fn$
begin
  if new.generation_id is not null and not exists (
    select 1 from public.car_generations g
    where g.id = new.generation_id and g.model_id = new.model_id
  ) then
    raise exception 'Generation % does not belong to model %', new.generation_id, new.model_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$fn$;

create trigger car_variants_generation_model
  before insert or update of generation_id, model_id on public.car_variants
  for each row execute function public.tg_car_variants_generation_model();

-- The trigger only guards the variant side. The composite FK also stops a
-- generation being moved to another model while variants point at it
-- (NO ACTION on update). Deleting a generation still just clears
-- generation_id, never model_id.
alter table public.car_variants
  add constraint car_variants_generation_same_model
    foreign key (generation_id, model_id)
    references public.car_generations (id, model_id)
    on delete set null (generation_id);

-- Backfill one generation per model from the existing free-text column. On a
-- fresh database this finds nothing (the seed runs later and does the same).
insert into public.car_generations (model_id, name, slug, year_start, year_end)
select m.id, trim(m.generation), g.slug, m.production_start, m.production_end
from public.car_models m
cross join lateral (
  select lower(regexp_replace(regexp_replace(trim(m.generation), '[^A-Za-z0-9]+', '-', 'g'),
                              '(^-+|-+$)', '', 'g')) as slug
) g
where m.generation is not null and g.slug <> ''
on conflict (model_id, slug) do nothing;

update public.car_variants v
   set generation_id = g.id
  from public.car_generations g
  join public.car_models m on m.id = g.model_id
 where v.model_id = m.id
   and v.generation_id is null
   and g.name = trim(m.generation);

-- Accidental duplicates: the same variant name twice for the same model year.
create unique index car_variants_no_duplicate_name
  on public.car_variants (model_id, lower(name), year_start);

-- ---------------------------------------------------------------------------
-- Market availability
-- ---------------------------------------------------------------------------

create table public.variant_markets (
  variant_id       uuid not null references public.car_variants(id) on delete cascade,
  country_id       uuid not null references public.countries(id) on delete cascade,
  status           public.market_status not null,
  source           text not null check (length(trim(source)) > 0),
  source_url       text constraint variant_markets_source_url_http check (source_url ~* '^https?://'),
  last_verified_at date,
  notes            text,
  primary key (variant_id, country_id)
);

-- ---------------------------------------------------------------------------
-- Market prices
-- ---------------------------------------------------------------------------

create table public.market_prices (
  id                 uuid primary key default gen_random_uuid(),
  variant_id         uuid not null references public.car_variants(id) on delete cascade,
  country_id         uuid not null references public.countries(id) on delete restrict,
  region_id          uuid references public.market_regions(id) on delete restrict,
  city_id            uuid references public.market_cities(id) on delete restrict,
  currency           char(3) not null constraint market_prices_currency_iso check (currency ~ '^[A-Z]{3}$'),
  price_type         public.price_type not null,

  -- The vehicle's listed price before on-road charges. For manufacturer_list
  -- and dealer_list rows this is the listed price itself.
  ex_showroom_price  numeric(14,2) check (ex_showroom_price > 0),
  rto_tax            numeric(14,2) check (rto_tax >= 0),
  registration_fee   numeric(14,2) check (registration_fee >= 0),
  insurance_estimate numeric(14,2) check (insurance_estimate >= 0),
  handling_charges   numeric(14,2) check (handling_charges >= 0),
  fastag             numeric(10,2) check (fastag >= 0),
  other_charges      numeric(14,2) check (other_charges >= 0),
  -- A total as published by the source. Never written by AURIX itself.
  on_road_price      numeric(14,2) check (on_road_price > 0),

  source             text not null check (length(trim(source)) > 0),
  source_url         text not null constraint market_prices_source_url_http check (source_url ~* '^https?://'),
  effective_from     date not null default current_date,
  effective_to       date,
  last_verified_at   date not null default current_date,
  is_verified        boolean not null default false,
  notes              text,
  created_by         uuid default auth.uid() references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint market_prices_city_needs_region check (city_id is null or region_id is not null),
  constraint market_prices_period check (effective_to is null or effective_to >= effective_from),
  constraint market_prices_listed_types_have_price
    check (price_type in ('on_road', 'estimated_on_road') or ex_showroom_price is not null),
  constraint market_prices_on_road_types_have_total
    check (price_type not in ('on_road', 'estimated_on_road') or on_road_price is not null),
  -- A published total belongs only to an on-road row; on a listed row it
  -- would be shown under the listed type's label.
  constraint market_prices_total_only_on_road
    check (price_type in ('on_road', 'estimated_on_road') or on_road_price is null),
  -- Region/city must stay inside the stated country/region, including when
  -- the region or city itself is edited later (the trigger below only sees
  -- writes to this table).
  constraint market_prices_region_in_country
    foreign key (region_id, country_id) references public.market_regions (id, country_id),
  constraint market_prices_city_in_region
    foreign key (city_id, region_id) references public.market_cities (id, region_id),
  constraint market_prices_one_per_scope_and_date
    unique nulls not distinct (variant_id, country_id, region_id, city_id, price_type, effective_from)
);

comment on table public.market_prices is
  'Sourced price observations per variant and market. A row is history once effective_to has passed; current_market_prices selects the rows in force.';

-- Region/city must belong to the stated country/region, and the currency
-- defaults to the country's.
create or replace function public.tg_market_prices_scope()
returns trigger
language plpgsql
as $fn$
declare
  v_country uuid;
  v_region  uuid;
begin
  if new.region_id is not null then
    select country_id into v_country from public.market_regions where id = new.region_id;
    if v_country is distinct from new.country_id then
      raise exception 'Region % is not in country %', new.region_id, new.country_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.city_id is not null then
    select region_id into v_region from public.market_cities where id = new.city_id;
    if v_region is distinct from new.region_id then
      raise exception 'City % is not in region %', new.city_id, new.region_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.currency is null then
    select currency_code into new.currency from public.countries where id = new.country_id;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$fn$;

create trigger market_prices_scope
  before insert or update on public.market_prices
  for each row execute function public.tg_market_prices_scope();

create index market_prices_variant_idx
  on public.market_prices (variant_id, price_type, effective_from desc);
create index market_prices_market_idx
  on public.market_prices (country_id, region_id, city_id);
create index market_prices_region_idx on public.market_prices (region_id);
create index market_prices_city_idx   on public.market_prices (city_id);

-- The rows in force today: per variant, market and price type, take the
-- latest row that has started, then drop it if it has ended. Filtering on
-- effective_to first would let an older, superseded open-ended row resurface
-- once the newer row is closed. NULL region/city compare equal in DISTINCT ON,
-- which is exactly the "national price" scope. created_by is left out: it
-- would reveal which accounts are admins.
create view public.current_market_prices
with (security_invoker = true)
as
select latest.*
from (
  select distinct on (p.variant_id, p.country_id, p.region_id, p.city_id, p.price_type)
    p.id, p.variant_id, p.country_id, p.region_id, p.city_id, p.currency, p.price_type,
    p.ex_showroom_price, p.rto_tax, p.registration_fee, p.insurance_estimate,
    p.handling_charges, p.fastag, p.other_charges, p.on_road_price, p.source, p.source_url,
    p.effective_from, p.effective_to, p.last_verified_at, p.is_verified, p.notes,
    p.created_at, p.updated_at
  from public.market_prices p
  where p.effective_from <= current_date
  order by p.variant_id, p.country_id, p.region_id, p.city_id, p.price_type,
           p.effective_from desc, p.last_verified_at desc
) latest
where latest.effective_to is null or latest.effective_to >= current_date;

-- ---------------------------------------------------------------------------
-- Media: provenance, gallery shot types, 3D-model metadata
-- ---------------------------------------------------------------------------

alter table public.car_media
  add column shot            public.media_shot,
  add column source          text,
  add column source_url      text
    constraint car_media_source_url_http check (source_url ~* '^https?://'),
  add column license         text,
  add column author          text,
  add column storage_path    text,
  add column width           integer check (width > 0),
  add column height          integer check (height > 0),
  add column file_size_bytes bigint  check (file_size_bytes > 0),
  add column model_format    text
    constraint car_media_model_format_values check (model_format in ('glb', 'gltf')),
  add column compression     text[] not null default '{}'
    constraint car_media_compression_values
      check (compression <@ array['draco', 'ktx2', 'meshopt']::text[]),
  add column is_exact_model  boolean,
  add column model_version   text,
  add column poster_url      text,
  add column updated_at      timestamptz not null default now();

-- 3D fields only on 3D rows, and every 3D model must say whether it is the
-- exact vehicle or a representation of it. There is no default: the person
-- adding a model has to answer the question.
alter table public.car_media
  add constraint car_media_model_fields_only_on_glb
    check (type = 'glb' or (model_format is null and cardinality(compression) = 0
                            and is_exact_model is null and model_version is null)),
  add constraint car_media_glb_declares_fidelity
    check (type <> 'glb' or is_exact_model is not null);

create trigger car_media_updated_at
  before update on public.car_media
  for each row execute function public.tg_set_updated_at();

create index car_media_variant_shot_idx on public.car_media (variant_id, shot);

-- ---------------------------------------------------------------------------
-- Catalogued paint colours (per model). `hex` is a rendering approximation of
-- the named paint for the configurator; the NAME is the sourced fact.
-- ---------------------------------------------------------------------------

create table public.car_colors (
  id            uuid primary key default gen_random_uuid(),
  model_id      uuid not null references public.car_models(id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  hex           char(7) not null check (hex ~ '^#[0-9a-fA-F]{6}$'),
  finish        public.paint_finish not null,
  source        text not null check (length(trim(source)) > 0),
  source_url    text constraint car_colors_source_url_http check (source_url ~* '^https?://'),
  display_order smallint not null default 0,
  created_at    timestamptz not null default now(),
  unique (model_id, name)
);

-- ---------------------------------------------------------------------------
-- Recently viewed (signed-in users only; guests keep theirs in the browser)
-- ---------------------------------------------------------------------------

create table public.recently_viewed (
  user_id    uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.car_variants(id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create index recently_viewed_user_time_idx
  on public.recently_viewed (user_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Search document freshness
--
-- 0001 refreshed variant search documents when a model or manufacturer was
-- renamed. Moving a model to another category, a maker to another country, or
-- renaming either of those also changes what the document should contain.
-- ---------------------------------------------------------------------------

create or replace function public.tg_refresh_variant_search_for_model()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name or new.category_id is distinct from old.category_id then
    update public.car_variants set updated_at = updated_at where model_id = new.id;
  end if;
  return new;
end;
$fn$;

create or replace function public.tg_refresh_variant_search_for_manufacturer()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name or new.country_id is distinct from old.country_id then
    update public.car_variants v
       set updated_at = v.updated_at
      from public.car_models m
     where m.id = v.model_id and m.manufacturer_id = new.id;
  end if;
  return new;
end;
$fn$;

create or replace function public.tg_refresh_variant_search_for_category()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name then
    update public.car_variants v
       set updated_at = v.updated_at
      from public.car_models m
     where m.id = v.model_id and m.category_id = new.id;
  end if;
  return new;
end;
$fn$;

create trigger categories_refresh_search
  after update on public.categories
  for each row execute function public.tg_refresh_variant_search_for_category();

create or replace function public.tg_refresh_variant_search_for_country()
returns trigger
language plpgsql
as $fn$
begin
  if new.name is distinct from old.name then
    update public.car_variants v
       set updated_at = v.updated_at
      from public.car_models m
      join public.manufacturers mf on mf.id = m.manufacturer_id
     where m.id = v.model_id and mf.country_id = new.id;
  end if;
  return new;
end;
$fn$;

create trigger countries_refresh_search
  after update on public.countries
  for each row execute function public.tg_refresh_variant_search_for_country();

-- ---------------------------------------------------------------------------
-- car_catalog: same columns in the same order (CREATE OR REPLACE requires
-- it), with new columns appended.
--
--   primary_image_url now falls back to any variant image, then the model's
--   primary image, so a photograph registered once per model is used.
--   listed_price_*: the most recently verified in-force listed price for the
--   variant (any market), else the variant's base_price. Always shown with its
--   type and market; never converted.
-- ---------------------------------------------------------------------------

create or replace view public.car_catalog
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

  case
    when ps.power_hp is not null and d.kerb_weight_kg is not null
    then round((ps.power_hp::numeric * 1000) / d.kerb_weight_kg, 1)
  end                       as power_to_weight_hp_per_tonne,

  coalesce(
    (select cm.url from public.car_media cm
      where cm.variant_id = v.id and cm.type = 'image' and cm.is_primary limit 1),
    (select cm.url from public.car_media cm
      where cm.variant_id = v.id and cm.type = 'image'
      order by cm.display_order, cm.created_at limit 1),
    (select cm.url from public.car_media cm
      where cm.model_id = m.id and cm.type = 'image'
      order by cm.is_primary desc, cm.display_order, cm.created_at limit 1)
  )                         as primary_image_url,

  exists (
    select 1 from public.car_media cm
    where cm.variant_id = v.id and cm.type = 'glb'
  )                         as has_glb,

  -- Appended in 0008 ---------------------------------------------------------
  v.status,
  v.generation_id,
  g.name                    as generation_name,
  m.engine_position,
  ev.motor_count,
  coalesce(lp.amount, v.base_price)               as listed_price,
  coalesce(lp.currency, v.price_currency)         as listed_price_currency,
  coalesce(lp.price_type::text,
           case when v.base_price is not null then 'base_price' end)
                                                  as listed_price_type,
  lp.market_label                                 as listed_price_market,
  lp.last_verified_at                             as listed_price_verified_at

from public.car_variants v
join public.car_models     m   on m.id  = v.model_id
join public.manufacturers  mf  on mf.id = m.manufacturer_id
join public.countries      co  on co.id = mf.country_id
join public.categories     cat on cat.id = m.category_id
left join public.car_generations   g  on g.id = v.generation_id
left join public.performance_specs ps on ps.variant_id = v.id
left join public.dimensions        d  on d.variant_id  = v.id
left join public.ev_specs          ev on ev.variant_id = v.id
left join public.fuel_specs        fs on fs.variant_id = v.id
left join public.engines           e  on e.id = v.engine_id
left join public.transmissions     t  on t.id = v.transmission_id
left join lateral (
  select cp.ex_showroom_price as amount,
         cp.currency,
         cp.price_type,
         concat_ws(', ', ci.name, rg.name, pc.name) as market_label,
         cp.last_verified_at
  from public.current_market_prices cp
  join public.countries pc on pc.id = cp.country_id
  left join public.market_regions rg on rg.id = cp.region_id
  left join public.market_cities  ci on ci.id = cp.city_id
  where cp.variant_id = v.id
    and cp.price_type in ('manufacturer_list', 'dealer_list', 'ex_showroom')
  order by cp.is_verified desc, cp.last_verified_at desc, cp.ex_showroom_price asc
  limit 1
) lp on true;

-- ---------------------------------------------------------------------------
-- search_catalogue(q): the command palette's query.
--
-- Full-text prefix matching over each variant's maintained search document
-- ("911 gt" finds 911 GT3), plus trigram word similarity so a typo still
-- lands ("porche"). SECURITY INVOKER, so drafts stay hidden by RLS.
-- ---------------------------------------------------------------------------

create or replace function public.search_catalogue(q text, per_kind integer default 6)
returns table (
  kind      text,
  id        uuid,
  title     text,
  subtitle  text,
  href      text,
  image_url text,
  score     real
)
language plpgsql
stable
security invoker
set search_path = public, extensions, pg_temp
as $fn$
declare
  -- Capped here as well as in the app: the function is callable directly by
  -- anon through /rest/v1/rpc, and unbounded input is slow or overflows.
  cleaned text := lower(trim(regexp_replace(left(coalesce(q, ''), 80), '[^[:alnum:][:space:]-]', ' ', 'g')));
  lim     integer := least(greatest(coalesce(per_kind, 6), 1), 20);
  tsq     tsquery;
begin
  if length(cleaned) < 1 then
    return;
  end if;

  select to_tsquery('simple', string_agg(quote_literal(w) || ':*', ' & '))
    into tsq
    from unnest((regexp_split_to_array(cleaned, '\s+'))[1:8]) as w
   where w <> '';

  return query
  (
    select 'car'::text, v.id,
           -- "Ferrari F8 Tributo", not "Ferrari F8 Tributo F8 Tributo": many
           -- single-variant models repeat the model name as the variant name.
           mf.name || ' ' || m.name
             || case when lower(v.name) = lower(m.name) then '' else ' ' || v.name end,
           concat_ws(' · ', cat.name, v.year_start::text),
           '/cars/' || mf.slug || '/' || m.slug || '/' || v.slug,
           coalesce(
             (select cm.url from public.car_media cm
               where cm.variant_id = v.id and cm.type = 'image'
               order by cm.is_primary desc, cm.display_order limit 1),
             (select cm.url from public.car_media cm
               where cm.model_id = m.id and cm.type = 'image'
               order by cm.is_primary desc, cm.display_order limit 1)),
           (coalesce(ts_rank(v.search_document, tsq), 0)
             + word_similarity(cleaned, lower(mf.name || ' ' || m.name || ' ' || v.name)))::real as s
    from public.car_variants v
    join public.car_models m     on m.id = v.model_id
    join public.manufacturers mf on mf.id = m.manufacturer_id
    join public.categories cat   on cat.id = m.category_id
    where (tsq is not null and v.search_document @@ tsq)
       or word_similarity(cleaned, lower(mf.name || ' ' || m.name || ' ' || v.name)) > 0.45
    order by s desc, v.name
    limit lim
  )
  union all
  (
    select 'manufacturer'::text, mf.id, mf.name, co.name,
           '/manufacturers/' || mf.slug, mf.logo_url,
           greatest(word_similarity(cleaned, lower(mf.name)),
                    case when lower(mf.name) like cleaned || '%' then 1 else 0 end)::real as s
    from public.manufacturers mf
    join public.countries co on co.id = mf.country_id
    where lower(mf.name) like '%' || cleaned || '%'
       or word_similarity(cleaned, lower(mf.name)) > 0.45
    order by s desc, mf.name
    limit lim
  )
  union all
  (
    select 'country'::text, co.id, co.name, co.flag_emoji,
           '/countries/' || co.slug, null::text,
           greatest(word_similarity(cleaned, lower(co.name)),
                    case when lower(co.name) like cleaned || '%' then 1 else 0 end)::real as s
    from public.countries co
    where lower(co.name) like '%' || cleaned || '%'
       or word_similarity(cleaned, lower(co.name)) > 0.45
    order by s desc, co.name
    limit lim
  )
  union all
  (
    select 'part'::text, p.id, p.name, pc.name,
           '/parts/' || p.slug, p.image_url,
           greatest(word_similarity(cleaned, lower(p.name)),
                    case when lower(p.name) like cleaned || '%' then 1 else 0 end)::real as s
    from public.parts p
    join public.part_categories pc on pc.id = p.category_id
    where lower(p.name) like '%' || cleaned || '%'
       or word_similarity(cleaned, lower(p.name)) > 0.45
    order by s desc, p.name
    limit lim
  );
end;
$fn$;

comment on function public.search_catalogue(text, integer) is
  'Command-palette search across cars, manufacturers, countries and parts. SECURITY INVOKER: RLS still hides unpublished variants.';

revoke execute on function public.search_catalogue(text, integer) from public;
grant execute on function public.search_catalogue(text, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS and grants for the new tables
-- ---------------------------------------------------------------------------

do $do$
declare
  t text;
begin
  foreach t in array array[
    'market_regions', 'market_cities', 'market_prices', 'car_generations',
    'variant_markets', 'car_colors'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
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
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
  end loop;
end;
$do$;

alter table public.recently_viewed enable row level security;

create policy recently_viewed_select_own
  on public.recently_viewed for select to authenticated
  using ((select auth.uid()) = user_id);
create policy recently_viewed_insert_own
  on public.recently_viewed for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy recently_viewed_update_own
  on public.recently_viewed for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy recently_viewed_delete_own
  on public.recently_viewed for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.recently_viewed to authenticated;
revoke all on public.recently_viewed from anon;

grant select on public.current_market_prices to anon, authenticated;

-- market_prices.created_by is the admin's auth id; nobody reads it through
-- the API (knowing it would reveal which accounts are admins), so SELECT is
-- granted column by column without it.
revoke select on public.market_prices from anon, authenticated;
grant select (id, variant_id, country_id, region_id, city_id, currency, price_type,
              ex_showroom_price, rto_tax, registration_fee, insurance_estimate,
              handling_charges, fastag, other_charges, on_road_price, source, source_url,
              effective_from, effective_to, last_verified_at, is_verified, notes,
              created_at, updated_at)
  on public.market_prices to anon, authenticated;
grant select on public.car_catalog to anon, authenticated;

-- profiles_delete_admin relied on default privileges; make it explicit.
grant delete on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public buckets serve files by URL without any SELECT policy. The
-- broad read policy from 0003 only added the ability for anyone to LIST every
-- object, so it is replaced by an admin-only read (needed for listing and for
-- upserts from the admin tools).
-- ---------------------------------------------------------------------------

drop policy if exists aurix_public_read on storage.objects;
drop policy if exists aurix_admin_read  on storage.objects;

create policy aurix_admin_read
  on storage.objects for select to authenticated
  using (
    bucket_id in ('cars', 'manufacturers', 'countries', 'parts', 'models-3d')
    and public.is_admin()
  );
