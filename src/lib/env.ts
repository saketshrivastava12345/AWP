/**
 * Environment access with a clear failure mode.
 *
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when the
 * property is referenced literally, so these must not be read dynamically.
 */

import { normalizeSupabaseUrl } from "./supabase-url";

const PUBLIC_ENV = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

export type PublicEnv = { supabaseUrl: string; supabaseAnonKey: string };

/**
 * Returns the public env, or `null` when Supabase is not configured.
 *
 * Deliberately non-throwing: the quality requirements call for a graceful
 * message when Supabase is unreachable or unconfigured, rather than a crashed
 * render. Callers surface an on-brand empty state instead.
 */
export function getPublicEnv(): PublicEnv | null {
  const { supabaseUrl, supabaseAnonKey } = PUBLIC_ENV;
  if (!supabaseUrl?.trim() || !supabaseAnonKey?.trim()) return null;
  // A URL pasted with the dashboard's "/rest/v1" suffix (or a trailing
  // slash, or stray spaces) would break every request; see supabase-url.ts.
  return {
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl).url,
    supabaseAnonKey: supabaseAnonKey.trim(),
  };
}

/** Same values, but throws — for server contexts where misconfiguration is a bug. */
export function requirePublicEnv(): PublicEnv {
  const env = getPublicEnv();
  if (!env) {
    throw new Error(
      "Missing Supabase environment variables. Copy .env.example to .env.local and " +
        "set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return env;
}

export const isSupabaseConfigured = (): boolean => getPublicEnv() !== null;
