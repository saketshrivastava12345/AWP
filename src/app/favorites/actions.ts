"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/queries/auth";

export type FavoriteResult = { ok: boolean; favorited: boolean; error?: string };

/**
 * Add or remove a favourite.
 *
 * The user id comes from the verified session, never from the form — a
 * client-supplied id would be an invitation to write into someone else's
 * favourites. The RLS policy would reject it anyway, but the server action
 * should not be asking the question in the first place.
 */
export async function toggleFavorite(
  variantId: string,
  currentlyFavorited: boolean,
): Promise<FavoriteResult> {
  if (!isConfigured()) {
    return { ok: false, favorited: currentlyFavorited, error: "Not configured." };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, favorited: currentlyFavorited, error: "Sign in to save cars." };
  }

  try {
    const supabase = await createServerSupabaseClient();

    if (currentlyFavorited) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("variant_id", variantId)
        .eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ variant_id: variantId, user_id: user.id });
      if (error) throw error;
    }

    revalidatePath("/favorites");
    return { ok: true, favorited: !currentlyFavorited };
  } catch (error) {
    console.error("toggleFavorite failed:", error);
    return {
      ok: false,
      favorited: currentlyFavorited,
      error: "Could not save that just now.",
    };
  }
}
