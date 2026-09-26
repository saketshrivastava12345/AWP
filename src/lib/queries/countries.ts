import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type {
  CatalogCar,
  Country,
  CountryWithCounts,
  Manufacturer,
  ManufacturerSegment,
} from "@/types/domain";

type CountryRow = Country & {
  manufacturers:
    | { id: string; car_models: { car_variants: { id: string }[] | null }[] | null }[]
    | null;
};

/**
 * Countries with how many manufacturers and variants each has.
 *
 * The counts come from a nested embed rather than a second round trip; the
 * catalogue is small enough that this is cheaper than an aggregate view.
 */
export async function listCountries(): Promise<CountryWithCounts[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("countries")
      .select("*, manufacturers ( id, car_models ( car_variants ( id ) ) )")
      .order("name")
      .returns<CountryRow[]>();

    if (error) {
      console.error("listCountries failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const { manufacturers, ...country } = row;
      const list = manufacturers ?? [];
      const variantCount = list.reduce(
        (total, maker) =>
          total +
          (maker.car_models ?? []).reduce(
            (sum, model) => sum + (model.car_variants?.length ?? 0),
            0,
          ),
        0,
      );
      return {
        ...country,
        manufacturer_count: list.length,
        variant_count: variantCount,
      };
    });
  } catch (error) {
    console.error("listCountries threw:", error);
    return [];
  }
}

export type CountryDetail = {
  country: Country;
  /** Manufacturers grouped by segment, in a fixed presentation order. */
  segments: {
    segment: ManufacturerSegment;
    label: string;
    manufacturers: Manufacturer[];
  }[];
  cars: CatalogCar[];
};

/** Presentation order and labels for manufacturer segments. */
const SEGMENT_ORDER: { segment: ManufacturerSegment; label: string }[] = [
  { segment: "performance", label: "Performance & Exotic" },
  { segment: "luxury", label: "Luxury" },
  { segment: "ev", label: "Electric" },
  { segment: "mass", label: "Mass Market" },
  { segment: "commercial", label: "Commercial" },
];

const COUNTRY_CAR_COLUMNS = [
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

export async function getCountryDetail(slug: string): Promise<CountryDetail | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();

    const [countryResult, makersResult, carsResult] = await Promise.all([
      supabase
        .from("countries")
        .select("*")
        .eq("slug", slug)
        .limit(1)
        .returns<Country[]>(),
      supabase
        .from("manufacturers")
        .select("*, countries!inner ( slug )")
        .eq("countries.slug", slug)
        .order("name")
        .returns<(Manufacturer & { countries: { slug: string } | null })[]>(),
      supabase
        .from("car_catalog")
        .select(COUNTRY_CAR_COLUMNS)
        .eq("country_slug", slug)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .limit(24)
        .returns<CatalogCar[]>(),
    ]);

    const country = countryResult.data?.[0];
    if (countryResult.error || !country) {
      if (countryResult.error)
        console.error("getCountryDetail failed:", countryResult.error.message);
      return null;
    }

    const makers = (makersResult.data ?? []).map((row) => {
      const { countries: _ignored, ...manufacturer } = row;
      return manufacturer;
    });

    const segments = SEGMENT_ORDER.map((entry) => ({
      ...entry,
      manufacturers: makers.filter((maker) => maker.segment === entry.segment),
    })).filter((group) => group.manufacturers.length > 0);

    return { country, segments, cars: carsResult.data ?? [] };
  } catch (error) {
    console.error("getCountryDetail threw:", error);
    return null;
  }
}

export async function getAllCountrySlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("countries")
      .select("slug")
      .returns<{ slug: string }[]>();
    if (error) {
      console.error("getAllCountrySlugs failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.slug);
  } catch (error) {
    console.error("getAllCountrySlugs threw:", error);
    return [];
  }
}
