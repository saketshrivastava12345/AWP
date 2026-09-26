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
union all select 'car_catalog (view)',count(*) from public.car_catalog
order by table_name;
