import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

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

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Unconfigured is a valid state: the catalogue still renders, so the
  // middleware must not throw the whole site down.
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() revalidates the token with Supabase. getSession() only reads the
  // cookie, which a client could have forged, so it must not be trusted here.
  await supabase.auth.getUser();

  return response;
}
