import "server-only";

import { reportQueryError } from "@/lib/queries/report";

import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { MAX_RECENT_STORED } from "@/lib/favorites/constants";

export type RecentView = { id: string; viewedAt: string };

/**
 * The signed-in user's recently viewed variants, most recent first.
 *
 * Like favourites, no user id is passed: the recently_viewed RLS policies
 * (migration 0008) restrict every row to `auth.uid() = user_id`. `null` means
 * the read failed.
 */
export async function listRecentlyViewed(
  limit: number = MAX_RECENT_STORED,
): Promise<RecentView[] | null> {
  if (!isConfigured()) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("recently_viewed")
      .select("variant_id, viewed_at")
      .order("viewed_at", { ascending: false })
      .limit(limit)
      .returns<{ variant_id: string; viewed_at: string }[]>();

    if (error) {
      reportQueryError("listRecentlyViewed failed:", error.message);
      return null;
    }
    return (data ?? []).map((row) => ({ id: row.variant_id, viewedAt: row.viewed_at }));
  } catch (error) {
    reportQueryError("listRecentlyViewed threw:", error);
    return null;
  }
}
