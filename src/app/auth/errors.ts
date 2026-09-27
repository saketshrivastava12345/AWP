import {
  isAuthError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js";

/*
 * Server-side: imports supabase-js, so client components must not import it.
 */

export type AuthErrorKind = "rate_limited" | "unavailable" | "weak_password" | "rejected";

/**
 * Sort a Supabase auth failure into what the visitor can act on. A network
 * failure or a 5xx is "unavailable" (not their fault); a 429 is
 * "rate_limited"; any other 4xx is "rejected", and the caller decides how
 * much of that to say.
 */
export function classifyAuthError(error: unknown): {
  kind: AuthErrorKind;
  code: string | null;
} {
  if (isAuthRetryableFetchError(error)) return { kind: "unavailable", code: null };
  if (isAuthWeakPasswordError(error))
    return { kind: "weak_password", code: "weak_password" };
  if (isAuthError(error)) {
    const code = typeof error.code === "string" ? error.code : null;
    if (code === "weak_password") return { kind: "weak_password", code };
    const status = error.status;
    if (
      status === 429 ||
      code === "over_request_rate_limit" ||
      code === "over_email_send_rate_limit"
    ) {
      return { kind: "rate_limited", code };
    }
    if (status === undefined || status === 0 || status >= 500)
      return { kind: "unavailable", code };
    return { kind: "rejected", code };
  }
  return { kind: "unavailable", code: null };
}
