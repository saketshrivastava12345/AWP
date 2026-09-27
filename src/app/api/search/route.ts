import { NextResponse, type NextRequest } from "next/server";
import { MAX_SEARCH_LENGTH, searchCatalogue } from "@/lib/queries/search";

/**
 * GET /api/search?q=911%20gt
 *
 * Backs the command palette. Public data only (the query runs as the anonymous
 * role under RLS), so the response may be cached by the browser and a CDN for a
 * short while.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "")
    .trim()
    .slice(0, MAX_SEARCH_LENGTH);
  if (!q) return NextResponse.json({ results: [] });

  const results = await searchCatalogue(q, 6);
  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
