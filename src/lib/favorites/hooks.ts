"use client";

import { useCallback, useSyncExternalStore } from "react";
import { normalizeId } from "./ids";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type FavoritesSnapshot,
} from "./store";

/** The whole favourites state: session readiness, mode and saved ids. */
export function useFavorites(): FavoritesSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether one car is saved. A boolean snapshot, so a card re-renders only
 * when its own heart changes, not whenever any car is saved.
 */
export function useIsFavorite(variantId: string): boolean {
  const id = normalizeId(variantId);
  const read = useCallback(() => (id ? getSnapshot().ids.includes(id) : false), [id]);
  return useSyncExternalStore(subscribe, read, () => false);
}

/**
 * How many cars are saved — the account's count when signed in, this
 * device's otherwise — for a navbar badge. Live: it follows every toggle,
 * merge and sign-in without a page reload. `null` until the session is known
 * (render nothing rather than a count that may jump).
 */
export function useFavoritesCount(): number | null {
  const read = useCallback(() => {
    const current = getSnapshot();
    return current.ready ? current.ids.length : null;
  }, []);
  return useSyncExternalStore(subscribe, read, () => null);
}
