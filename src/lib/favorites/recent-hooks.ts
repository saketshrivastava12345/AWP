"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { MAX_RECENT } from "./constants";
import { useFavorites } from "./hooks";
import { mergeRecent, type RecentEntry } from "./recent";
import {
  clearRecent,
  getAccountRecent,
  getLocalRecent,
  getServerAccountRecent,
  getServerLocalRecent,
  loadAccountRecent,
  subscribeAccountRecent,
  subscribeLocalRecent,
} from "./recent-store";
import {
  getCard,
  getCardsVersion,
  requestCards,
  subscribeCards,
  type CardEntry,
} from "./cards";

export type RecentlyViewed = {
  /** Most recent first: this device's views, merged with the account's when signed in. */
  entries: readonly RecentEntry[];
  /** Still working out what to show (session or account list loading). */
  loading: boolean;
  signedIn: boolean;
  /** Clears this device and, when signed in, the account. Resolves false on failure. */
  clear: () => Promise<boolean>;
};

/** The recently viewed list for display. */
export function useRecentlyViewed(): RecentlyViewed {
  const local = useSyncExternalStore(
    subscribeLocalRecent,
    getLocalRecent,
    getServerLocalRecent,
  );
  const account = useSyncExternalStore(
    subscribeAccountRecent,
    getAccountRecent,
    getServerAccountRecent,
  );
  const session = useFavorites();

  // loadAccountRecent is idempotent per sign-in, so re-running it whenever
  // the session snapshot changes is cheap and catches a switch of account.
  useEffect(() => {
    if (session.ready && session.signedIn) loadAccountRecent();
  }, [session]);

  const withAccount = session.signedIn && account.status === "ready";
  const entries = useMemo(
    () => (withAccount ? mergeRecent(local, account.entries, MAX_RECENT) : local),
    [withAccount, local, account.entries],
  );

  return {
    entries,
    loading:
      !session.ready ||
      (session.signedIn && (account.status === "idle" || account.status === "loading")),
    signedIn: session.signedIn,
    clear: clearRecent,
  };
}

/**
 * Card rows for these ids, fetched in batches of 50 and cached for the page.
 * Returns one entry per id, in order.
 */
export function useCatalogCards(
  ids: readonly string[],
): { id: string; entry: CardEntry }[] {
  // Subscribing re-renders this component whenever any card arrives.
  useSyncExternalStore(subscribeCards, getCardsVersion, () => 0);
  const key = ids.join(",");
  useEffect(() => {
    if (key) requestCards(key.split(","));
  }, [key]);
  return ids.map((id) => ({ id, entry: getCard(id) }));
}

/** Ask again for cards whose last fetch failed. */
export function retryCatalogCards(ids: readonly string[]): void {
  requestCards(ids, true);
}
