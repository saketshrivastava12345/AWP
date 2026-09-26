import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type {
  CatalogCar,
  Part,
  PartCategory,
  PartDetail,
  ViewerGroup,
} from "@/types/domain";

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
      parts: (category.parts ?? []).sort(
        (a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name),
      ),
    }));
  } catch (error) {
    console.error("listPartCategories threw:", error);
    return [];
  }
}

const PART_CAR_COLUMNS = [
  "variant_id",
  "variant_slug",
  "variant_name",
  "model_slug",
  "model_name",
  "manufacturer_slug",
  "manufacturer_name",
  "country_flag_emoji",
  "fuel_type",
  "power_hp",
].join(",");

/**
 * One part, with its related parts and the cars that carry a note about it.
 *
 * `part_relations` stores one canonical row per unordered pair, so the related
 * list has to be read in both directions and merged.
 */
export async function getPartDetail(slug: string): Promise<PartDetail | null> {
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();

    const { data: partData, error: partError } = await supabase
      .from("parts")
      .select("*, part_categories!inner (*)")
      .eq("slug", slug)
      .limit(1)
      .returns<(Part & { part_categories: PartCategory | null })[]>();

    if (partError) {
      console.error("getPartDetail failed:", partError.message);
      return null;
    }

    const row = partData?.[0];
    const category = row?.part_categories;
    if (!row || !category) return null;

    const { part_categories: _ignored, ...part } = row;

    const [forwardResult, reverseResult, usageResult] = await Promise.all([
      supabase
        .from("part_relations")
        .select("parts!part_relations_related_part_id_fkey (*)")
        .eq("part_id", part.id)
        .returns<{ parts: Part | null }[]>(),
      supabase
        .from("part_relations")
        .select("parts!part_relations_part_id_fkey (*)")
        .eq("related_part_id", part.id)
        .returns<{ parts: Part | null }[]>(),
      supabase
        .from("variant_parts")
        .select(`detail, car_variants!inner ( id )`)
        .eq("part_id", part.id)
        .returns<{ detail: string | null; car_variants: { id: string } | null }[]>(),
    ]);

    const related = [...(forwardResult.data ?? []), ...(reverseResult.data ?? [])]
      .map((entry) => entry.parts)
      .filter((entry): entry is Part => entry !== null)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Resolve the variants that mention this part through the catalogue view,
    // so the cards have the same shape as everywhere else in the app.
    const usageRows = (usageResult.data ?? []).filter((entry) => entry.car_variants);
    let usedBy: PartDetail["usedBy"] = [];

    if (usageRows.length > 0) {
      const variantIds = usageRows.map((entry) => entry.car_variants!.id);
      const { data: carData } = await supabase
        .from("car_catalog")
        .select(PART_CAR_COLUMNS)
        .in("variant_id", variantIds)
        .returns<CatalogCar[]>();

      const detailById = new Map(
        usageRows.map((entry) => [entry.car_variants!.id, entry.detail]),
      );
      usedBy = (carData ?? []).map((variant) => ({
        variant,
        detail: variant.variant_id ? (detailById.get(variant.variant_id) ?? null) : null,
      }));
    }

    return { part, category, related, usedBy };
  } catch (error) {
    console.error("getPartDetail threw:", error);
    return null;
  }
}

export async function getAllPartSlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("parts")
      .select("slug")
      .returns<{ slug: string }[]>();
    if (error) {
      console.error("getAllPartSlugs failed:", error.message);
      return [];
    }
    return (data ?? []).map((row) => row.slug);
  } catch (error) {
    console.error("getAllPartSlugs threw:", error);
    return [];
  }
}

/** Parts attached to a given viewer group, for the 3D exploded-view panels. */
export async function getPartsForViewerGroup(group: ViewerGroup): Promise<Part[]> {
  if (!isConfigured()) return [];
  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("parts")
      .select("*")
      .eq("viewer_group", group)
      .order("display_order")
      .returns<Part[]>();

    if (error) {
      console.error("getPartsForViewerGroup failed:", error.message);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error("getPartsForViewerGroup threw:", error);
    return [];
  }
}
