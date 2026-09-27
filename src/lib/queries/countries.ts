import "server-only";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";
import type { BodyType, Country, CountryWithCounts, Manufacturer } from "@/types/domain";

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

export type CountryListItem = CountryWithCounts & {
  /** The country's manufacturers, A–Z, for the card and the map's hover card. */
  makers: { name: string; slug: string }[];
};

type CountryRow = Country & {
  manufacturers:
    | {
        id: string;
        name: string;
        slug: string;
        car_models: { car_variants: { count: number }[] | null }[] | null;
      }[]
    | null;
};

/** The number inside PostgREST's embedded `( count )` aggregate. */
function embeddedCount(rows: { count: number }[] | null | undefined): number {
  return rows?.[0]?.count ?? 0;
}

/**
 * Countries with their manufacturers and how many published cars each has,
 * in one read.
 *
 * The counts are PostgREST's embedded `count` over `car_variants`, taken
 * through the anon client, so row level security has already removed drafts:
 * an unpublished variant never inflates a country's number. Counting in the
 * database also means no variant ids travel just to be counted.
 */
export async function listCountries(): Promise<CountryListItem[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("countries")
      .select(
        "*, manufacturers ( id, name, slug, car_models ( car_variants ( count ) ) )",
      )
      .order("name")
      .returns<CountryRow[]>();

    if (error) {
      console.error("listCountries failed:", error.message);
      return [];
    }

    const collator = new Intl.Collator("en", { sensitivity: "base" });
    return (data ?? []).map((row) => {
      const { manufacturers, ...country } = row;
      const list = manufacturers ?? [];
      const makers = list
        .map(({ name, slug }) => ({ name, slug }))
        .sort((a, b) => collator.compare(a.name, b.name));
      const variantCount = list.reduce(
        (total, maker) =>
          total +
          (maker.car_models ?? []).reduce(
            (sum, model) => sum + embeddedCount(model.car_variants),
            0,
          ),
        0,
      );
      return {
        ...country,
        makers,
        manufacturer_count: makers.length,
        variant_count: variantCount,
      };
    });
  } catch (error) {
    console.error("listCountries threw:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Country page
// ---------------------------------------------------------------------------

export type CountryModel = {
  id: string;
  slug: string;
  name: string;
  generation: string | null;
  bodyType: BodyType | null;
  categoryName: string | null;
  /** Published variants of the model. */
  variantCount: number;
};

export type CountryMaker = Manufacturer & {
  /** Models with at least one published variant, A–Z. */
  models: CountryModel[];
  variantCount: number;
};

export type CountryDetail = {
  country: Country;
  /** Every manufacturer from the country, A–Z. */
  makers: CountryMaker[];
  /** The most powerful published cars, capped at `limit`. */
  cars: CatalogCardRow[];
  /** How many published cars the country has in total (an exact count). */
  totalCars: number;
};

type MakerRow = Manufacturer & {
  countries: { slug: string } | null;
  car_models:
    | {
        id: string;
        slug: string;
        name: string;
        generation: string | null;
        body_type: BodyType | null;
        categories: { name: string } | null;
        car_variants: { count: number }[] | null;
      }[]
    | null;
};

/** How many cars the country page shows before linking to the full collection. */
export const COUNTRY_CAR_LIMIT = 12;

/**
 * One country: its manufacturers with their published models, its most
 * powerful cars and the exact number of cars it has. Three parallel reads.
 *
 * The total is a real count, not the length of the capped list — the old page
 * reported "24 cars" for any country with more than 24.
 */
export const getCountryDetail = cache(async function getCountryDetail(
  slug: string,
): Promise<CountryDetail | null> {
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
        .select(
          "*, countries!inner ( slug )," +
            " car_models ( id, slug, name, generation, body_type, categories ( name ), car_variants ( count ) )",
        )
        .eq("countries.slug", slug)
        .order("name")
        .returns<MakerRow[]>(),
      supabase
        .from("car_catalog")
        .select(CARD_COLUMNS, { count: "exact" })
        .eq("country_slug", slug)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .order("variant_id", { ascending: true })
        .limit(COUNTRY_CAR_LIMIT)
        .returns<CatalogCardRow[]>(),
    ]);

    if (countryResult.error) {
      console.error("getCountryDetail failed:", countryResult.error.message);
      return null;
    }
    const country = countryResult.data?.[0];
    if (!country) return null;

    if (makersResult.error) {
      console.error("getCountryDetail makers failed:", makersResult.error.message);
    }
    if (carsResult.error) {
      console.error("getCountryDetail cars failed:", carsResult.error.message);
    }

    const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const makers: CountryMaker[] = (makersResult.data ?? []).map((row) => {
      const { countries: _country, car_models, ...maker } = row;
      const models = (car_models ?? [])
        .map((model) => ({
          id: model.id,
          slug: model.slug,
          name: model.name,
          generation: model.generation,
          bodyType: model.body_type,
          categoryName: model.categories?.name ?? null,
          variantCount: embeddedCount(model.car_variants),
        }))
        .filter((model) => model.variantCount > 0)
        .sort((a, b) => collator.compare(a.name, b.name));
      return {
        ...maker,
        models,
        variantCount: models.reduce((sum, model) => sum + model.variantCount, 0),
      };
    });

    const cars = carsResult.data ?? [];
    return {
      country,
      makers,
      cars,
      totalCars: carsResult.count ?? cars.length,
    };
  } catch (error) {
    console.error("getCountryDetail threw:", error);
    return null;
  }
});

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
