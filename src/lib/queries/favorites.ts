import "server-only";

import { reportQueryError } from "@/lib/queries/report";

import {
  createServerSupabaseClient,
  createStaticClient,
  isConfigured,
} from "@/lib/supabase/server";
import { CARD_COLUMNS, type CatalogCardRow } from "@/lib/queries/catalog-columns";

/*
 * Saved cars on the server.
 *
 * No function here takes a user id, and none needs one: the `favorites` RLS
 * policies restrict every read and write to `auth.uid() = user_id`, so a query
 * on the cookie-aware client can only ever see the caller's own rows. The
 * database is the access control, not these functions. Writes (which must
 * name the user_id column) take it from `getUser()` in the server action.
 */

/**
 * The signed-in user's saved variant ids, most recently saved first.
 * `null` means the read failed — distinct from "nothing saved".
 */
export async function listFavoriteIds(): Promise<string[] | null> {
  if (!isConfigured()) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("favorites")
      .select("variant_id, created_at")
      .order("created_at", { ascending: false })
      .order("variant_id")
      .returns<{ variant_id: string; created_at: string }[]>();

    if (error) {
      reportQueryError("listFavoriteIds failed:", error.message);
      return null;
    }
    return (data ?? []).map((row) => row.variant_id);
  } catch (error) {
    reportQueryError("listFavoriteIds threw:", error);
    return null;
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

    if (error) {
      reportQueryError("isFavorited failed:", error.message);
      return false;
    }
    return data !== null;
  } catch (error) {
    reportQueryError("isFavorited threw:", error);
    return false;
  }
}

/** How many cars the user has saved, for the navbar badge. */
export async function countFavorites(): Promise<number> {
  if (!isConfigured()) return 0;
  try {
    const supabase = await createServerSupabaseClient();
    const { count, error } = await supabase
      .from("favorites")
      .select("variant_id", { count: "exact", head: true });
    if (error) {
      reportQueryError("countFavorites failed:", error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    reportQueryError("countFavorites threw:", error);
    return 0;
  }
}

/**
 * Card rows for the given variant ids, in the order asked for.
 *
 * Reads the public catalogue as `anon` through the cached static client, so
 * drafts are invisible (car_catalog is security_invoker) and ids that are
 * unknown or unpublished simply do not come back. `null` means the read
 * failed, which a caller must not mistake for "none of these exist".
 */
export async function getCatalogCardsByIds(
  ids: readonly string[],
): Promise<CatalogCardRow[] | null> {
  if (ids.length === 0) return [];
  if (!isConfigured()) return null;

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(CARD_COLUMNS)
      .in("variant_id", [...ids])
      .returns<CatalogCardRow[]>();

    if (error) {
      reportQueryError("getCatalogCardsByIds failed:", error.message);
      return null;
    }

    const byId = new Map((data ?? []).map((row) => [row.variant_id, row]));
    return ids.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  } catch (error) {
    reportQueryError("getCatalogCardsByIds threw:", error);
    return null;
  }
}

/**
 * Which of these ids are published catalogue variants, as the signed-in
 * user's client sees them. Used to validate input before a write.
 * `null` means the check failed.
 */
export async function filterCatalogueIds(
  ids: readonly string[],
): Promise<string[] | null> {
  if (ids.length === 0) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select("variant_id")
      .in("variant_id", [...ids])
      .returns<{ variant_id: string | null }[]>();

    if (error) {
      reportQueryError("filterCatalogueIds failed:", error.message);
      return null;
    }
    const found = new Set((data ?? []).map((row) => row.variant_id));
    return ids.filter((id) => found.has(id));
  } catch (error) {
    reportQueryError("filterCatalogueIds threw:", error);
    return null;
  }
}
