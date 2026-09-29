import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicEnv, requirePublicEnv } from "@/lib/env";
import { CACHE_SECONDS, CACHE_TAGS, type CacheTag } from "@/lib/cache-tags";

/** How long catalogue reads stay fresh. The data changes rarely. */
export const CATALOGUE_REVALIDATE_SECONDS = CACHE_SECONDS.catalogue;

/**
 * Anonymous, cookie-free client for public catalogue reads.
 *
 * This is the one used by almost every page. Reading cookies would opt the
 * route out of static rendering entirely, and the catalogue is identical for
 * every visitor — so instead we attach Next's fetch cache options and let
 * pages be prerendered and revalidated.
 *
 * `tag` picks the cache bucket (and its lifetime): prices change more often
 * than specifications, so they are cached separately and more briefly. Admin
 * writes invalidate the bucket they touched with `updateTag`.
 *
 * Row level security still applies: this client authenticates with the
 * publishable key and therefore acts as `anon`.
 */
export function createStaticClient(tag: CacheTag = CACHE_TAGS.catalogue) {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  const revalidate = CACHE_SECONDS[tag];

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          next: { revalidate, tags: [tag] },
        }),
    },
  });
}

/**
 * Cookie-aware client that carries the signed-in user's session.
 *
 * Use only where the answer depends on who is asking — favorites, the profile
 * row, the admin area. Any route using this becomes dynamically rendered.
 */
export async function createServerSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Session refresh is handled by middleware instead, so this is safe
          // to ignore.
        }
      },
    },
  });
}

/**
 * True when Supabase credentials are present. Pages check this before querying
 * so that an unconfigured or unreachable backend renders an on-brand empty
 * state rather than throwing.
 */
export function isConfigured(): boolean {
  return getPublicEnv() !== null;
}
