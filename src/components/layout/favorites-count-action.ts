"use server";

import { getSessionUser } from "@/lib/queries/auth";
import { countFavorites } from "@/lib/queries/favorites";

/**
 * The signed-in visitor's saved-car count, for the navbar badge to re-read
 * after a car is saved or removed without a page load. Null when nobody is
 * signed in. It can only ever count the caller's own rows: the favorites RLS
 * policy restricts the table to auth.uid() = user_id.
 */
export async function readSignedInFavoritesCount(): Promise<number | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return countFavorites();
}
