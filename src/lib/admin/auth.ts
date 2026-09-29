import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";

export type AdminSupabase = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export type AdminContext = {
  user: { id: string; email: string | null; displayName: string | null };
  /**
   * The cookie-aware client carrying the admin's own session. Every write goes
   * through it, so row level security (is_admin()) authorises each statement
   * a second time, independently of the check made here.
   */
  supabase: AdminSupabase;
};

async function resolveAdmin(): Promise<AdminContext | null> {
  if (!isConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    // getUser() revalidates the token with Supabase; getSession() would only
    // decode a cookie the client controls.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.role !== "admin") return null;

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        displayName: profile.display_name ?? null,
      },
      supabase,
    };
  } catch (error) {
    unstable_rethrow(error);
    // During prerendering cookies() rejects to mark a dynamic hole; that is
    // not a failure worth logging.
    if (error instanceof Error && /prerender/i.test(error.message)) return null;
    console.error("requireAdmin threw:", error);
    return null;
  }
}

/**
 * The single admin gate. Returns the admin's context, or null for everyone
 * else — signed out and signed-in non-admins alike, so the two cases can
 * never be told apart from the outside.
 *
 * Every admin page, layout, server action and route handler calls this; it is
 * cached per request so a page and its layout share one round trip.
 */
export const requireAdmin = cache(resolveAdmin);
