/**
 * The `?next=` return path after signing in, validated.
 *
 * An open redirect on a sign-in page is a phishing kit: "sign in to AURIX"
 * and land on a look-alike that asks for the password again. So only a
 * same-origin path is accepted:
 *
 * - it must start with a single "/" (not "//evil.com", which browsers treat
 *   as protocol-relative, and not "/\evil.com", which some normalise to it);
 * - no control characters or backslashes anywhere (browsers strip tabs and
 *   newlines from URLs, so "/\t/evil.com" would become "//evil.com");
 * - it must not lead back into the auth pages, which would loop.
 *
 * Anything else falls back to "/". Pure and client-safe.
 */

export const DEFAULT_NEXT_PATH = "/";

/** Routes that must never be a return destination. */
const AUTH_ROUTES = ["/login", "/auth"];

const MAX_LENGTH = 512;

export function safeNextPath(
  value: unknown,
  fallback: string = DEFAULT_NEXT_PATH,
): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (!path || path.length > MAX_LENGTH) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  // Backslashes and control characters (incl. tab, CR, LF, DEL) anywhere.
  if (/[\\\u0000-\u001f\u007f]/.test(path)) return fallback;

  // Resolve against a throwaway origin: if the result leaves that origin the
  // input was not a plain path, whatever it looked like.
  let url: URL;
  try {
    url = new URL(path, "http://aurix.invalid");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://aurix.invalid") return fallback;

  // Compare on the decoded, normalised pathname, so "/%6Cogin" or "/x/../login"
  // cannot slip back into the auth pages.
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname).toLowerCase();
  } catch {
    return fallback;
  }
  if (pathname.startsWith("//") || pathname.includes("\\")) return fallback;
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isAuthRoute) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}

/** "/login?next=…" for a page that wants the visitor back afterwards. */
export function loginHref(next?: string | null): string {
  const target = safeNextPath(next, "");
  return target && target !== DEFAULT_NEXT_PATH
    ? `/login?next=${encodeURIComponent(target)}`
    : "/login";
}
