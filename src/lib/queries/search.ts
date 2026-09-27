import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { SearchResult, SearchResultKind } from "@/types/domain";

/** Longest query accepted. Anything longer is not a search, it is a paste. */
export const MAX_SEARCH_LENGTH = 80;

const KINDS = new Set<SearchResultKind>(["car", "manufacturer", "country", "part"]);

type SearchRow = {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  image_url: string | null;
  score: number;
};

/**
 * Command-palette search across cars, manufacturers, countries and parts.
 *
 * Runs public.search_catalogue: prefix full-text matching ("911 gt" finds the
 * GT3) plus trigram similarity, so a typo such as "porche" still lands. The
 * RPC is issued as a GET so Next's fetch cache can hold each distinct query
 * under the catalogue tag. RLS still applies (SECURITY INVOKER), so drafts
 * never appear.
 *
 * Returns null when the search could not run, so a caller can tell an outage
 * from "nothing matches" (and must not cache the former).
 */
export async function searchCatalogue(
  query: string,
  perKind = 6,
): Promise<SearchResult[] | null> {
  // Control characters are never part of a search and PostgREST rejects some
  // (a NUL is an "unsupported Unicode escape").
  const q = query
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  if (!q || !isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .rpc("search_catalogue", { q, per_kind: perKind }, { get: true })
      .returns<SearchRow[]>();

    if (error) {
      console.error("searchCatalogue failed:", error.message);
      return null;
    }

    return (data ?? [])
      .filter((row): row is SearchRow & { kind: SearchResultKind } =>
        KINDS.has(row.kind as SearchResultKind),
      )
      .map((row) => ({
        kind: row.kind,
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        href: row.href,
        imageUrl: row.image_url,
        score: Number(row.score) || 0,
      }));
  } catch (error) {
    console.error("searchCatalogue threw:", error);
    return null;
  }
}
