import "server-only";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { CatalogCar, Paginated, VariantDetail } from "@/types/domain";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  SORT_OPTIONS,
  type CarFilters,
  type SortKey,
} from "@/lib/car-query";

export {
  DEFAULT_PAGE_SIZE,
  SORT_OPTIONS,
  DEFAULT_SORT,
  isSortKey,
  type SortKey,
  type CarFilters,
} from "@/lib/car-query";

export type ListCarsOptions = {
  page?: number;
  pageSize?: number;
  sort?: SortKey;
  filters?: CarFilters;
};

/**
 * The grid card needs only a handful of columns. Selecting them explicitly
 * rather than `*` keeps the payload small — the view is wide.
 */
const CARD_COLUMNS = [
  "variant_id",
  "variant_slug",
  "variant_name",
  "model_slug",
  "model_name",
  "manufacturer_slug",
  "manufacturer_name",
  "country_slug",
  "country_name",
  "country_flag_emoji",
  "category_name",
  "category_slug",
  "body_type",
  "fuel_type",
  "drive_type",
  "power_hp",
  "top_speed_kmh",
  "zero_to_100_s",
  "base_price",
  "price_currency",
  "year_start",
  "year_end",
  "primary_image_url",
  "has_glb",
  "engine_configuration",
].join(",");

/**
 * Page of cars for the collection grid.
 *
 * Returns an empty page rather than throwing when Supabase is unconfigured or
 * unreachable, so the route renders its empty state. Failing loudly here would
 * take down a page whose job is to degrade gracefully.
 */
export async function listCars(
  options: ListCarsOptions = {},
): Promise<Paginated<CatalogCar>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(60, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const sort = SORT_OPTIONS[options.sort ?? DEFAULT_SORT];
  const filters = options.filters ?? {};

  const empty: Paginated<CatalogCar> = {
    rows: [],
    total: 0,
    page,
    pageSize,
    pageCount: 0,
  };
  if (!isConfigured()) return empty;

  try {
    const supabase = createStaticClient();
    let query = supabase.from("car_catalog").select(CARD_COLUMNS, { count: "exact" });

    if (filters.country?.length) query = query.in("country_slug", filters.country);
    if (filters.manufacturer?.length)
      query = query.in("manufacturer_slug", filters.manufacturer);
    if (filters.category?.length) query = query.in("category_slug", filters.category);
    if (filters.fuel?.length) query = query.in("fuel_type", filters.fuel);
    if (filters.drive?.length) query = query.in("drive_type", filters.drive);
    if (filters.body?.length) query = query.in("body_type", filters.body);
    if (filters.transmission?.length)
      query = query.in("transmission_type", filters.transmission);
    if (filters.engineLayout?.length)
      query = query.in("engine_layout", filters.engineLayout);
    if (filters.aspiration?.length) query = query.in("aspiration", filters.aspiration);
    if (filters.cylinders?.length)
      query = query.in("engine_cylinders", filters.cylinders);

    if (filters.powerMin !== undefined) query = query.gte("power_hp", filters.powerMin);
    if (filters.powerMax !== undefined) query = query.lte("power_hp", filters.powerMax);
    if (filters.speedMin !== undefined)
      query = query.gte("top_speed_kmh", filters.speedMin);
    if (filters.speedMax !== undefined)
      query = query.lte("top_speed_kmh", filters.speedMax);
    if (filters.priceMin !== undefined) query = query.gte("base_price", filters.priceMin);
    if (filters.priceMax !== undefined) query = query.lte("base_price", filters.priceMax);
    if (filters.yearMin !== undefined) query = query.gte("year_start", filters.yearMin);
    if (filters.yearMax !== undefined) query = query.lte("year_start", filters.yearMax);

    if (filters.text?.trim()) {
      // websearch_to_tsquery handles quoted phrases and bare words safely, and
      // never throws on punctuation the way plainto/to_tsquery can.
      query = query.textSearch("search_document", filters.text.trim(), {
        type: "websearch",
        config: "simple",
      });
    }

    const from = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
      // A stable tiebreaker: without it, rows with equal power can reorder
      // between pages and a car appears twice or not at all.
      .order("variant_id", { ascending: true })
      .range(from, from + pageSize - 1)
      .returns<CatalogCar[]>();

    if (error) {
      console.error("listCars failed:", error.message);
      return empty;
    }

    const total = count ?? 0;
    return {
      rows: data ?? [],
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error("listCars threw:", error);
    return empty;
  }
}

/** The PostgREST embed backing the detail page — one round trip. */
const DETAIL_SELECT = `
  *,
  car_models!inner (
    *,
    manufacturers!inner ( *, countries!inner (*) ),
    categories!inner (*)
  ),
  engines (*),
  transmissions (*),
  performance_specs (*),
  dimensions (*),
  fuel_specs (*),
  ev_specs (*),
  variant_features ( detail, features (*) ),
  variant_parts ( detail, parts (*) ),
  car_media (*)
`;

/**
 * The shape PostgREST returns for DETAIL_SELECT.
 *
 * Declared explicitly and applied with `.returns<T>()` because the embed nests
 * four levels deep through two join tables; letting the client infer it
 * produces a type too complex to read in errors, and the mapping below is what
 * actually guarantees the shape at runtime.
 */
type DetailRow = VariantDetail["variant"] & {
  car_models:
    | (VariantDetail["model"] & {
        manufacturers:
          | (VariantDetail["manufacturer"] & {
              countries: VariantDetail["country"] | null;
            })
          | null;
        categories: VariantDetail["category"] | null;
      })
    | null;
  engines: VariantDetail["engine"];
  transmissions: VariantDetail["transmission"];
  performance_specs: VariantDetail["performance"];
  dimensions: VariantDetail["dimensions"];
  fuel_specs: VariantDetail["fuel"];
  ev_specs: VariantDetail["ev"];
  variant_features:
    | {
        detail: string | null;
        features: VariantDetail["features"][number]["feature"] | null;
      }[]
    | null;
  variant_parts:
    | { detail: string | null; parts: VariantDetail["parts"][number]["part"] | null }[]
    | null;
  car_media: VariantDetail["media"] | null;
};

/**
 * Full detail for one variant, addressed the way the URL is:
 *
 * Wrapped in React `cache()` so that generateMetadata and the page component
 * share a single fetch per request instead of querying twice — which at build
 * time is the difference between 54 round trips and 108.
 *
 * /cars/[manufacturer]/[model]/[variant].
 *
 * Returns null when any part of that path does not match, which the route
 * turns into a 404.
 */
export const getVariantDetail = cache(async function getVariantDetail(
  manufacturerSlug: string,
  modelSlug: string,
  variantSlug: string,
): Promise<VariantDetail | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_variants")
      .select(DETAIL_SELECT)
      .eq("slug", variantSlug)
      .eq("car_models.slug", modelSlug)
      .eq("car_models.manufacturers.slug", manufacturerSlug)
      .limit(1)
      .returns<DetailRow[]>();

    if (error) {
      console.error("getVariantDetail failed:", error.message);
      return null;
    }

    const row = data?.[0];
    const model = row?.car_models;
    const manufacturer = model?.manufacturers;
    const country = manufacturer?.countries;
    const category = model?.categories;

    // Every one of these is required to render the page meaningfully. The
    // !inner joins should guarantee them, but an unexpected null must produce
    // a 404 rather than a half-rendered page.
    if (!row || !model || !manufacturer || !country || !category) return null;

    return {
      variant: row,
      model,
      manufacturer,
      country,
      category,
      engine: row.engines ?? null,
      transmission: row.transmissions ?? null,
      performance: row.performance_specs ?? null,
      dimensions: row.dimensions ?? null,
      fuel: row.fuel_specs ?? null,
      ev: row.ev_specs ?? null,
      features: (row.variant_features ?? [])
        .filter((entry) => entry.features !== null)
        .map((entry) => ({ feature: entry.features!, detail: entry.detail }))
        .sort((a, b) => a.feature.name.localeCompare(b.feature.name)),
      parts: (row.variant_parts ?? [])
        .filter((entry) => entry.parts !== null)
        .map((entry) => ({ part: entry.parts!, detail: entry.detail }))
        .sort((a, b) => a.part.name.localeCompare(b.part.name)),
      media: row.car_media ?? [],
    };
  } catch (error) {
    console.error("getVariantDetail threw:", error);
    return null;
  }
});

/** Sibling variants of the same model, for the "other variants" section. */
export async function getSiblingVariants(
  modelId: string,
  excludeVariantId: string,
): Promise<CatalogCar[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(CARD_COLUMNS)
      .eq("model_id", modelId)
      .neq("variant_id", excludeVariantId)
      .order("power_hp", { ascending: false, nullsFirst: false })
      .returns<CatalogCar[]>();

    if (error) {
      console.error("getSiblingVariants failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getSiblingVariants threw:", error);
    return [];
  }
}

/** Every variant path, for generateStaticParams and the sitemap. */
export async function getAllVariantPaths(): Promise<
  { manufacturer: string; model: string; variant: string }[]
> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select("manufacturer_slug,model_slug,variant_slug")
      .returns<Pick<CatalogCar, "manufacturer_slug" | "model_slug" | "variant_slug">[]>();

    if (error) {
      console.error("getAllVariantPaths failed:", error.message);
      return [];
    }

    return (data ?? [])
      .filter(
        (
          row,
        ): row is {
          manufacturer_slug: string;
          model_slug: string;
          variant_slug: string;
        } => Boolean(row.manufacturer_slug && row.model_slug && row.variant_slug),
      )
      .map((row) => ({
        manufacturer: row.manufacturer_slug,
        model: row.model_slug,
        variant: row.variant_slug,
      }));
  } catch (error) {
    console.error("getAllVariantPaths threw:", error);
    return [];
  }
}

/** A small set of notable cars, used on the home page. */
export async function getFeaturedCars(limit = 6): Promise<CatalogCar[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(CARD_COLUMNS)
      .not("power_hp", "is", null)
      .order("power_hp", { ascending: false, nullsFirst: false })
      .limit(limit)
      .returns<CatalogCar[]>();

    if (error) {
      console.error("getFeaturedCars failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getFeaturedCars threw:", error);
    return [];
  }
}

/**
 * The figures behind the Car DNA percentiles, for the whole catalogue.
 *
 * DNA is a rank within the dataset, so the population has to be loaded to
 * compute it. Only six numeric columns are selected, and the result is cached
 * for an hour like every other catalogue read.
 */
export async function getDnaPopulation(): Promise<
  {
    power_hp: number | null;
    kerb_weight_kg: number | null;
    zero_to_100_s: number | null;
    mileage_kmpl: number | null;
    range_km: number | null;
    length_mm: number | null;
  }[]
> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select("power_hp,kerb_weight_kg,zero_to_100_s,mileage_kmpl,range_km,length_mm")
      .returns<
        {
          power_hp: number | null;
          kerb_weight_kg: number | null;
          zero_to_100_s: number | null;
          mileage_kmpl: number | null;
          range_km: number | null;
          length_mm: number | null;
        }[]
      >();

    if (error) {
      console.error("getDnaPopulation failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getDnaPopulation threw:", error);
    return [];
  }
}

/** Row counts shown on the home page. */
export async function getCatalogueCounts(): Promise<{
  countries: number;
  manufacturers: number;
  models: number;
  variants: number;
  parts: number;
}> {
  const zero = { countries: 0, manufacturers: 0, models: 0, variants: 0, parts: 0 };
  if (!isConfigured()) return zero;

  try {
    const supabase = createStaticClient();
    const head = { count: "exact" as const, head: true };

    const [countries, manufacturers, models, variants, parts] = await Promise.all([
      supabase.from("countries").select("id", head),
      supabase.from("manufacturers").select("id", head),
      supabase.from("car_models").select("id", head),
      supabase.from("car_variants").select("id", head),
      supabase.from("parts").select("id", head),
    ]);

    return {
      countries: countries.count ?? 0,
      manufacturers: manufacturers.count ?? 0,
      models: models.count ?? 0,
      variants: variants.count ?? 0,
      parts: parts.count ?? 0,
    };
  } catch (error) {
    console.error("getCatalogueCounts threw:", error);
    return zero;
  }
}
