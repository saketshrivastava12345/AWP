"use client";

import { useSyncExternalStore } from "react";
import { FAVORITES_CHANGED_EVENT, GUEST_FAVORITES_KEY } from "@/lib/favorites/constants";
import { parseIdList } from "@/lib/favorites/ids";
import { CountBadge } from "./FavoritesLink";

/*
 * Contract with the favourites store (src/lib/favorites): a guest's saved cars
 * live in localStorage under GUEST_FAVORITES_KEY as a JSON array of variant
 * ids, and every change dispatches FAVORITES_CHANGED_EVENT on window. The ids
 * are parsed with the store's own parser, so the badge counts exactly what
 * the saved-cars page will show.
 */

function subscribe(onChange: () => void): () => void {
  // "storage" covers other tabs; the custom event covers this one, where the
  // storage event never fires.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GUEST_FAVORITES_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
  };
}

/** Number of valid, distinct saved ids; anything malformed counts as none. */
export function readGuestFavoritesCount(): number {
  try {
    return parseIdList(window.localStorage.getItem(GUEST_FAVORITES_KEY)).length;
  } catch {
    // Storage blocked (privacy settings): nothing can have been saved.
    return 0;
  }
}

/** A number snapshot, so React re-renders only when the count changes. */
export function useGuestFavoritesCount(): number {
  return useSyncExternalStore(subscribe, readGuestFavoritesCount, () => 0);
}

export function GuestFavoritesCount({ className }: { className?: string }) {
  return <CountBadge count={useGuestFavoritesCount()} className={className} />;
}
