import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type {
  CatalogCar,
  Country,
  Manufacturer,
  ManufacturerWithCountry,
} from "@/types/domain";

type ManufacturerRow = Manufacturer & {
  countries: Pick<Country, "id" | "name" | "slug" | "flag_emoji"> | null;
  car_models: { id: string }[] | null;
};

const LIST_SELECT = `
  *,
  countries!inner ( id, name, slug, flag_emoji ),
  car_models ( id )
`;

function toManufacturerWithCountry(row: ManufacturerRow): ManufacturerWithCountry {
  const { car_models, countries, ...manufacturer } = row;
  return {
    ...manufacturer,
    country: countries,
    model_count: car_models?.length ?? 0,
  };
}

/** Every manufacturer, with its country and how many models it has. */
export async function listManufacturers(): Promise<ManufacturerWithCountry[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .select(LIST_SELECT)
      .order("name")
      .returns<ManufacturerRow[]>();

    if (error) {
      console.error("listManufacturers failed:", error.message);
      return [];
    }
    return (data ?? []).map(toManufacturerWithCountry);
  } catch (error) {
    console.error("listManufacturers threw:", error);
    return [];
  }
}

export type ManufacturerDetail = {
  manufacturer: Manufacturer;
  country: Country;
  /** Cars grouped by category, in category display order. */
  groups: { category: string; categorySlug: string; cars: CatalogCar[] }[];
  totalVariants: number;
};

const MANUFACTURER_CAR_COLUMNS = [
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

/** One manufacturer, with its cars grouped by category. */
export async function getManufacturerDetail(
  slug: string,
): Promise<ManufacturerDetail | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();

    const [manufacturerResult, carsResult] = await Promise.all([
      supabase
        .from("manufacturers")
        .select("*, countries!inner (*)")
        .eq("slug", slug)
        .limit(1)
        .returns<(Manufacturer & { countries: Country | null })[]>(),
      supabase
        .from("car_catalog")
        .select(MANUFACTURER_CAR_COLUMNS)
        .eq("manufacturer_slug", slug)
        .order("category_name")
        .order("power_hp", { ascending: false, nullsFirst: false })
        .returns<CatalogCar[]>(),
    ]);

    if (manufacturerResult.error) {
      console.error("getManufacturerDetail failed:", manufacturerResult.error.message);
      return null;
    }

    const row = manufacturerResult.data?.[0];
    const country = row?.countries;
    if (!row || !country) return null;

    const { countries: _ignored, ...manufacturer } = row;
    const cars = carsResult.data ?? [];

    // Group by category, preserving the order the query returned.
    const byCategory = new Map<
      string,
      { category: string; categorySlug: string; cars: CatalogCar[] }
    >();
    for (const car of cars) {
      const key = car.category_slug ?? "uncategorised";
      const existing = byCategory.get(key);
      if (existing) {
        existing.cars.push(car);
      } else {
        byCategory.set(key, {
          category: car.category_name ?? "Uncategorised",
          categorySlug: key,
          cars: [car],
        });
      }
    }

    return {
      manufacturer,
      country,
      groups: [...byCategory.values()],
      totalVariants: cars.length,
    };
  } catch (error) {
    console.error("getManufacturerDetail threw:", error);
    return null;
  }
}

/** Slugs for generateStaticParams and the sitemap. */
export async function getAllManufacturerSlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .select("slug")
      .returns<{ slug: string }[]>();
    if (error) {
      console.error("getAllManufacturerSlugs failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.slug);
  } catch (error) {
    console.error("getAllManufacturerSlugs threw:", error);
    return [];
  }
}
