"use server";

import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { filterCatalogueIds, listFavoriteIds } from "@/lib/queries/favorites";
import { normalizeId, sanitizeIds } from "@/lib/favorites/ids";
import { MAX_GUEST_FAVORITES, MAX_RECENT_STORED } from "@/lib/favorites/constants";

/*
 * Writes for saved cars and recently viewed.
 *
 * Every action re-reads the user with `getUser()` (which verifies the token
 * with Supabase) and takes the user id from that — never from the client.
 * Row level security enforces the same rule a second time. Inputs arrive from
 * the network and are validated as `unknown`.
 *
 * None of these revalidate or refresh: the client store holds the state and
 * updates optimistically, so a whole-route re-render would be wasted work.
 */

export type FavoriteFailure = "signed_out" | "invalid" | "not_found" | "unavailable";

export type FavoriteWriteResult = { ok: true } | { ok: false; reason: FavoriteFailure };

export type MergeResult =
  { ok: true; ids: string[]; merged: number } | { ok: false; reason: FavoriteFailure };

type Authed = {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
};

async function authenticate(): Promise<Authed | FavoriteFailure> {
  if (!isConfigured()) return "unavailable";
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return "signed_out";
    return { supabase, userId: data.user.id };
  } catch (error) {
    console.error("favorites authenticate threw:", error);
    return "unavailable";
  }
}

/** Save a car. Saving one that is already saved is a success. */
export async function addFavorite(variantId: unknown): Promise<FavoriteWriteResult> {
  const id = normalizeId(variantId);
  if (!id) return { ok: false, reason: "invalid" };

  const auth = await authenticate();
  if (typeof auth === "string") return { ok: false, reason: auth };

  const existing = await filterCatalogueIds([id]);
  if (existing === null) return { ok: false, reason: "unavailable" };
  if (existing.length === 0) return { ok: false, reason: "not_found" };

  try {
    // ON CONFLICT DO NOTHING: needs only the INSERT grant, and makes a
    // double-click or a stale tab harmless instead of a primary-key error.
    const { error } = await auth.supabase
      .from("favorites")
      .upsert(
        { user_id: auth.userId, variant_id: id },
        { onConflict: "user_id,variant_id", ignoreDuplicates: true },
      );
    if (error) {
      console.error("addFavorite failed:", error.message);
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true };
  } catch (error) {
    console.error("addFavorite threw:", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** Remove a saved car. Removing one that is not saved is a success. */
export async function removeFavorite(variantId: unknown): Promise<FavoriteWriteResult> {
  const id = normalizeId(variantId);
  if (!id) return { ok: false, reason: "invalid" };

  const auth = await authenticate();
  if (typeof auth === "string") return { ok: false, reason: auth };

  try {
    const { error } = await auth.supabase
      .from("favorites")
      .delete()
      .eq("user_id", auth.userId)
      .eq("variant_id", id);
    if (error) {
      console.error("removeFavorite failed:", error.message);
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true };
  } catch (error) {
    console.error("removeFavorite threw:", error);
    return { ok: false, reason: "unavailable" };
  }
}

/**
 * Move cars saved on this device into the account after signing in.
 *
 * Accepts at most 200 uuids; anything that is not a published catalogue
 * variant is dropped. Returns the account's full list afterwards so the
 * client can replace its state in one step.
 */
export async function mergeGuestFavorites(variantIds: unknown): Promise<MergeResult> {
  if (!Array.isArray(variantIds) || variantIds.length > MAX_GUEST_FAVORITES) {
    return { ok: false, reason: "invalid" };
  }
  const ids = sanitizeIds(variantIds, MAX_GUEST_FAVORITES);
  if (ids.length !== variantIds.length) return { ok: false, reason: "invalid" };

  const auth = await authenticate();
  if (typeof auth === "string") return { ok: false, reason: auth };

  const existing = await filterCatalogueIds(ids);
  if (existing === null) return { ok: false, reason: "unavailable" };

  try {
    if (existing.length > 0) {
      const { error } = await auth.supabase.from("favorites").upsert(
        existing.map((variant_id) => ({ user_id: auth.userId, variant_id })),
        { onConflict: "user_id,variant_id", ignoreDuplicates: true },
      );
      if (error) {
        console.error("mergeGuestFavorites failed:", error.message);
        return { ok: false, reason: "unavailable" };
      }
    }
  } catch (error) {
    console.error("mergeGuestFavorites threw:", error);
    return { ok: false, reason: "unavailable" };
  }

  const all = await listFavoriteIds();
  if (all === null) return { ok: false, reason: "unavailable" };
  return { ok: true, ids: all, merged: existing.length };
}

/**
 * Record that the signed-in user opened a car (the client throttles this to
 * once per car per ten minutes). Keeps the newest 50 rows per account.
 */
export async function recordRecentView(variantId: unknown): Promise<FavoriteWriteResult> {
  const id = normalizeId(variantId);
  if (!id) return { ok: false, reason: "invalid" };

  const auth = await authenticate();
  if (typeof auth === "string") return { ok: false, reason: auth };

  try {
    const { error } = await auth.supabase
      .from("recently_viewed")
      .upsert(
        { user_id: auth.userId, variant_id: id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,variant_id" },
      );
    if (error) {
      // 23503: the variant does not exist (a foreign key, not a fault).
      if (error.code === "23503") return { ok: false, reason: "not_found" };
      console.error("recordRecentView failed:", error.message);
      return { ok: false, reason: "unavailable" };
    }

    // Trim the tail so the table cannot grow without bound per account.
    const { data: overflow } = await auth.supabase
      .from("recently_viewed")
      .select("variant_id")
      .eq("user_id", auth.userId)
      .order("viewed_at", { ascending: false })
      .range(MAX_RECENT_STORED, MAX_RECENT_STORED + 99)
      .returns<{ variant_id: string }[]>();
    if (overflow && overflow.length > 0) {
      await auth.supabase
        .from("recently_viewed")
        .delete()
        .eq("user_id", auth.userId)
        .in(
          "variant_id",
          overflow.map((row) => row.variant_id),
        );
    }
    return { ok: true };
  } catch (error) {
    console.error("recordRecentView threw:", error);
    return { ok: false, reason: "unavailable" };
  }
}

/** Forget every recently viewed car on the account. */
export async function clearRecentlyViewed(): Promise<FavoriteWriteResult> {
  const auth = await authenticate();
  if (typeof auth === "string") return { ok: false, reason: auth };

  try {
    const { error } = await auth.supabase
      .from("recently_viewed")
      .delete()
      .eq("user_id", auth.userId);
    if (error) {
      console.error("clearRecentlyViewed failed:", error.message);
      return { ok: false, reason: "unavailable" };
    }
    return { ok: true };
  } catch (error) {
    console.error("clearRecentlyViewed threw:", error);
    return { ok: false, reason: "unavailable" };
  }
}
