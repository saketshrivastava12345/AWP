import "server-only";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";
import type {
  BodyType,
  CarGeneration,
  CarModel,
  Category,
  Country,
  FuelType,
  Manufacturer,
} from "@/types/domain";

/**
 * The catalogue's hierarchy pages: a maker's models (/cars/[manufacturer])
 * and one model with its generations and variants (/cars/[manufacturer]/[model]).
 *
 * Every summary figure here is computed from rows that exist — a power range
 * is the lowest and highest PUBLISHED power among the variants, and is null
 * when no variant publishes one. Nothing is estimated to fill a gap.
 */

export type NumberRange = [number, number];

/** Lowest and highest of the values that exist; null when none do. */
export function rangeOf(
  values: readonly (number | null | undefined)[],
): NumberRange | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return min === Infinity ? null : [min, max];
}

/** Years a set of variants spans. `end` is null while any of them is still in production. */
export function yearSpan(
  variants: readonly Pick<CatalogCardRow, "year_start" | "year_end">[],
): { start: number | null; end: number | null } {
  const starts = rangeOf(variants.map((variant) => variant.year_start));
  const ongoing = variants.some(
    (variant) => variant.year_start !== null && variant.year_end === null,
  );
  const ends = rangeOf(variants.map((variant) => variant.year_end));
  return { start: starts?.[0] ?? null, end: ongoing ? null : (ends?.[1] ?? null) };
}

type GenerationSummary = Pick<
  CarGeneration,
  "id" | "name" | "slug" | "year_start" | "year_end"
>;

export type ModelSummary = {
  id: string;
  slug: string;
  name: string;
  bodyType: BodyType;
  description: string | null;
  categorySlug: string;
  categoryName: string;
  /** Generations recorded for the model, oldest first. */
  generations: GenerationSummary[];
  years: { start: number | null; end: number | null };
  variantCount: number;
  power: NumberRange | null;
  fuelTypes: FuelType[];
  /** First photograph among its variants (or the model's own), if any. */
  imageUrl: string | null;
  /** The variant the model card borrows its fuel type from for the silhouette. */
  leadFuel: FuelType | null;
};

export type ManufacturerCatalogue = {
  manufacturer: Manufacturer;
  country: Country;
  /** Models grouped by category, in the catalogue's category order. */
  groups: { slug: string; name: string; models: ModelSummary[] }[];
  modelCount: number;
  variantCount: number;
  power: NumberRange | null;
};

type MakerRow = Manufacturer & { countries: Country | null };
type ModelRow = Pick<
  CarModel,
  | "id"
  | "slug"
  | "name"
  | "body_type"
  | "description"
  | "production_start"
  | "production_end"
> & {
  categories: Pick<Category, "slug" | "name" | "display_order"> | null;
  car_generations: GenerationSummary[] | null;
};

function byYearThenName(a: GenerationSummary, b: GenerationSummary): number {
  return (a.year_start ?? 9999) - (b.year_start ?? 9999) || a.name.localeCompare(b.name);
}

/**
 * Returned instead of a catalogue when a read failed (or the database is not
 * configured). Kept apart from `null` ("does not exist") so a transient error
 * is never presented as an empty maker or a 404.
 */
export const READ_FAILED = "read-failed" as const;
export type ReadFailed = typeof READ_FAILED;

/**
 * One maker's catalogue: its models (only those with a published variant),
 * each with generation badges, year span, variant count and power range.
 * Null when the maker does not exist; READ_FAILED when any read failed.
 */
export const getManufacturerCatalogue = cache(async function getManufacturerCatalogue(
  slug: string,
): Promise<ManufacturerCatalogue | ReadFailed | null> {
  if (!isConfigured()) return READ_FAILED;

  try {
    const supabase = createStaticClient();
    const [makerResult, modelsResult, carsResult] = await Promise.all([
      supabase
        .from("manufacturers")
        .select("*, countries!inner (*)")
        .eq("slug", slug)
        .limit(1)
        .returns<MakerRow[]>(),
      supabase
        .from("car_models")
        .select(
          "id, slug, name, body_type, description, production_start, production_end," +
            " categories!inner ( slug, name, display_order )," +
            " car_generations ( id, name, slug, year_start, year_end )," +
            " manufacturers!inner ( slug )",
        )
        .eq("manufacturers.slug", slug)
        .order("name")
        .returns<ModelRow[]>(),
      supabase
        .from("car_catalog")
        .select(CARD_COLUMNS)
        .eq("manufacturer_slug", slug)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .order("variant_id", { ascending: true })
        .returns<CatalogCardRow[]>(),
    ]);

    if (makerResult.error) {
      console.error("getManufacturerCatalogue failed:", makerResult.error.message);
      return READ_FAILED;
    }
    const row = makerResult.data?.[0];
    if (!row?.countries) return null;
    const { countries: country, ...manufacturer } = row;

    if (modelsResult.error || carsResult.error) {
      console.error(
        "getManufacturerCatalogue models/cars:",
        modelsResult.error?.message ?? carsResult.error?.message,
      );
      return READ_FAILED;
    }

    const cars = carsResult.data ?? [];
    const byModel = new Map<string, CatalogCardRow[]>();
    for (const car of cars) {
      if (!car.model_id) continue;
      const list = byModel.get(car.model_id);
      if (list) list.push(car);
      else byModel.set(car.model_id, [car]);
    }

    const groups = new Map<
      string,
      { slug: string; name: string; order: number; models: ModelSummary[] }
    >();
    for (const model of modelsResult.data ?? []) {
      const variants = byModel.get(model.id);
      // A model with no published variant has nothing to show yet.
      if (!variants || variants.length === 0 || !model.categories) continue;

      const derived = yearSpan(variants);
      const summary: ModelSummary = {
        id: model.id,
        slug: model.slug,
        name: model.name,
        bodyType: model.body_type,
        description: model.description,
        categorySlug: model.categories.slug,
        categoryName: model.categories.name,
        generations: [...(model.car_generations ?? [])].sort(byYearThenName),
        years:
          model.production_start !== null
            ? { start: model.production_start, end: model.production_end }
            : derived,
        variantCount: variants.length,
        power: rangeOf(variants.map((variant) => variant.power_hp)),
        fuelTypes: [
          ...new Set(
            variants
              .map((variant) => variant.fuel_type)
              .filter((fuel): fuel is FuelType => fuel !== null),
          ),
        ],
        imageUrl:
          variants.find((variant) => variant.primary_image_url)?.primary_image_url ??
          null,
        leadFuel: variants[0]?.fuel_type ?? null,
      };

      const key = model.categories.slug;
      const group = groups.get(key);
      if (group) group.models.push(summary);
      else
        groups.set(key, {
          slug: key,
          name: model.categories.name,
          order: model.categories.display_order,
          models: [summary],
        });
    }

    const ordered = [...groups.values()]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map(({ order: _order, ...group }) => group);

    return {
      manufacturer,
      country,
      groups: ordered,
      modelCount: ordered.reduce((total, group) => total + group.models.length, 0),
      variantCount: cars.length,
      power: rangeOf(cars.map((car) => car.power_hp)),
    };
  } catch (error) {
    console.error("getManufacturerCatalogue threw:", error);
    return READ_FAILED;
  }
});

export type ModelCatalogue = {
  manufacturer: Manufacturer;
  country: Country;
  model: CarModel;
  category: Category;
  /** Recorded generations, oldest first. */
  generations: CarGeneration[];
  /** Every published variant, most powerful first. */
  variants: CatalogCardRow[];
  years: { start: number | null; end: number | null };
  /** Min–max across variants, from published figures only. */
  ranges: {
    power: NumberRange | null;
    torque: NumberRange | null;
    zeroTo100: NumberRange | null;
    topSpeed: NumberRange | null;
    electricRange: NumberRange | null;
  };
};

type ModelDetailRow = CarModel & {
  manufacturers: (Manufacturer & { countries: Country | null }) | null;
  categories: Category | null;
  car_generations: CarGeneration[] | null;
};

/**
 * One model: its generations, every published variant as a card row, and the
 * spread of its published figures. Null when the path does not resolve, or
 * when the model has no published variant (there is nothing to show).
 * READ_FAILED when a read failed.
 */
export const getModelCatalogue = cache(async function getModelCatalogue(
  manufacturerSlug: string,
  modelSlug: string,
): Promise<ModelCatalogue | ReadFailed | null> {
  if (!isConfigured()) return READ_FAILED;

  try {
    const supabase = createStaticClient();
    const [modelResult, carsResult] = await Promise.all([
      supabase
        .from("car_models")
        .select(
          "*, manufacturers!inner ( *, countries!inner (*) ), categories!inner (*), car_generations (*)",
        )
        .eq("slug", modelSlug)
        .eq("manufacturers.slug", manufacturerSlug)
        .limit(1)
        .returns<ModelDetailRow[]>(),
      supabase
        .from("car_catalog")
        .select(CARD_COLUMNS)
        .eq("manufacturer_slug", manufacturerSlug)
        .eq("model_slug", modelSlug)
        .order("power_hp", { ascending: false, nullsFirst: false })
        .order("variant_id", { ascending: true })
        .returns<CatalogCardRow[]>(),
    ]);

    if (modelResult.error) {
      console.error("getModelCatalogue failed:", modelResult.error.message);
      return READ_FAILED;
    }
    if (carsResult.error) {
      console.error("getModelCatalogue cars:", carsResult.error.message);
      return READ_FAILED;
    }

    const row = modelResult.data?.[0];
    const maker = row?.manufacturers;
    const country = maker?.countries;
    const category = row?.categories;
    const variants = carsResult.data ?? [];
    if (!row || !maker || !country || !category || variants.length === 0) return null;

    const {
      manufacturers: _maker,
      categories: _category,
      car_generations: generations,
      ...model
    } = row;
    const { countries: _country, ...manufacturer } = maker;

    return {
      manufacturer,
      country,
      model,
      category,
      generations: [...(generations ?? [])].sort(byYearThenName),
      variants,
      years:
        model.production_start !== null
          ? { start: model.production_start, end: model.production_end }
          : yearSpan(variants),
      ranges: {
        power: rangeOf(variants.map((variant) => variant.power_hp)),
        torque: rangeOf(variants.map((variant) => variant.torque_nm)),
        zeroTo100: rangeOf(variants.map((variant) => variant.zero_to_100_s)),
        topSpeed: rangeOf(variants.map((variant) => variant.top_speed_kmh)),
        electricRange: rangeOf(variants.map((variant) => variant.range_km)),
      },
    };
  } catch (error) {
    console.error("getModelCatalogue threw:", error);
    return READ_FAILED;
  }
});

/** Every maker slug, for generateStaticParams on /cars/[manufacturer]. */
export async function getCatalogueManufacturerSlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("manufacturers")
      .select("slug")
      .order("slug")
      .returns<{ slug: string }[]>();
    if (error) {
      console.error("getCatalogueManufacturerSlugs failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.slug);
  } catch (error) {
    console.error("getCatalogueManufacturerSlugs threw:", error);
    return [];
  }
}

/**
 * Every model path with at least one published variant, for
 * generateStaticParams on /cars/[manufacturer]/[model] and the sitemap.
 */
export async function getAllModelPaths(): Promise<
  { manufacturer: string; model: string }[]
> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_models")
      .select("slug, manufacturers!inner ( slug ), car_variants!inner ( id )")
      .order("slug")
      .returns<{ slug: string; manufacturers: { slug: string } | null }[]>();
    if (error) {
      console.error("getAllModelPaths failed:", error.message);
      return [];
    }
    return (data ?? [])
      .filter((row) => row.manufacturers !== null)
      .map((row) => ({ manufacturer: row.manufacturers!.slug, model: row.slug }));
  } catch (error) {
    console.error("getAllModelPaths threw:", error);
    return [];
  }
}

export type VariantModelFile = { url: string; compression: string[] };

/**
 * The 3D model file of each listed variant that has one, so a card can warm
 * it on hover. Only called for rows whose `has_glb` is true — with no models
 * catalogued, it never runs.
 */
export async function getVariantModelFiles(
  variantIds: readonly string[],
): Promise<Map<string, VariantModelFile>> {
  const files = new Map<string, VariantModelFile>();
  if (variantIds.length === 0 || !isConfigured()) return files;
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_media")
      .select("variant_id, url, compression")
      .eq("type", "glb")
      .in("variant_id", [...variantIds])
      .returns<
        { variant_id: string | null; url: string; compression: string[] | null }[]
      >();
    if (error) {
      console.error("getVariantModelFiles failed:", error.message);
      return files;
    }
    for (const row of data ?? []) {
      if (row.variant_id)
        files.set(row.variant_id, { url: row.url, compression: row.compression ?? [] });
    }
    return files;
  } catch (error) {
    console.error("getVariantModelFiles threw:", error);
    return files;
  }
}
