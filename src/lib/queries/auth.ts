import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
};

/**
 * The signed-in user plus their profile row, or null.
 *
 * Wrapped in `cache()` so the navbar, the page and any guard all share one
 * round trip per request.
 *
 * Uses `getUser()`, not `getSession()`: getSession only decodes the cookie,
 * which the client controls. Anything that gates access must revalidate the
 * token with Supabase.
 */
export const getSessionUser = cache(
  async function getSessionUser(): Promise<SessionUser | null> {
    if (!isConfigured()) return null;

    try {
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .returns<{ display_name: string | null; role: UserRole }[]>()
        .maybeSingle();

      return {
        id: user.id,
        email: user.email ?? null,
        displayName: profile?.display_name ?? null,
        // Absent profile means the signup trigger has not caught up; treat as
        // the least-privileged role rather than assuming anything.
        role: profile?.role ?? "user",
      };
    } catch (error) {
      // Re-throw Next's own control-flow errors (redirect, notFound, dynamic
      // bailout) so the framework can act on them.
      unstable_rethrow(error);

      // During partial prerendering, `cookies()` rejects once the static shell
      // is complete. That is the framework marking this subtree as a dynamic
      // hole, not a fault — it happens on every prerendered route and must not
      // be logged as an error.
      if (error instanceof Error && /prerender/i.test(error.message)) return null;

      console.error("getSessionUser threw:", error);
      return null;
    }
  },
);

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}
