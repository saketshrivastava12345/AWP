import "server-only";

import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import type { CatalogCar } from "@/types/domain";

const FAVORITE_CAR_COLUMNS = [
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

/**
 * The signed-in user's saved cars.
 *
 * No user id is passed in and none is needed: the `favorites` RLS policy
 * restricts the table to `auth.uid() = user_id`, so this query can only ever
 * return the caller's own rows. The database is the access control, not this
 * function.
 */
export async function listFavorites(): Promise<CatalogCar[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = await createServerSupabaseClient();

    const { data: rows, error } = await supabase
      .from("favorites")
      .select("variant_id, created_at")
      .order("created_at", { ascending: false })
      .returns<{ variant_id: string; created_at: string }[]>();

    if (error) {
      console.error("listFavorites failed:", error.message);
      return [];
    }
    if (!rows || rows.length === 0) return [];

    const { data: cars, error: carsError } = await supabase
      .from("car_catalog")
      .select(FAVORITE_CAR_COLUMNS)
      .in(
        "variant_id",
        rows.map((row) => row.variant_id),
      )
      .returns<CatalogCar[]>();

    if (carsError) {
      console.error("listFavorites cars failed:", carsError.message);
      return [];
    }

    // Preserve the "most recently saved first" order from the favorites table,
    // which the catalogue query does not know about.
    const order = new Map(rows.map((row, index) => [row.variant_id, index]));
    return (cars ?? []).sort(
      (a, b) =>
        (order.get(a.variant_id ?? "") ?? 0) - (order.get(b.variant_id ?? "") ?? 0),
    );
  } catch (error) {
    console.error("listFavorites threw:", error);
    return [];
  }
}

/** Whether the current user has saved this variant. */
export async function isFavorited(variantId: string): Promise<boolean> {
  if (!isConfigured()) return false;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("favorites")
      .select("variant_id")
      .eq("variant_id", variantId)
      .returns<{ variant_id: string }[]>()
      .maybeSingle();

    return !error && data !== null;
  } catch {
    return false;
  }
}

/** How many cars the user has saved, for the navbar badge. */
export async function countFavorites(): Promise<number> {
  if (!isConfigured()) return 0;
  try {
    const supabase = await createServerSupabaseClient();
    const { count } = await supabase
      .from("favorites")
      .select("variant_id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}
