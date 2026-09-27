import type { MarketGeography, MarketPrice } from "@/types/domain";
import type { MarketSelection } from "./engine";
import { EMPTY_SELECTION, defaultSelection, selectionFromPath } from "./selection";

/**
 * Where the market selector's choice comes from, and where it is written back.
 *
 * Pure and client-safe, so the priority order is unit-tested rather than
 * buried in a hook:
 *
 *   1. `?market=country/state/city` in the URL — a shared link wins;
 *   2. the visitor's last choice, remembered in localStorage;
 *   3. the market of the most recently verified price for this car;
 *   4. nothing selected.
 *
 * `?market=` present but empty means the visitor cleared the selector on this
 * page. That is a choice too, so it is honoured instead of falling through to
 * a default that would immediately re-select a market for them.
 */

export const MARKET_PARAM = "market";
export const MARKET_STORAGE_KEY = "aurix-market";
/** Dispatched on window after the selection is written, for same-tab readers. */
export const MARKET_CHANGE_EVENT = "aurix:market-change";

export type SelectionSource = "url" | "storage" | "default" | "none";

/** Set on the pricing root while a visitor's own market is still to be applied. */
export const MARKET_PENDING_ATTRIBUTE = "data-market-pending";
/** Longest the price panels stay hidden if hydration is slow or fails. */
export const MARKET_PENDING_MAX_MS = 2500;

/**
 * Inline script rendered at the top of the pricing section.
 *
 * The car page is prerendered, so its HTML carries the DEFAULT market. A
 * visitor arriving with `?market=` or a remembered market would otherwise see
 * that default's figure until hydration swaps in their own. This runs while
 * the HTML is parsed and, only in that case, marks the section so its panels
 * are hidden (not removed) until the client has applied the right market.
 * A timer lifts the mark regardless, so a failed script bundle can never
 * leave the prices invisible, and without JavaScript nothing is hidden.
 */
export const MARKET_PENDING_SCRIPT = `(function(s){try{var r=s&&s.parentElement;if(!r)return;var k=null;try{k=localStorage.getItem(${JSON.stringify(
  MARKET_STORAGE_KEY,
)})}catch(e){}if(new URLSearchParams(location.search).get(${JSON.stringify(
  MARKET_PARAM,
)})!==null||k){r.setAttribute(${JSON.stringify(
  MARKET_PENDING_ATTRIBUTE,
)},"");setTimeout(function(){r.removeAttribute(${JSON.stringify(
  MARKET_PENDING_ATTRIBUTE,
)})},${MARKET_PENDING_MAX_MS})}}catch(e){}})(document.currentScript)`;

export type ResolvedSelection = {
  selection: MarketSelection;
  source: SelectionSource;
};

/**
 * The raw `market` parameter from a query string: `null` when absent, `""`
 * when present but empty (an explicit "no market").
 */
export function readMarketParam(search: string): string | null {
  const value = new URLSearchParams(search).get(MARKET_PARAM);
  return value === null ? null : value.trim();
}

/**
 * A query string with `market` replaced, every other parameter kept in order.
 *
 * The path's slashes are left unescaped (they are legal in a query string), so
 * the address bar shows `?market=india/maharashtra/mumbai` rather than
 * `india%2Fmaharashtra%2Fmumbai`. Pass `null` to drop the parameter and `""`
 * to record an explicit "no market". Returns "" or a string starting with "?".
 */
export function withMarketParam(search: string, path: string | null): string {
  const params = new URLSearchParams(search);
  params.delete(MARKET_PARAM);
  const rest = params.toString();
  if (path === null) return rest ? `?${rest}` : "";
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const market = `${MARKET_PARAM}=${encoded}`;
  return `?${rest ? `${rest}&` : ""}${market}`;
}

/** Applies the priority order above. */
export function resolveMarketSelection({
  geography,
  current,
  urlPath,
  storedPath,
}: {
  geography: MarketGeography;
  current: readonly MarketPrice[];
  /** From readMarketParam: null = absent, "" = explicitly cleared. */
  urlPath: string | null;
  storedPath: string | null;
}): ResolvedSelection {
  if (urlPath !== null) {
    if (urlPath === "") return { selection: EMPTY_SELECTION, source: "url" };
    const fromUrl = selectionFromPath(geography, urlPath);
    // An unknown country in a stale link falls through rather than blanking
    // the section.
    if (fromUrl.countryId) return { selection: fromUrl, source: "url" };
  }

  if (storedPath) {
    const fromStorage = selectionFromPath(geography, storedPath);
    if (fromStorage.countryId) return { selection: fromStorage, source: "storage" };
  }

  const fallback = defaultSelection(current);
  if (fallback.countryId) return { selection: fallback, source: "default" };

  return { selection: EMPTY_SELECTION, source: "none" };
}

/** True when two selections point at the same market. */
export function sameSelection(a: MarketSelection, b: MarketSelection): boolean {
  return (
    a.countryId === b.countryId && a.regionId === b.regionId && a.cityId === b.cityId
  );
}
