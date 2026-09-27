import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { FACET_COLUMNS, type FacetRow } from "@/lib/facets";

export type {
  FacetOption,
  FilterOptions,
  FacetRow,
  ListFacet,
  RangeFacet,
  PriceFacet,
} from "@/lib/facets";

const FACET_SELECT = FACET_COLUMNS.join(",");
/** Rows per request: at or under PostgREST's default max-rows. */
const PAGE = 1000;
/** A hard ceiling (20,000 variants) so a misconfigured server cannot loop forever. */
const MAX_PAGES = 20;

/**
 * The narrow facet columns of every car matching the free-text search (or of
 * the whole catalogue when there is none), in one query.
 *
 * Facet counts, range bounds and the result total are then computed in memory
 * by `computeFacets` — one read instead of an aggregate per facet, and counts
 * that can honour every other active filter. Twenty short columns per car is
 * a few hundred kilobytes even at thousands of variants.
 *
 * `ok: false` means the read failed; callers show their unavailable state
 * rather than facets that pretend the catalogue is empty.
 */
export async function getFacetRows(
  text?: string,
): Promise<{ rows: FacetRow[]; ok: boolean }> {
  if (!isConfigured()) return { rows: [], ok: false };

  try {
    const supabase = createStaticClient();
    const rows: FacetRow[] = [];

    // PostgREST caps a response (Supabase: 1,000 rows by default), so read in
    // pages until a short one comes back.
    for (let page = 0; page < MAX_PAGES; page += 1) {
      let query = supabase.from("car_catalog").select(FACET_SELECT);
      if (text?.trim()) {
        // Same search as listCars, so facet counts and results always agree.
        query = query.textSearch("search_document", text.trim(), {
          type: "websearch",
          config: "simple",
        });
      }
      const from = page * PAGE;
      const { data, error } = await query
        .order("variant_id", { ascending: true })
        .range(from, from + PAGE - 1)
        .returns<FacetRow[]>();

      if (error) {
        console.error("getFacetRows failed:", error.message);
        return { rows: [], ok: false };
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }
    return { rows, ok: true };
  } catch (error) {
    console.error("getFacetRows threw:", error);
    return { rows: [], ok: false };
  }
}
