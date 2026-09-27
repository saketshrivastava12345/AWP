import "server-only";

import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";
import type { UserRole } from "@/types/domain";

export type SessionUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
};

/** Just who is signed in, verified with Supabase. */
export type AuthUser = { id: string; email: string | null };

/**
 * Errors that mean "stop and let Next handle this": redirects, notFound and
 * the partial-prerender bailout. Returns true when the error was the expected
 * prerender rejection (swallow it), false for a real fault (log it).
 */
function isExpectedBailout(error: unknown): boolean {
  // Re-throw Next's own control-flow errors (redirect, notFound, dynamic
  // bailout) so the framework can act on them.
  unstable_rethrow(error);
  // During partial prerendering, `cookies()` rejects once the static shell is
  // complete. That is the framework marking this subtree as a dynamic hole,
  // not a fault — it happens on every prerendered route and must not be
  // logged as an error.
  return error instanceof Error && /prerender/i.test(error.message);
}

/**
 * The signed-in user's id and email, or null.
 *
 * Uses `getUser()`, not `getSession()`: getSession only decodes the cookie,
 * which the client controls. Anything that gates access must revalidate the
 * token with Supabase. Wrapped in `cache()` so one request makes one call.
 */
export const getAuthUser = cache(async function getAuthUser(): Promise<AuthUser | null> {
  if (!isConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return { id: user.id, email: user.email ?? null };
  } catch (error) {
    if (!isExpectedBailout(error)) console.error("getAuthUser threw:", error);
    return null;
  }
});

/**
 * The signed-in user plus their profile row, or null.
 *
 * Wrapped in `cache()` so the navbar, the page and any guard all share one
 * round trip per request.
 */
export const getSessionUser = cache(
  async function getSessionUser(): Promise<SessionUser | null> {
    const user = await getAuthUser();
    if (!user) return null;

    try {
      const supabase = await createServerSupabaseClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", user.id)
        .returns<{ display_name: string | null; role: UserRole }[]>()
        .maybeSingle();

      return {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name ?? null,
        // Absent profile means the signup trigger has not caught up; treat as
        // the least-privileged role rather than assuming anything.
        role: profile?.role ?? "user",
      };
    } catch (error) {
      if (!isExpectedBailout(error)) console.error("getSessionUser threw:", error);
      return null;
    }
  },
);

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}

/**
 * How long after following a password-reset link the new password may be
 * set without the current one. The link proved control of the inbox; that
 * proof should not last for the whole session.
 */
const RECOVERY_WINDOW_SECONDS = 30 * 60;

/** Sign-in methods that prove control of the email address just now. */
const EMAIL_PROOF_METHODS = new Set(["recovery", "otp", "magiclink"]);

type AmrEntry = { method?: unknown; timestamp?: unknown };

export type PasswordChangeContext = {
  user: AuthUser;
  /**
   * True when this session came from a password-reset (or other email) link
   * within the last half hour: the current password is then not asked for,
   * because the visitor is here precisely because they do not know it.
   */
  viaEmailLink: boolean;
};

/**
 * Who is changing their password, and whether they must confirm the current
 * one. The sign-in method comes from the access token's `amr` claim, read
 * through `getClaims()`, which verifies the token (by signature, or with a
 * getUser round trip for symmetric keys) before trusting its contents.
 */
export async function getPasswordChangeContext(): Promise<PasswordChangeContext | null> {
  const user = await getAuthUser();
  if (!user) return null;

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data) return { user, viaEmailLink: false };

    const amr: unknown = (data.claims as { amr?: unknown }).amr;
    const now = Math.floor(Date.now() / 1000);
    const viaEmailLink =
      Array.isArray(amr) &&
      amr.some((entry: AmrEntry) => {
        const method = typeof entry?.method === "string" ? entry.method : "";
        const at = typeof entry?.timestamp === "number" ? entry.timestamp : 0;
        return EMAIL_PROOF_METHODS.has(method) && now - at <= RECOVERY_WINDOW_SECONDS;
      });
    return { user, viaEmailLink };
  } catch (error) {
    if (!isExpectedBailout(error))
      console.error("getPasswordChangeContext threw:", error);
    return { user, viaEmailLink: false };
  }
}

export type PasswordCheck = "valid" | "invalid" | "rate_limited" | "unavailable";

/**
 * Check a password without touching the visitor's own session.
 *
 * Uses a throwaway, cookie-free client: signing in on the cookie client would
 * replace the session mid-request. The throwaway session is revoked straight
 * away so it does not linger in the user's session list.
 */
export async function verifyPassword(
  email: string,
  password: string,
): Promise<PasswordCheck> {
  const env = getPublicEnv();
  if (!env) return "unavailable";

  try {
    const client = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status === 429) return "rate_limited";
      // Any other 4xx is a wrong password; anything else means the check
      // could not be made (network, server), which is not the user's fault.
      return error.status !== undefined && error.status >= 400 && error.status < 500
        ? "invalid"
        : "unavailable";
    }
    if (data.session) {
      await client.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
    return "valid";
  } catch (error) {
    console.error("verifyPassword threw:", error);
    return "unavailable";
  }
}
