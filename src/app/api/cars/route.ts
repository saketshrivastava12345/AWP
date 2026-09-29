import { NextResponse, type NextRequest } from "next/server";
import { getCatalogCardsByIds } from "@/lib/queries/favorites";
import { parseIdsParam } from "@/lib/favorites/ids";
import { MAX_CARS_PER_REQUEST } from "@/lib/favorites/constants";

/**
 * GET /api/cars?ids=<uuid>,<uuid>,… -> { cars: CatalogCardRow[] }
 *
 * Catalogue card rows for up to 50 variants, in the order asked for. Backs
 * the saved-cars and recently-viewed lists, whose ids live in the browser.
 *
 * Public data only (the anonymous role under RLS), so unknown and
 * unpublished ids are simply absent from the answer, and the response can be
 * cached by a CDN for a few minutes. Invalid ids are ignored; more than 50
 * distinct valid ids is a 400 rather than a silently truncated answer.
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("ids");
  const ids = parseIdsParam(raw, MAX_CARS_PER_REQUEST + 1);

  if (ids.length > MAX_CARS_PER_REQUEST) {
    return NextResponse.json(
      { error: `At most ${MAX_CARS_PER_REQUEST} ids per request.` },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (ids.length === 0) return NextResponse.json({ cars: [] });

  const cars = await getCatalogCardsByIds(ids);
  if (cars === null) {
    // Not an empty answer: "none of these exist" would make the client tell
    // people their saved cars have left the catalogue.
    return NextResponse.json(
      { error: "The catalogue is unavailable right now." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { cars },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
