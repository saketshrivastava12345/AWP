import "server-only";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { BodyType, CatalogCar, FuelType, VariantDetail } from "@/types/domain";
import type { ListedPrice } from "@/lib/compare-rows";
import {
  parseCompareSlug,
  prepareCompareSlugs,
  settleCompareSlugs,
  toCompareSlug,
  type DroppedSlug,
} from "@/lib/compare-slug";
import { getVariantDetail } from "./cars";

// The slug helpers moved to the client-safe `@/lib/compare-slug`. Re-exported
// so existing server imports keep working; client code must import them from
// there (see the client/server boundary note in CLAUDE.md).
export {
  MAX_COMPARE,
  MIN_COMPARE,
  compareHref,
  parseCompareSlug,
  toCompareSlug,
} from "@/lib/compare-slug";

/** A car in the comparison: its full record and its catalogue listed price. */
export type ComparedCar = {
  slug: string;
  detail: VariantDetail;
  listed: ListedPrice | null;
};

export type ComparisonResult = {
  /** The cars that resolved, in URL order, at most MAX_COMPARE. */
  cars: ComparedCar[];
  /** Their canonical slugs, the only ones carried forward in links. */
  selected: string[];
  /** Everything in the URL that was left out, with the reason. */
  dropped: DroppedSlug[];
  /**
   * False when the catalogue could not be reached. The page must then not
   * tell the visitor their cars do not exist — it simply could not check.
   */
  reachable: boolean;
};

/** Lightweight catalogue row for the picker: search, thumbnails, suggestions. */
export type ComparePickerOption = {
  slug: string;
  variantId: string;
  manufacturer: string;
  manufacturerSlug: string;
  model: string;
  variant: string;
  flag: string | null;
  category: string | null;
  categorySlug: string | null;
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  powerHp: number | null;
  yearStart: number | null;
  generation: string | null;
  imageUrl: string | null;
};

export type ComparePickerData = {
  options: ComparePickerOption[];
  /** True when the catalogue is larger than PICKER_LIMIT and the list was cut. */
  truncated: boolean;
  /** False when the catalogue could not be queried at all. */
  reachable: boolean;
};

/**
 * The picker holds the catalogue in the browser so search is instant and
 * works offline. Past this many variants it stops being lightweight, so the
 * list is truncated and the picker also asks /api/search for each query.
 */
export const PICKER_LIMIT = 1000;

const LOOKUP_COLUMNS = [
  "variant_id",
  "variant_slug",
  "model_slug",
  "manufacturer_slug",
  "listed_price",
  "listed_price_currency",
  "listed_price_type",
  "listed_price_market",
  "listed_price_verified_at",
].join(",");

type LookupRow = Pick<
  CatalogCar,
  | "variant_id"
  | "variant_slug"
  | "model_slug"
  | "manufacturer_slug"
  | "listed_price"
  | "listed_price_currency"
  | "listed_price_type"
  | "listed_price_market"
  | "listed_price_verified_at"
>;

/**
 * Which candidate slugs exist, in one round trip, with each one's listed
 * price. Returns null when the catalogue cannot be queried, which is a
 * different answer from "none of these exist".
 */
async function lookupCandidates(
  candidates: string[],
): Promise<Map<string, LookupRow> | null> {
  if (candidates.length === 0) return new Map();
  if (!isConfigured()) return null;

  const variantSlugs = [
    ...new Set(
      candidates
        .map((slug) => parseCompareSlug(slug)?.variant)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];

  try {
    const supabase = createStaticClient();
    // Candidates are validated slugs ([a-z0-9-]), so they are safe inside a
    // PostgREST in() list. The three-part match happens below.
    const { data, error } = await supabase
      .from("car_catalog")
      .select(LOOKUP_COLUMNS)
      .in("variant_slug", variantSlugs)
      .returns<LookupRow[]>();

    if (error) {
      console.error("compare lookup failed:", error.message);
      return null;
    }

    const found = new Map<string, LookupRow>();
    for (const row of data ?? []) {
      const slug = toCompareSlug(row);
      if (slug) found.set(slug, row);
    }
    return found;
  } catch (error) {
    console.error("compare lookup threw:", error);
    return null;
  }
}

function toListedPrice(row: LookupRow | undefined): ListedPrice | null {
  if (!row || row.listed_price === null || !row.listed_price_currency) return null;
  return {
    amount: row.listed_price,
    currency: row.listed_price_currency,
    type: row.listed_price_type,
    market: row.listed_price_market,
    verifiedAt: row.listed_price_verified_at,
  };
}

/**
 * Resolve the `?car=` values into a comparison.
 *
 * `key` is the raw values joined by newlines: React `cache()` memoises by
 * argument identity, and a string is stable where an array is not, so
 * generateMetadata and the page share one resolution per request.
 *
 * The detail for each car comes from `getVariantDetail`, itself cached, so a
 * car already rendered elsewhere in the request costs nothing extra.
 */
export const resolveComparison = cache(async function resolveComparison(
  key: string,
): Promise<ComparisonResult> {
  const values = key ? key.split("\n") : [];
  const prepared = prepareCompareSlugs(values);

  const found = await lookupCandidates(prepared.candidates);
  if (found === null) {
    return {
      cars: [],
      selected: prepared.candidates,
      dropped: prepared.dropped,
      reachable: false,
    };
  }

  const settled = settleCompareSlugs(prepared.candidates, (slug) =>
    found.has(slug) ? "found" : "not-found",
  );

  const details = await Promise.all(
    settled.selected.map(async (slug) => {
      const parts = parseCompareSlug(slug);
      const detail = parts
        ? await getVariantDetail(parts.manufacturer, parts.model, parts.variant)
        : null;
      return { slug, detail };
    }),
  );

  const cars: ComparedCar[] = [];
  const unavailable: DroppedSlug[] = [];
  for (const { slug, detail } of details) {
    if (detail) {
      cars.push({ slug, detail, listed: toListedPrice(found.get(slug)) });
    } else {
      unavailable.push({ value: slug, reason: "unavailable" });
    }
  }

  return {
    cars,
    selected: cars.map((car) => car.slug),
    dropped: [...prepared.dropped, ...settled.dropped, ...unavailable],
    reachable: true,
  };
});

const PICKER_COLUMNS = [
  "variant_id",
  "variant_slug",
  "variant_name",
  "model_slug",
  "model_name",
  "manufacturer_slug",
  "manufacturer_name",
  "country_flag_emoji",
  "category_slug",
  "category_name",
  "body_type",
  "fuel_type",
  "power_hp",
  "year_start",
  "generation",
  "generation_name",
  "primary_image_url",
].join(",");

type PickerRow = Pick<
  CatalogCar,
  | "variant_id"
  | "variant_slug"
  | "variant_name"
  | "model_slug"
  | "model_name"
  | "manufacturer_slug"
  | "manufacturer_name"
  | "country_flag_emoji"
  | "category_slug"
  | "category_name"
  | "body_type"
  | "fuel_type"
  | "power_hp"
  | "year_start"
  | "generation"
  | "generation_name"
  | "primary_image_url"
>;

/** Every published car, as lightweight options for the comparison picker. */
export const getComparePickerOptions = cache(
  async function getComparePickerOptions(): Promise<ComparePickerData> {
    if (!isConfigured()) return { options: [], truncated: false, reachable: false };

    try {
      const supabase = createStaticClient();
      const { data, error } = await supabase
        .from("car_catalog")
        .select(PICKER_COLUMNS)
        .order("manufacturer_name")
        .order("model_name")
        .order("variant_name")
        .order("variant_id")
        .limit(PICKER_LIMIT + 1)
        .returns<PickerRow[]>();

      if (error) {
        console.error("getComparePickerOptions failed:", error.message);
        return { options: [], truncated: false, reachable: false };
      }

      const rows = data ?? [];
      const options = rows
        .slice(0, PICKER_LIMIT)
        .flatMap((row): ComparePickerOption[] => {
          const slug = toCompareSlug(row);
          if (!slug || !row.variant_id) return [];
          return [
            {
              slug,
              variantId: row.variant_id,
              manufacturer: row.manufacturer_name ?? "",
              manufacturerSlug: row.manufacturer_slug ?? "",
              model: row.model_name ?? "",
              variant: row.variant_name ?? "",
              flag: row.country_flag_emoji,
              category: row.category_name,
              categorySlug: row.category_slug,
              bodyType: row.body_type,
              fuelType: row.fuel_type,
              powerHp: row.power_hp,
              yearStart: row.year_start,
              generation: row.generation_name ?? row.generation,
              imageUrl: row.primary_image_url,
            },
          ];
        });

      return { options, truncated: rows.length > PICKER_LIMIT, reachable: true };
    } catch (error) {
      console.error("getComparePickerOptions threw:", error);
      return { options: [], truncated: false, reachable: false };
    }
  },
);
