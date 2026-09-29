import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/queries/auth";
import { listRecentlyViewed } from "@/lib/queries/recently-viewed";

const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/recently-viewed -> { signedIn: boolean, items: { id, viewedAt }[] }
 *
 * The signed-in user's recently viewed cars, most recent first, for merging
 * with the device's own list. Guests get an empty list: theirs lives only in
 * their browser.
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user)
    return NextResponse.json({ signedIn: false, items: [] }, { headers: PRIVATE });

  const items = await listRecentlyViewed();
  if (items === null) {
    return NextResponse.json(
      { error: "Recently viewed cars are unavailable right now." },
      { status: 503, headers: PRIVATE },
    );
  }
  return NextResponse.json({ signedIn: true, items }, { headers: PRIVATE });
}
