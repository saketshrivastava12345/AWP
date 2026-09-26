"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { requirePublicEnv } from "@/lib/env";

/**
 * Browser Supabase client.
 *
 * Only for things that genuinely must run client-side: signing in, toggling a
 * favorite, live filter refinement. Catalogue reads happen on the server so
 * they can be cached and so the markup arrives complete.
 */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
