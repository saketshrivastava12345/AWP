import type { MarketGeography, MarketPrice } from "@/types/domain";
import {
  PRICE_TYPE_LABELS,
  PRICE_TYPE_NOTES,
  STALE_AFTER_DAYS,
  daysSince,
  isOnRoadType,
  primaryPrice,
  scopeOf,
  type MarketSelection,
  type PriceBreakdown,
  type PriceScope,
  type ResolvedPrice,
} from "./engine";

/**
 * Wording for the pricing UI.
 *
 * Every sentence that states where a figure came from, what kind of figure it
 * is, or why one is missing is built here, so the rules are tested once and
 * the components only lay the words out. Pure and client-safe.
 */

type MarketIds = Pick<MarketSelection, "countryId" | "regionId" | "cityId">;

type MarketNames = { country: string | null; region: string | null; city: string | null };

/** Names for a country/region/city triple; null where the geography lacks it. */
export function marketNames(geo: MarketGeography, ids: MarketIds): MarketNames {
  const country = geo.countries.find((entry) => entry.id === ids.countryId) ?? null;
  const region = country?.regions.find((entry) => entry.id === ids.regionId) ?? null;
  const city = region?.cities.find((entry) => entry.id === ids.cityId) ?? null;
  return {
    country: country?.name ?? null,
    region: region?.name ?? null,
    city: city?.name ?? null,
  };
}

export function idsOfPrice(
  price: Pick<MarketPrice, "country_id" | "region_id" | "city_id">,
): MarketIds {
  return {
    countryId: price.country_id,
    regionId: price.region_id,
    cityId: price.city_id,
  };
}

/** "Mumbai, Maharashtra, India": most specific first. */
export function marketLabel(geo: MarketGeography, ids: MarketIds): string {
  const names = marketNames(geo, ids);
  const parts = [names.city, names.region, names.country].filter((part): part is string =>
    Boolean(part),
  );
  return parts.length > 0 ? parts.join(", ") : "Unlisted market";
}

/**
 * The one place a price row applies to, in a few words: "Mumbai",
 * "Maharashtra", or "India (national)".
 */
export function scopeName(
  geo: MarketGeography,
  price: Pick<MarketPrice, "country_id" | "region_id" | "city_id">,
): string {
  const names = marketNames(geo, idsOfPrice(price));
  switch (scopeOf(price)) {
    case "city":
      return names.city ?? "City price";
    case "region":
      return names.region ?? "State price";
    case "country":
      return names.country ? `${names.country} (national)` : "National price";
  }
}

const SELECTION_SCOPE = (selection: MarketSelection): PriceScope =>
  selection.cityId ? "city" : selection.regionId ? "region" : "country";

/**
 * The plain-language note shown when the applicable price is less specific
 * than the market chosen: "No Mumbai-specific price recorded — showing the
 * Maharashtra price." Null when the price is exactly for the chosen market.
 */
export function fallbackNotice(
  geo: MarketGeography,
  selection: MarketSelection,
  applied: Pick<ResolvedPrice, "exact" | "scope">,
): string | null {
  if (applied.exact) return null;
  const chosen = marketNames(geo, selection);
  const wanted = SELECTION_SCOPE(selection);
  const place = wanted === "city" ? chosen.city : chosen.region;
  const subject = place
    ? `No ${place}-specific price recorded`
    : "No local price recorded";

  if (applied.scope === "region") {
    return `${subject} — showing the ${chosen.region ?? "state"} price.`;
  }
  return `${subject} — showing the national price for ${chosen.country ?? "this country"}.`;
}

export type HeadlineKind = "published" | "calculated" | "listed";

export type Headline = {
  amount: number;
  currency: string;
  /** "On-road price", "Calculated on-road", "Ex-showroom", ... */
  label: string;
  kind: HeadlineKind;
  /** One line on what this figure is. */
  note: string;
};

/**
 * The figure the section leads with: the on-road total when there is one
 * (published, or else AURIX's labelled sum), otherwise the listed price.
 */
export function headlineFigure(breakdown: PriceBreakdown): Headline | null {
  const { total, listed, currency } = breakdown;
  if (total?.kind === "published") {
    return {
      amount: total.amount,
      currency,
      label: PRICE_TYPE_LABELS[total.type],
      kind: "published",
      note: PRICE_TYPE_NOTES[total.type],
    };
  }
  if (total?.kind === "calculated") {
    return {
      amount: total.amount,
      currency,
      label: PRICE_TYPE_LABELS.calculated,
      kind: "calculated",
      note: "Sum of the published components, added up by AURIX. Not a quotation.",
    };
  }
  if (listed) {
    return {
      amount: listed.amount,
      currency,
      label: PRICE_TYPE_LABELS[listed.type],
      kind: "listed",
      note: PRICE_TYPE_NOTES[listed.type],
    };
  }
  return null;
}

/** The label and qualifier on the breakdown's total line. */
export function totalCaption(total: NonNullable<PriceBreakdown["total"]>): {
  label: string;
  detail: string;
} {
  if (total.kind === "calculated") {
    return {
      label: PRICE_TYPE_LABELS.calculated,
      detail: "Sum of the published components, not a quotation",
    };
  }
  return {
    label: PRICE_TYPE_LABELS[total.type],
    detail: "Published by source",
  };
}

/** "A", "A and B", "A, B and C". */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Why the breakdown has no total, naming what is missing. */
export function missingTotalMessage(missing: readonly string[]): string {
  if (missing.length === 0) return "No on-road total was published for this market.";
  const verb = missing.length === 1 ? "is" : "are";
  return `No on-road total: ${joinList(missing)} ${verb} not recorded for this market, so AURIX does not add one up.`;
}

export type Freshness = {
  days: number;
  stale: boolean;
  /** "today", "yesterday", "12 days ago". */
  relative: string;
};

/**
 * How long ago a price was checked. `today` is "YYYY-MM-DD" or null when it is
 * not known yet (during server rendering), in which case nothing relative is
 * claimed.
 */
export function freshness(lastVerified: string, today: string | null): Freshness | null {
  if (!today) return null;
  const days = daysSince(lastVerified, new Date(`${today}T12:00:00Z`));
  const relative = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return { days, stale: days > STALE_AFTER_DAYS, relative };
}

/** Today's date in UTC as "YYYY-MM-DD", the same calendar the prices use. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type PricedMarket = {
  key: string;
  selection: MarketSelection;
  label: string;
  scope: PriceScope;
  /** The published figure recorded there, for the quick-select list. */
  figure: { amount: number; currency: string; label: string } | null;
};

const toNumber = (value: number | string | null): number | null => {
  if (value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/**
 * The figure a row's own type names: the on-road total for on-road types,
 * the listed price otherwise. (A listed row may also carry a total; showing
 * that under an "Ex-showroom" label would misstate it.)
 */
export function publishedFigure(
  price: Pick<
    MarketPrice,
    "price_type" | "on_road_price" | "ex_showroom_price" | "currency"
  >,
): { amount: number; currency: string; label: string } | null {
  const amount = isOnRoadType(price.price_type)
    ? toNumber(price.on_road_price)
    : toNumber(price.ex_showroom_price);
  return amount === null
    ? null
    : { amount, currency: price.currency, label: PRICE_TYPE_LABELS[price.price_type] };
}

/**
 * Every market with at least one in-force price, in country → state → city
 * order, each with the figure recorded exactly there. Drives the "prices are
 * recorded for" quick-select buttons.
 */
export function pricedMarkets(
  geo: MarketGeography,
  current: readonly MarketPrice[],
): PricedMarket[] {
  const byScope = new Map<string, MarketPrice[]>();
  for (const price of current) {
    const key = [price.country_id, price.region_id ?? "", price.city_id ?? ""].join("|");
    const list = byScope.get(key);
    if (list) list.push(price);
    else byScope.set(key, [price]);
  }

  const entries = [...byScope.entries()].map(([key, rows]) => {
    const first = rows[0]!;
    const selection = idsOfPrice(first);
    const primary = primaryPrice(
      rows.map((price) => ({ price, scope: scopeOf(price), exact: true })),
    );
    const names = marketNames(geo, selection);
    const market: PricedMarket = {
      key,
      selection,
      label: marketLabel(geo, selection),
      scope: scopeOf(first),
      figure: primary ? publishedFigure(primary.price) : null,
    };
    return { market, sort: [names.country ?? "", names.region ?? "", names.city ?? ""] };
  });

  entries.sort((a, b) => {
    for (let i = 0; i < 3; i += 1) {
      const order = (a.sort[i] ?? "").localeCompare(b.sort[i] ?? "");
      if (order !== 0) return order;
    }
    return 0;
  });

  return entries.map((entry) => entry.market);
}

/**
 * Splits select options into those with recorded prices and the rest, each
 * keeping its original order, so the selector can list priced markets first.
 */
export function partitionPriced<T extends { id: string }>(
  items: readonly T[],
  pricedIds: ReadonlySet<string>,
): { priced: T[]; other: T[] } {
  const priced: T[] = [];
  const other: T[] = [];
  for (const item of items) (pricedIds.has(item.id) ? priced : other).push(item);
  return { priced, other };
}

/** A URL that is safe to put in an href: http(s) only. */
export function isHttpUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
