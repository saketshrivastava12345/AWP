import "server-only";

import { cache } from "react";
import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";
import {
  partsRouteSlugs,
  pickPartsRoute,
  type PartsRoute,
} from "@/components/parts/parts-helpers";
import type { Part, PartCategory } from "@/types/domain";

type StaticClient = ReturnType<typeof createStaticClient>;

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const byDisplayOrder = (a: Part, b: Part) =>
  a.display_order - b.display_order || collator.compare(a.name, b.name);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type PartCategoryWithParts = PartCategory & { parts: Part[] };

/** Every part category with its parts, in display order. */
export async function listPartCategories(): Promise<PartCategoryWithParts[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("part_categories")
      .select("*, parts (*)")
      .order("display_order")
      .returns<(PartCategory & { parts: Part[] | null })[]>();

    if (error) {
      console.error("listPartCategories failed:", error.message);
      return [];
    }

    return (data ?? []).map((category) => ({
      ...category,
      parts: [...(category.parts ?? [])].sort(byDisplayOrder),
    }));
  } catch (error) {
    console.error("listPartCategories threw:", error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// The encyclopedia index, with usage
// ---------------------------------------------------------------------------

/** A part with how many published cars record it in `variant_parts`. */
export type PartWithUsage = Part & { usageCount: number };

export type PartsIndexCategory = PartCategory & { parts: PartWithUsage[] };

type UsageRow = { id: string; variant_parts: { count: number }[] | null };

/*
 * `variant_parts` is readable by everyone, including its rows for draft
 * variants. Joining `car_variants!inner()` (which row level security filters
 * to published cars for the anon client) keeps drafts out of the count;
 * without it a draft would make a part look more widely used than it is.
 */
async function readUsageCounts(supabase: StaticClient): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("parts")
    .select("id, variant_parts ( count, car_variants!inner () )")
    .returns<UsageRow[]>();
  if (error) {
    console.error("part usage counts failed:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.id, row.variant_parts?.[0]?.count ?? 0]));
}

/**
 * Every category with its parts and, per part, how many published cars
 * record it. Two parallel reads. A failed usage read leaves every count at 0,
 * which the UI shows as nothing rather than as "used by 0 cars".
 */
export const getPartsIndex = cache(async function getPartsIndex(): Promise<
  PartsIndexCategory[]
> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const [categoriesResult, usage] = await Promise.all([
      supabase
        .from("part_categories")
        .select("*, parts (*)")
        .order("display_order")
        .returns<(PartCategory & { parts: Part[] | null })[]>(),
      readUsageCounts(supabase),
    ]);

    if (categoriesResult.error) {
      console.error("getPartsIndex failed:", categoriesResult.error.message);
      return [];
    }

    return (categoriesResult.data ?? []).map((category) => ({
      ...category,
      parts: [...(category.parts ?? [])]
        .sort(byDisplayOrder)
        .map((part) => ({ ...part, usageCount: usage.get(part.id) ?? 0 })),
    }));
  } catch (error) {
    console.error("getPartsIndex threw:", error);
    return [];
  }
});

// ---------------------------------------------------------------------------
// One part
// ---------------------------------------------------------------------------

/** A catalogued car that records the part, with its variant-specific note. */
export type PartApplication = { car: CatalogCardRow; detail: string | null };

export type PartPageData = {
  part: Part;
  category: PartCategory;
  /** Related parts, read in both directions of `part_relations`, A–Z. */
  related: Part[];
  /** Published cars that record this part, by maker, model and variant. */
  applications: PartApplication[];
};

type PartRow = Part & {
  part_categories: PartCategory | null;
  forward: { parts: Part | null }[] | null;
  reverse: { parts: Part | null }[] | null;
};

/*
 * `part_relations` stores one canonical row per unordered pair
 * (part_id < related_part_id), so the related list is read in both
 * directions and merged. Both directions are embedded in the part's own read.
 */
const PART_SELECT = `
  *,
  part_categories!inner (*),
  forward:part_relations!part_relations_part_id_fkey ( parts!part_relations_related_part_id_fkey (*) ),
  reverse:part_relations!part_relations_related_part_id_fkey ( parts!part_relations_part_id_fkey (*) )
`;

type ApplicationRow = { detail: string | null; car_catalog: CatalogCardRow | null };

const byCarName = (a: PartApplication, b: PartApplication) =>
  collator.compare(a.car.manufacturer_name ?? "", b.car.manufacturer_name ?? "") ||
  collator.compare(a.car.model_name ?? "", b.car.model_name ?? "") ||
  collator.compare(a.car.variant_name ?? "", b.car.variant_name ?? "");

/**
 * The cars that record a part, in one read: `variant_parts` filtered by the
 * part's slug, embedding the catalogue view row of each car. The view only
 * holds published cars, so a draft's embed comes back null and is dropped.
 *
 * If the view embed is ever refused (it relies on PostgREST inferring the
 * view's relationship to car_variants), fall back to resolving the ids in a
 * second read rather than losing the section.
 */
async function readApplications(
  supabase: StaticClient,
  slug: string,
): Promise<PartApplication[]> {
  const embedded = await supabase
    .from("variant_parts")
    .select(`detail, parts!inner ( slug ), car_catalog ( ${CARD_COLUMNS} )`)
    .eq("parts.slug", slug)
    .returns<ApplicationRow[]>();

  if (!embedded.error) {
    return (embedded.data ?? [])
      .filter((row): row is { detail: string | null; car_catalog: CatalogCardRow } =>
        Boolean(row.car_catalog),
      )
      .map((row) => ({ car: row.car_catalog, detail: row.detail }))
      .sort(byCarName);
  }

  console.error("part applications (embedded) failed:", embedded.error.message);
  const links = await supabase
    .from("variant_parts")
    .select("detail, variant_id, parts!inner ( slug )")
    .eq("parts.slug", slug)
    .returns<{ detail: string | null; variant_id: string }[]>();
  const rows = links.data ?? [];
  if (links.error || rows.length === 0) return [];

  const cars = await supabase
    .from("car_catalog")
    .select(CARD_COLUMNS)
    .in(
      "variant_id",
      rows.map((row) => row.variant_id),
    )
    .returns<CatalogCardRow[]>();
  if (cars.error) {
    console.error("part applications (fallback) failed:", cars.error.message);
    return [];
  }
  const detailById = new Map(rows.map((row) => [row.variant_id, row.detail]));
  return (cars.data ?? [])
    .map((car) => ({ car, detail: detailById.get(car.variant_id ?? "") ?? null }))
    .sort(byCarName);
}

/**
 * One part with its category, related parts and the cars that record it.
 * One round trip: the part (relations embedded) and its applications are read
 * in parallel. (It used to take three sequential round trips.)
 */
export const getPartDetail = cache(async function getPartDetail(
  slug: string,
): Promise<PartPageData | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();
    const [partResult, applications] = await Promise.all([
      supabase
        .from("parts")
        .select(PART_SELECT)
        .eq("slug", slug)
        .limit(1)
        .returns<PartRow[]>(),
      readApplications(supabase, slug),
    ]);

    if (partResult.error) {
      console.error("getPartDetail failed:", partResult.error.message);
      return null;
    }
    const row = partResult.data?.[0];
    if (!row?.part_categories) return null;

    const { part_categories: category, forward, reverse, ...part } = row;
    const seen = new Set<string>([part.id]);
    const related = [...(forward ?? []), ...(reverse ?? [])]
      .map((entry) => entry.parts)
      .filter((entry): entry is Part => {
        if (!entry || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .sort((a, b) => collator.compare(a.name, b.name));

    return { part, category, related, applications };
  } catch (error) {
    console.error("getPartDetail threw:", error);
    return null;
  }
});

// ---------------------------------------------------------------------------
// /parts/[slug]: a category or a part
// ---------------------------------------------------------------------------

export type PartCategoryPageData = {
  category: PartsIndexCategory;
  /** Every category, for the page's category navigation. */
  categories: PartCategory[];
};

/**
 * Resolves /parts/[slug]: a category slug (/parts/braking) or a part slug
 * (/parts/brake-disc). Category wins when both exist. The category lookup
 * and the part lookup run in parallel, so either answer costs one round trip.
 */
export const resolvePartsSlug = cache(async function resolvePartsSlug(
  slug: string,
): Promise<PartsRoute<PartCategoryPageData, PartPageData>> {
  const [index, part] = await Promise.all([getPartsIndex(), getPartDetail(slug)]);
  const category = index.find((entry) => entry.slug === slug);
  return pickPartsRoute(
    category
      ? {
          category,
          categories: index.map(({ parts: _parts, ...entry }) => entry),
        }
      : null,
    part,
  );
});

/** Category slugs, then part slugs: every page /parts/[slug] can render. */
export async function getAllPartsRouteSlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("part_categories")
      .select("slug, parts ( slug )")
      .returns<{ slug: string; parts: { slug: string }[] | null }[]>();
    if (error) {
      console.error("getAllPartsRouteSlugs failed:", error.message);
      return [];
    }
    const rows = data ?? [];
    return partsRouteSlugs(
      rows.map((row) => row.slug),
      rows.flatMap((row) => (row.parts ?? []).map((part) => part.slug)),
    );
  } catch (error) {
    console.error("getAllPartsRouteSlugs threw:", error);
    return [];
  }
}
