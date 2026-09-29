import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getPublicEnv } from "@/lib/env";

/**
 * Refresh the Supabase session on every matched request.
 *
 * Access tokens are short-lived. Without this, a signed-in user's session
 * expires mid-visit and server components start seeing them as anonymous —
 * favorites silently vanish and the admin area starts 404ing. The middleware
 * refreshes the token and writes the rotated cookies onto the response.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Unconfigured is a valid state: the catalogue still renders, so the
  // middleware must not throw the whole site down.
  const env = getPublicEnv();
  if (!env) return response;

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // A response carrying a session cookie must never be cached by a
        // CDN, or one visitor's token could be served to another.
        for (const [header, value] of Object.entries(headers ?? {})) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // getClaims() verifies the JWT locally (asymmetric keys; it falls back to a
  // getUser() round trip for HS256) and refreshes an expired session, which
  // writes the rotated cookies above. That is this proxy's only job: every
  // route that gates access re-checks the user with getUser() itself, so a
  // network round trip per request (including every Link prefetch) is waste.
  await supabase.auth.getClaims();

  return response;
}
