/**
 * The Supabase project URL is always a bare origin
 * ("https://abcdefghijkl.supabase.co"): every client appends /rest/v1,
 * /auth/v1 or /storage/v1 itself. The dashboard also shows the REST endpoint
 * ("…supabase.co/rest/v1/"), and a URL pasted with that suffix sends every
 * request to /rest/v1/rest/v1/… — which the API gateway answers with
 * "Invalid path specified in request URL" on every page.
 *
 * `normalizeSupabaseUrl` trims whitespace, a trailing slash and a pasted API
 * suffix, and turns a dashboard link to a project into its API URL. Anything
 * it does not recognise is returned unchanged (so a self-hosted install under
 * its own path keeps working), and `changed` says whether it fixed something.
 *
 * Pure and dependency-free. `scripts/doctor.mjs` carries a copy of the same
 * rules, since it runs under plain Node without the TypeScript toolchain.
 */

const API_SUFFIX = /\/(?:rest|auth|storage|realtime|graphql|functions)\/v1(?:\/.*)?$/i;
const DASHBOARD_PROJECT = /^\/dashboard\/project\/([a-z0-9]{20})(?:\/.*)?$/i;

export function normalizeSupabaseUrl(raw: string): { url: string; changed: boolean } {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { url: trimmed, changed: trimmed !== raw };
  }

  // https://supabase.com/dashboard/project/<ref>/… → https://<ref>.supabase.co
  if (/^(?:www\.)?supabase\.com$/i.test(parsed.hostname)) {
    const ref = DASHBOARD_PROJECT.exec(parsed.pathname)?.[1];
    if (ref) return { url: `https://${ref.toLowerCase()}.supabase.co`, changed: true };
  }

  const path = parsed.pathname.replace(API_SUFFIX, "").replace(/\/+$/, "");
  const url = `${parsed.origin}${path}`;
  return { url, changed: url !== raw };
}
