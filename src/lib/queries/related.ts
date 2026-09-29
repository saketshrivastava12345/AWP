import "server-only";

import { reportQueryError } from "@/lib/queries/report";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { FuelType, RangeStandard, VariantDetail } from "@/types/domain";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";
import { orderRelated, powerBand } from "@/lib/detail/related";

/**
 * Catalogue reads that put one car in the context of the others: the related
 * vehicles under its page, and the populations its comparison bars are drawn
 * against. Both are public, identical for every visitor, and cached with the
 * rest of the catalogue.
 *
 * Like every query module, these never throw: a failed read is logged and
 * returns an empty value, and the page renders without that block.
 */

/** Candidate pools are small; the catalogue is ordered in memory from these. */
const POOL_SIZE = 60;

/**
 * Up to `limit` cars related to this one: other variants of the same model,
 * then same-category cars from other makers (nearest in power first), then any
 * car within ±15% of its power. De-duplicated, never the car itself, in a
 * stable order. See orderRelated in lib/detail/related.ts.
 *
 * Rows carry exactly the card columns (catalog-columns.ts), ready for CarGrid.
 * Filtering on model/category/manufacturer ids does not need them selected.
 */
export async function getRelatedCars(
  detail: VariantDetail,
  limit = 6,
): Promise<CatalogCardRow[]> {
  if (!isConfigured() || limit <= 0) return [];

  try {
    const supabase = createStaticClient();
    const selfId = detail.variant.id;
    const selfPowerHp = detail.performance?.power_hp ?? null;
    const band = powerBand(selfPowerHp);

    const [siblings, sameCategory, similarPower] = await Promise.all([
      supabase
        .from("car_catalog")
        .select(CARD_COLUMNS)
        .eq("model_id", detail.model.id)
        .neq("variant_id", selfId)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .order("variant_id", { ascending: true })
        .limit(limit)
        .returns<CatalogCardRow[]>(),
      supabase
        .from("car_catalog")
        .select(CARD_COLUMNS)
        .eq("category_id", detail.category.id)
        .neq("manufacturer_id", detail.manufacturer.id)
        .order("variant_id", { ascending: true })
        .limit(POOL_SIZE)
        .returns<CatalogCardRow[]>(),
      band
        ? supabase
            .from("car_catalog")
            .select(CARD_COLUMNS)
            // power_hp is an integer column and PostgREST rejects "433.5";
            // rounding inward selects exactly the integers inside the band.
            .gte("power_hp", Math.ceil(band[0]))
            .lte("power_hp", Math.floor(band[1]))
            .neq("variant_id", selfId)
            .order("variant_id", { ascending: true })
            .limit(POOL_SIZE)
            .returns<CatalogCardRow[]>()
        : Promise.resolve({ data: [] as CatalogCardRow[], error: null }),
    ]);

    for (const [name, result] of [
      ["siblings", siblings],
      ["same category", sameCategory],
      ["similar power", similarPower],
    ] as const) {
      if (result.error)
        reportQueryError(`getRelatedCars (${name}) failed:`, result.error.message);
    }

    return orderRelated({
      selfId,
      selfPowerHp,
      siblings: siblings.data ?? [],
      sameCategory: sameCategory.data ?? [],
      similarPower: similarPower.data ?? [],
      limit,
    });
  } catch (error) {
    reportQueryError("getRelatedCars threw:", error);
    return [];
  }
}

/** One catalogue row of the figures the detail page's comparison bars need. */
export type CatalogueFigureRow = {
  power_hp: number | null;
  torque_nm: number | null;
  zero_to_100_s: number | null;
  top_speed_kmh: number | null;
  kerb_weight_kg: number | null;
  range_km: number | null;
  range_standard: RangeStandard | null;
  fuel_type: FuelType | null;
};

/**
 * The published figures of every car in the catalogue, for the performance
 * and electric panels' "relative to the AURIX catalogue" bars. Feed the rows
 * to buildPerformancePopulation and buildRangeSamples (lib/detail).
 *
 * Eight numeric columns for ~every published variant; cached for an hour like
 * the rest of the catalogue, so the whole population costs one small read.
 */
export async function getCatalogueFigures(): Promise<CatalogueFigureRow[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(
        "power_hp,torque_nm,zero_to_100_s,top_speed_kmh,kerb_weight_kg,range_km,range_standard,fuel_type",
      )
      .returns<CatalogueFigureRow[]>();

    if (error) {
      reportQueryError("getCatalogueFigures failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    reportQueryError("getCatalogueFigures threw:", error);
    return [];
  }
}
