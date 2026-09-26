import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { CatalogCar, VariantDetail } from "@/types/domain";
import { getVariantDetail } from "./cars";

export const MAX_COMPARE = 4;
export const MIN_COMPARE = 2;

/**
 * A compare slug is the full path of a variant: manufacturer/model/variant.
 * Using the same identifier as the URL keeps compare links readable and means
 * a car can be added to a comparison straight from its detail page.
 */
export function parseCompareSlug(
  value: string,
): { manufacturer: string; model: string; variant: string } | null {
  const parts = value.split("/").filter(Boolean);
  if (parts.length !== 3) return null;
  const [manufacturer, model, variant] = parts;
  if (!manufacturer || !model || !variant) return null;
  return { manufacturer, model, variant };
}

export function toCompareSlug(car: {
  manufacturer_slug: string | null;
  model_slug: string | null;
  variant_slug: string | null;
}): string | null {
  if (!car.manufacturer_slug || !car.model_slug || !car.variant_slug) return null;
  return `${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;
}

/**
 * Load the full detail for each car in a comparison.
 *
 * Reuses `getVariantDetail`, which is wrapped in React `cache()`, so a car that
 * also appears elsewhere on the page costs nothing extra. Unresolvable slugs
 * are dropped rather than failing the page — a stale shared link should still
 * show the cars that do exist.
 */
export async function getComparisonSet(slugs: string[]): Promise<VariantDetail[]> {
  if (!isConfigured()) return [];

  const unique = [...new Set(slugs)].slice(0, MAX_COMPARE);
  const parsed = unique
    .map(parseCompareSlug)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const results = await Promise.all(
    parsed.map((entry) =>
      getVariantDetail(entry.manufacturer, entry.model, entry.variant),
    ),
  );

  return results.filter((detail): detail is VariantDetail => detail !== null);
}

/** Every car, as lightweight options for the comparison picker. */
export async function getComparePickerOptions(): Promise<CatalogCar[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(
        "variant_id,variant_slug,variant_name,model_slug,model_name," +
          "manufacturer_slug,manufacturer_name,country_flag_emoji,fuel_type,power_hp",
      )
      .order("manufacturer_name")
      .order("model_name")
      .returns<CatalogCar[]>();

    if (error) {
      console.error("getComparePickerOptions failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getComparePickerOptions threw:", error);
    return [];
  }
}
