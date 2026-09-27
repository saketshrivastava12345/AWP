import "server-only";

import { reportQueryError } from "@/lib/queries/report";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";
import type { LineupModelInput } from "@/components/manufacturers/brand";
import type {
  BodyType,
  CarGeneration,
  CatalogCar,
  Country,
  Manufacturer,
  ManufacturerWithCountry,
} from "@/types/domain";

// ---------------------------------------------------------------------------
// Index
// ---------------------------------------------------------------------------

/** A maker for the index, with counts of what is actually published. */
export type ManufacturerListItem = ManufacturerWithCountry & {
  /** Published variants across all of the maker's models. */
  variant_count: number;
};

type ListRow = Manufacturer & {
  countries: Pick<Country, "id" | "name" | "slug" | "flag_emoji"> | null;
  car_models: { id: string; car_variants: { count: number }[] | null }[] | null;
};

/*
 * `car_variants ( count )` is counted through the anon client, so row level
 * security has already removed unpublished variants: a model whose every
 * variant is a draft counts zero and is not listed as a model. (The old count
 * took `car_models.length`, which advertised models nobody could open.)
 */
const LIST_SELECT = `
  *,
  countries!inner ( id, name, slug, flag_emoji ),
  car_models ( id, car_variants ( count ) )
`;

/** The number inside PostgREST's embedded `( count )` aggregate. */
function embeddedCount(rows: { count: number }[] | null | undefined): number {
  return rows?.[0]?.count ?? 0;
}

function toListItem(row: ListRow): ManufacturerListItem {
  const { car_models, countries, ...manufacturer } = row;
  const published = (car_models ?? []).map((model) => embeddedCount(model.car_variants));
  return {
    ...manufacturer,
    country: countries,
    model_count: published.filter((count) => count > 0).length,
    variant_count: published.reduce((sum, count) => sum + count, 0),
  };
}

/** Every manufacturer with its country, published model count and variant count. */
export async function listManufacturers(): Promise<ManufacturerListItem[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .select(LIST_SELECT)
      .order("name")
      .returns<ListRow[]>();

    if (error) {
      reportQueryError("listManufacturers failed:", error.message);
      return [];
    }
    return (data ?? []).map(toListItem);
  } catch (error) {
    reportQueryError("listManufacturers threw:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Brand page
// ---------------------------------------------------------------------------

/** A card row plus the generation columns the line-up groups by. */
export type BrandCar = CatalogCardRow & Pick<CatalogCar, "generation" | "generation_id">;

export type ManufacturerDetail = {
  manufacturer: Manufacturer;
  country: Country;
  /** Every published variant, most powerful first. */
  cars: BrandCar[];
  /** The maker's model rows (production and generation years), for the line-up. */
  models: LineupModelInput[];
};

type MakerRow = Manufacturer & { countries: Country | null };

type ModelRow = {
  id: string;
  slug: string;
  name: string;
  generation: string | null;
  production_start: number | null;
  production_end: number | null;
  body_type: BodyType | null;
  categories: { name: string; slug: string } | null;
  car_generations:
    Pick<CarGeneration, "id" | "name" | "year_start" | "year_end">[] | null;
};

const BRAND_CAR_COLUMNS = `${CARD_COLUMNS},generation,generation_id`;

/**
 * One manufacturer, its published cars and its model rows, in one round trip
 * (three parallel reads). Wrapped in `cache()` so generateMetadata and the
 * page share it. Null when the maker does not exist.
 */
export const getManufacturerDetail = cache(async function getManufacturerDetail(
  slug: string,
): Promise<ManufacturerDetail | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();

    const [makerResult, carsResult, modelsResult] = await Promise.all([
      supabase
        .from("manufacturers")
        .select("*, countries!inner (*)")
        .eq("slug", slug)
        .limit(1)
        .returns<MakerRow[]>(),
      supabase
        .from("car_catalog")
        .select(BRAND_CAR_COLUMNS)
        .eq("manufacturer_slug", slug)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .order("variant_id", { ascending: true })
        .returns<BrandCar[]>(),
      supabase
        .from("car_models")
        .select(
          "id, slug, name, generation, production_start, production_end, body_type," +
            " categories ( name, slug )," +
            " car_generations ( id, name, year_start, year_end )," +
            " manufacturers!inner ( slug )",
        )
        .eq("manufacturers.slug", slug)
        .returns<(ModelRow & { manufacturers: unknown })[]>(),
    ]);

    if (makerResult.error) {
      reportQueryError("getManufacturerDetail failed:", makerResult.error.message);
      return null;
    }
    const row = makerResult.data?.[0];
    if (!row?.countries) return null;
    const { countries: country, ...manufacturer } = row;

    // The maker still renders if its cars or models cannot be read; the page
    // then shows its honest empty state rather than failing outright.
    if (carsResult.error) {
      reportQueryError("getManufacturerDetail cars failed:", carsResult.error.message);
    }
    if (modelsResult.error) {
      reportQueryError(
        "getManufacturerDetail models failed:",
        modelsResult.error.message,
      );
    }

    const models: LineupModelInput[] = (modelsResult.data ?? []).map((model) => ({
      id: model.id,
      slug: model.slug,
      name: model.name,
      generation: model.generation,
      production_start: model.production_start,
      production_end: model.production_end,
      body_type: model.body_type,
      category: model.categories,
      generations: model.car_generations ?? [],
    }));

    return { manufacturer, country, cars: carsResult.data ?? [], models };
  } catch (error) {
    reportQueryError("getManufacturerDetail threw:", error);
    return null;
  }
});

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
      reportQueryError("getAllManufacturerSlugs failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.slug);
  } catch (error) {
    reportQueryError("getAllManufacturerSlugs threw:", error);
    return [];
  }
}
