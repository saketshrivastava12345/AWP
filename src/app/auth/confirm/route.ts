import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { rotateAuthEpoch } from "../epoch";
import { safeNextPath } from "../next-path";
import { isTokenHash, parseEmailLinkType } from "../validation";

/** Codes from Supabase's PKCE email links: opaque, URL-safe, bounded. */
function isAuthCode(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{6,256}$/.test(value);
}

/**
 * GET /auth/confirm — where email links land (sign-up confirmation, password
 * reset, email change).
 *
 * Supports both link styles:
 * - `?token_hash=…&type=…` (the SSR email template) → verifyOtp;
 * - `?code=…` (Supabase's default PKCE template) → exchangeCodeForSession.
 *
 * On success the session cookies are set and the visitor goes to the
 * validated `next` (a reset lands on /account/password). On any failure they
 * go to /login?error=link, which explains that the link expired or was used.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = parseEmailLinkType(params.get("type"));
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const next = safeNextPath(
    params.get("next"),
    type === "recovery" ? "/account/password" : "/",
  );

  let verified = false;
  if (isConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      if (type && isTokenHash(tokenHash)) {
        const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
        verified = !error;
        if (error) console.warn("auth/confirm verifyOtp:", error.status, error.code);
      } else if (isAuthCode(code)) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        verified = !error;
        if (error) console.warn("auth/confirm exchangeCode:", error.status, error.code);
      }
    } catch (error) {
      console.error("auth/confirm threw:", error);
      verified = false;
    }
  }

  if (!verified) redirect("/login?error=link");
  await rotateAuthEpoch();
  redirect(next);
}
