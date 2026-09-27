import "server-only";

import { reportQueryError } from "@/lib/queries/report";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { carBuildFromDetail, type CarBuild } from "@/lib/car-build";
import { buildAnatomyTour } from "@/lib/anatomy-tour";
import { carDisplayName } from "@/lib/format";
import { getFeaturedCars, getVariantDetail } from "@/lib/queries/cars";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { listCountries, type CountryListItem } from "@/lib/queries/countries";
import {
  listManufacturers,
  type ManufacturerListItem,
} from "@/lib/queries/manufacturers";
import { getPartsIndex, type PartsIndexCategory } from "@/lib/queries/parts";
import { getComparePickerOptions } from "@/lib/queries/compare";
import { getFacetRows } from "@/lib/queries/filters";
import { quickStarts, type QuickStart } from "@/components/compare/picker-logic";
import { pickHeroBeats, type HeroBeat } from "@/components/home/hero-beats";
import {
  pickHeroCandidate,
  pickSegments,
  type DimensionRow,
  type HeroDimensions,
  type HomeSegment,
  type SegmentPhotoRow,
} from "@/components/home/home-data";

/**
 * Everything the home page shows, read in one parallel batch through the
 * cookie-free static client, so the page prerenders and revalidates with the
 * rest of the catalogue.
 *
 * Every function returns an empty or null value instead of throwing: a home
 * page must never be taken down by one failed read, and each section has an
 * honest empty state for exactly that case.
 */

// ---------------------------------------------------------------------------
// Counts
// ---------------------------------------------------------------------------

export const COUNT_KEYS = [
  "countries",
  "manufacturers",
  "models",
  "variants",
  "parts",
] as const;
export type CountKey = (typeof COUNT_KEYS)[number];

/** Exact row counts; null when that count could not be read. */
export type HomeCounts = Record<CountKey, number | null>;

const NO_COUNTS: HomeCounts = {
  countries: null,
  manufacturers: null,
  models: null,
  variants: null,
  parts: null,
};

/**
 * Exact counts, taken with `count: "exact"` and `head: true` so no rows are
 * transferred. Through the anon client row level security has already removed
 * draft variants, so:
 *
 *   variants  published variants only;
 *   models    models with at least one published variant (the inner join
 *             drops a model whose every variant is a draft — it could not be
 *             opened, so it is not counted);
 *   countries, manufacturers, parts  every catalogued row, as their index
 *             pages list them.
 *
 * A failed count is null, never 0: "0 cars" would be a false statement.
 */
export async function getHomeCounts(): Promise<HomeCounts> {
  if (!isConfigured()) return NO_COUNTS;

  try {
    const supabase = createStaticClient();
    const head = { count: "exact" as const, head: true };
    const results = await Promise.all([
      supabase.from("countries").select("id", head),
      supabase.from("manufacturers").select("id", head),
      supabase.from("car_models").select("id, car_variants!inner ( id )", head),
      supabase.from("car_variants").select("id", head),
      supabase.from("parts").select("id", head),
    ]);

    const counts = { ...NO_COUNTS };
    COUNT_KEYS.forEach((key, index) => {
      const result = results[index];
      if (!result || result.error) {
        reportQueryError(`getHomeCounts ${key} failed:`, result?.error?.message);
        return;
      }
      counts[key] = typeof result.count === "number" ? result.count : null;
    });
    return counts;
  } catch (error) {
    reportQueryError("getHomeCounts threw:", error);
    return NO_COUNTS;
  }
}

// ---------------------------------------------------------------------------
// The car on the hero stage
// ---------------------------------------------------------------------------

export type HeroCar = {
  /** "Koenigsegg Jesko Absolut" (carDisplayName). */
  name: string;
  /** Its page: /cars/manufacturer/model/variant. */
  href: string;
  build: CarBuild;
  /** As published; null where the maker does not publish a figure. */
  dimensions: HeroDimensions;
  /** All four dimensions are published, so the scene is to scale. */
  complete: boolean;
  /** The story's beats, from the car's own anatomy tour. */
  beats: HeroBeat[];
};

async function readDimensions(ids: string[]): Promise<DimensionRow[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("dimensions")
      .select("variant_id, length_mm, width_mm, height_mm, wheelbase_mm")
      .in("variant_id", ids)
      .returns<DimensionRow[]>();
    if (error) {
      reportQueryError("hero dimensions failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    reportQueryError("hero dimensions threw:", error);
    return [];
  }
}

/**
 * The featured car the hero is built from (see pickHeroCandidate for the
 * rule), with its layout for the 3D scene and its story beats. Null when the
 * catalogue has no featured car or its detail cannot be read; the hero then
 * draws a generic body and says so.
 */
export async function getHeroCar(
  featured: readonly CatalogCardRow[],
  categories: readonly PartsIndexCategory[],
): Promise<HeroCar | null> {
  const ids = featured.flatMap((car) => (car.variant_id ? [car.variant_id] : []));
  const pick = pickHeroCandidate(featured, await readDimensions(ids));
  if (!pick) return null;

  const { manufacturer_slug: maker, model_slug: model, variant_slug: variant } = pick.car;
  if (!maker || !model || !variant) return null;

  const detail = await getVariantDetail(maker, model, variant);
  if (!detail) return null;

  const build = carBuildFromDetail(detail);
  const parts = categories.flatMap((category) => category.parts);
  const stops = buildAnatomyTour(detail, parts);

  return {
    name: carDisplayName(
      detail.manufacturer.name,
      detail.model.name,
      detail.variant.name,
    ),
    href: `/cars/${maker}/${model}/${variant}`,
    build,
    dimensions: {
      length_mm: detail.dimensions?.length_mm ?? null,
      width_mm: detail.dimensions?.width_mm ?? null,
      height_mm: detail.dimensions?.height_mm ?? null,
      wheelbase_mm: detail.dimensions?.wheelbase_mm ?? null,
    },
    complete: pick.complete,
    beats: pickHeroBeats(stops, {
      engineDrawn: build.powertrain !== "electric" && build.enginePosition !== null,
    }),
  };
}

// ---------------------------------------------------------------------------
// Shop by segment
// ---------------------------------------------------------------------------

type PhotoRow = {
  manufacturer_name: string | null;
  model_name: string | null;
  variant_name: string | null;
  category_slug: string | null;
  body_type: SegmentPhotoRow["body_type"];
  fuel_type: SegmentPhotoRow["fuel_type"];
  primary_image_url: string | null;
};

/** Catalogued photographs, most powerful car first, for the segment tiles. */
async function readSegmentPhotos(): Promise<SegmentPhotoRow[]> {
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(
        "manufacturer_name, model_name, variant_name, category_slug, body_type, fuel_type, primary_image_url",
      )
      .not("primary_image_url", "is", null)
      .order("power_hp", { ascending: false, nullsFirst: false })
      .order("variant_id", { ascending: true })
      .limit(200)
      .returns<PhotoRow[]>();
    if (error) {
      reportQueryError("segment photos failed:", error.message);
      return [];
    }
    return (data ?? []).flatMap((row) =>
      row.primary_image_url
        ? [
            {
              name: carDisplayName(row.manufacturer_name, row.model_name, row.variant_name),
              image_url: row.primary_image_url,
              category_slug: row.category_slug,
              body_type: row.body_type,
              fuel_type: row.fuel_type,
            },
          ]
        : [],
    );
  } catch (error) {
    reportQueryError("segment photos threw:", error);
    return [];
  }
}

/**
 * The segment tiles, counted over the same facet rows the /cars filter rail
 * counts. Empty when the catalogue cannot be read; a missing photograph only
 * means the tile shows its body-style drawing.
 */
export async function getHomeSegments(): Promise<HomeSegment[]> {
  if (!isConfigured()) return [];
  const [{ rows, ok }, photos] = await Promise.all([getFacetRows(), readSegmentPhotos()]);
  if (!ok) return [];
  return pickSegments(rows, photos);
}

// ---------------------------------------------------------------------------
// Everything
// ---------------------------------------------------------------------------

export type HomePageData = {
  counts: HomeCounts;
  featured: CatalogCardRow[];
  hero: HeroCar | null;
  countries: CountryListItem[];
  manufacturers: ManufacturerListItem[];
  parts: PartsIndexCategory[];
  /** Ready-made comparisons: closest published power, different makers. */
  rivals: QuickStart[];
  /** Ways into the collection by kind of car. */
  segments: HomeSegment[];
};

/** Featured cars on the page; the hero car is chosen from these. */
export const FEATURED_COUNT = 6;

export async function getHomePageData(): Promise<HomePageData> {
  const [counts, featured, countries, manufacturers, parts, picker, segments] =
    await Promise.all([
      getHomeCounts(),
      getFeaturedCars(FEATURED_COUNT),
      listCountries(),
      listManufacturers(),
      getPartsIndex(),
      getComparePickerOptions(),
      getHomeSegments(),
    ]);

  const hero = await getHeroCar(featured, parts);

  return {
    counts,
    featured,
    hero,
    countries,
    manufacturers,
    parts,
    rivals: picker.reachable ? quickStarts(picker.options, 2) : [],
    segments,
  };
}
