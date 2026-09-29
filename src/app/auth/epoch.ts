import "server-only";

import { cookies } from "next/headers";
import { AUTH_EPOCH_COOKIE } from "@/lib/favorites/constants";
import { siteConfig } from "@/lib/site-config";

/**
 * Rotate the auth epoch cookie. Called by every server action or route that
 * signs someone in or out.
 *
 * The cookie is a random marker with no meaning of its own (it grants
 * nothing, so it is readable by scripts). The client favourites store notes
 * its value when it reads the session and compares on every mount, focus and
 * tab switch: a different value means "the session changed since you last
 * asked", which catches a redirecting form post, a sign-in without
 * JavaScript and a sign-out in another tab alike.
 */
export async function rotateAuthEpoch(): Promise<void> {
  try {
    const store = await cookies();
    store.set(AUTH_EPOCH_COOKIE, crypto.randomUUID().slice(0, 12), {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      secure: siteConfig.url.startsWith("https://"),
      maxAge: 60 * 60 * 24 * 365,
    });
  } catch (error) {
    // Only possible outside an action or route handler. The store still
    // re-reads the session on focus, so this is an optimisation lost, not a bug.
    console.error("rotateAuthEpoch failed:", error);
  }
}
