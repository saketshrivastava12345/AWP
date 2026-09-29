import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/queries/auth";
import { listFavoriteIds } from "@/lib/queries/favorites";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/favorites -> { signedIn: boolean, ids: string[] }
 *
 * Tells the client favourites store who is signed in and which cars they
 * saved, newest first. Per-user and read on every page load, so it is never
 * cached anywhere. The user is verified with `getUser()`; the ids come from a
 * query that RLS limits to that user's rows.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ signedIn: false, ids: [] }, { headers: PRIVATE });

  const ids = await listFavoriteIds();
  if (ids === null) {
    return NextResponse.json(
      { error: "Saved cars are unavailable right now." },
      { status: 503, headers: PRIVATE },
    );
  }
  return NextResponse.json({ signedIn: true, ids }, { headers: PRIVATE });
}
