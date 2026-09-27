-- ===========================================================================
-- AURIX verification
--
-- Run this after applying the migrations and seed, to confirm the database is
-- populated and the derived objects work. Paste it into the Supabase SQL
-- Editor, or run:  node scripts/run-sql.mjs supabase/verify.sql
-- ===========================================================================

select 'countries'         as table_name, count(*) as rows from public.countries
union all select 'manufacturers',     count(*) from public.manufacturers
union all select 'categories',        count(*) from public.categories
union all select 'car_models',        count(*) from public.car_models
union all select 'car_variants',      count(*) from public.car_variants
union all select 'engines',           count(*) from public.engines
union all select 'transmissions',     count(*) from public.transmissions
union all select 'performance_specs', count(*) from public.performance_specs
union all select 'dimensions',        count(*) from public.dimensions
union all select 'fuel_specs',        count(*) from public.fuel_specs
union all select 'ev_specs',          count(*) from public.ev_specs
union all select 'part_categories',   count(*) from public.part_categories
union all select 'parts',             count(*) from public.parts
union all select 'part_relations',    count(*) from public.part_relations
union all select 'variant_parts',     count(*) from public.variant_parts
union all select 'features',          count(*) from public.features
union all select 'variant_features',  count(*) from public.variant_features
union all select 'car_media',         count(*) from public.car_media
union all select 'car_generations',   count(*) from public.car_generations
union all select 'car_colors',        count(*) from public.car_colors
union all select 'market_regions',    count(*) from public.market_regions
union all select 'market_cities',     count(*) from public.market_cities
union all select 'market_prices',     count(*) from public.market_prices
union all select 'current_market_prices (view)', count(*) from public.current_market_prices
union all select 'variant_markets',   count(*) from public.variant_markets
union all select 'profiles',          count(*) from public.profiles
union all select 'car_catalog (view)',count(*) from public.car_catalog
order by table_name;

-- Models with an engine but no recorded position draw no engine in 3D (0006).
select count(*) as models_missing_engine_position
from public.car_models m
where m.engine_position is null
  and exists (select 1 from public.car_variants v
              where v.model_id = m.id and v.fuel_type <> 'electric');

-- The exhaust group (0007) and the command-palette search (0008).
select count(*) as exhaust_parts from public.parts where viewer_group = 'exhaust';
select kind, title from public.search_catalogue('911 gt', 3);
