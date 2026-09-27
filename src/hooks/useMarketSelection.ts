"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { MarketGeography, MarketPrice } from "@/types/domain";
import type { MarketSelection } from "@/lib/pricing/engine";
import { selectionToPath } from "@/lib/pricing/selection";
import {
  MARKET_CHANGE_EVENT,
  MARKET_STORAGE_KEY,
  readMarketParam,
  resolveMarketSelection,
  withMarketParam,
  type SelectionSource,
} from "@/lib/pricing/market-url";

/**
 * The visitor's chosen market for the pricing section.
 *
 * Reads, in priority order: `?market=` in the URL, the last choice kept in
 * localStorage, the market of the most recently verified price, nothing (the
 * order itself lives in lib/pricing/market-url.ts and is unit-tested).
 *
 * Deliberately NOT useSearchParams: the car page is statically prerendered,
 * and reading search params there would opt the whole route out of its
 * static shell. The URL and localStorage are external mutable sources, so
 * they are read through useSyncExternalStore. During prerender and hydration
 * both read as "absent", so the server renders the default market and the
 * client moves to the visitor's own choice on the next render, with no
 * hydration mismatch.
 *
 * A choice is written back with history.replaceState (no navigation, no
 * history entry, no scroll jump) and to localStorage, then announced with a
 * window event so this hook re-reads it: replaceState does not fire popstate.
 */

function subscribe(onChange: () => void): () => void {
  window.addEventListener("popstate", onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener(MARKET_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(MARKET_CHANGE_EVENT, onChange);
  };
}

function readUrlMarket(): string | null {
  return readMarketParam(window.location.search);
}

function readStoredMarket(): string | null {
  // Storage can throw (blocked site data, some private modes): treat as empty.
  try {
    return window.localStorage.getItem(MARKET_STORAGE_KEY);
  } catch {
    return null;
  }
}

const readNothing = () => null;
const noSubscription = () => () => {};
const onClient = () => true;
const onServer = () => false;

function writeStoredMarket(path: string | null): void {
  try {
    if (path) window.localStorage.setItem(MARKET_STORAGE_KEY, path);
    else window.localStorage.removeItem(MARKET_STORAGE_KEY);
  } catch {
    // Remembering the market is a convenience; the URL still carries it.
  }
}

export type MarketSelectionState = {
  selection: MarketSelection;
  /** Where the current selection came from. */
  source: SelectionSource;
  /** Records a choice in the URL and localStorage. */
  select: (next: MarketSelection) => void;
  /**
   * False while prerendering and hydrating (the selection is the server's
   * default), true once the URL and storage have been read in the browser.
   */
  ready: boolean;
};

export function useMarketSelection(
  geography: MarketGeography,
  current: readonly MarketPrice[],
): MarketSelectionState {
  const urlPath = useSyncExternalStore(subscribe, readUrlMarket, readNothing);
  const storedPath = useSyncExternalStore(subscribe, readStoredMarket, readNothing);
  const ready = useSyncExternalStore(noSubscription, onClient, onServer);

  // A client-side navigation (Next's pushState) changes the URL in the same
  // commit that delivers new props, after this component has read the old
  // URL, and fires no event. New props mean a navigation may have happened,
  // so re-check the stores once the commit is done; if nothing changed, this
  // costs a string comparison.
  useEffect(() => {
    window.dispatchEvent(new Event(MARKET_CHANGE_EVENT));
  }, [geography, current]);

  const resolved = useMemo(
    () => resolveMarketSelection({ geography, current, urlPath, storedPath }),
    [geography, current, urlPath, storedPath],
  );

  const select = useCallback(
    (next: MarketSelection) => {
      const path = selectionToPath(geography, next);
      const { pathname, search, hash } = window.location;
      // An explicit "no market" is kept in the URL as `?market=` so a reload
      // shows what the visitor chose rather than a default.
      const nextSearch = withMarketParam(search, path ?? "");
      // Pass the router's own state through, so Next's history entry and
      // scroll restoration are untouched.
      window.history.replaceState(
        window.history.state,
        "",
        `${pathname}${nextSearch}${hash}`,
      );
      writeStoredMarket(path);
      window.dispatchEvent(new Event(MARKET_CHANGE_EVENT));
    },
    [geography],
  );

  return { selection: resolved.selection, source: resolved.source, select, ready };
}
