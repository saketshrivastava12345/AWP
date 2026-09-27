import type { MarketPrice, PriceType } from "@/types/domain";

/**
 * The pricing engine: which recorded price applies to a chosen market, and
 * how its parts add up.
 *
 * Pure and client-safe (no server imports), so the market selector can run it
 * in the browser against rows the server already fetched, and so it is
 * unit-tested.
 *
 * Honesty rules encoded here:
 *   - A figure is only ever one a source published. AURIX never estimates a
 *     price; the one thing it derives is a SUM of published components, and
 *     that sum is always labelled "calculated", never "on-road price".
 *   - A sum is only offered when the components that dominate an on-road
 *     price (road tax / RTO and insurance) are both recorded. Adding up an
 *     incomplete set would understate the price while looking authoritative.
 *   - Nothing is converted between currencies.
 */

export type MarketSelection = {
  countryId: string | null;
  regionId: string | null;
  cityId: string | null;
};

/** How specific a price row is. */
export type PriceScope = "city" | "region" | "country";

export const PRICE_TYPE_LABELS: Record<PriceType | "calculated", string> = {
  manufacturer_list: "Manufacturer list price",
  dealer_list: "Dealer list price",
  ex_showroom: "Ex-showroom",
  on_road: "On-road price",
  estimated_on_road: "Estimated on-road",
  calculated: "Calculated on-road",
};

/** One-line explanation of each figure type, for tooltips and footnotes. */
export const PRICE_TYPE_NOTES: Record<PriceType | "calculated", string> = {
  manufacturer_list:
    "The price the manufacturer lists, before registration, taxes and insurance.",
  dealer_list: "A price listed by an authorised dealer, before on-road charges.",
  ex_showroom:
    "The vehicle price at the showroom, before registration, road tax and insurance.",
  on_road: "The total on-road price as published by the source.",
  estimated_on_road: "An on-road estimate published by the source, not a quotation.",
  calculated:
    "The sum of the published components above, added up by AURIX. Not a quotation.",
};

/** Listed (pre on-road) figures, in the order they are preferred. */
const LISTED_TYPES: readonly PriceType[] = [
  "ex_showroom",
  "manufacturer_list",
  "dealer_list",
];
/** Figures that already are an on-road total. */
const ON_ROAD_TYPES: readonly PriceType[] = ["on_road", "estimated_on_road"];

export function isOnRoadType(type: PriceType): boolean {
  return ON_ROAD_TYPES.includes(type);
}

export function scopeOf(price: Pick<MarketPrice, "region_id" | "city_id">): PriceScope {
  if (price.city_id) return "city";
  if (price.region_id) return "region";
  return "country";
}

const SCOPE_RANK: Record<PriceScope, number> = { city: 2, region: 1, country: 0 };

export type ResolvedPrice = {
  price: MarketPrice;
  scope: PriceScope;
  /** True when the row is as specific as the selection (no fallback used). */
  exact: boolean;
};

/**
 * The in-force prices that apply to a selection, most specific first: a
 * city's own price, then its state's, then the national one. A price for a
 * different city or state never applies.
 */
export function pricesForSelection(
  current: readonly MarketPrice[],
  selection: MarketSelection,
): ResolvedPrice[] {
  if (!selection.countryId) return [];
  const wanted: PriceScope = selection.cityId
    ? "city"
    : selection.regionId
      ? "region"
      : "country";

  return current
    .filter((price) => {
      if (price.country_id !== selection.countryId) return false;
      if (price.region_id && price.region_id !== selection.regionId) return false;
      if (price.city_id && price.city_id !== selection.cityId) return false;
      return true;
    })
    .map((price) => {
      const scope = scopeOf(price);
      return { price, scope, exact: scope === wanted };
    })
    .sort((a, b) => {
      const byScope = SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope];
      if (byScope !== 0) return byScope;
      return typeOrder(a.price.price_type) - typeOrder(b.price.price_type);
    });
}

function typeOrder(type: PriceType): number {
  const onRoad = ON_ROAD_TYPES.indexOf(type);
  if (onRoad !== -1) return onRoad;
  return ON_ROAD_TYPES.length + LISTED_TYPES.indexOf(type);
}

/**
 * The row to build the breakdown from: the most specific row carrying a
 * published on-road total, otherwise the most specific listed price.
 */
export function primaryPrice(resolved: readonly ResolvedPrice[]): ResolvedPrice | null {
  if (resolved.length === 0) return null;
  const best = SCOPE_RANK[resolved[0]!.scope];
  const sameScope = resolved.filter((entry) => SCOPE_RANK[entry.scope] === best);
  return (
    sameScope.find((entry) => isOnRoadType(entry.price.price_type)) ??
    sameScope.find((entry) => LISTED_TYPES.includes(entry.price.price_type)) ??
    resolved[0] ??
    null
  );
}

export type BreakdownKey =
  | "rto_tax"
  | "registration_fee"
  | "insurance_estimate"
  | "handling_charges"
  | "fastag"
  | "other_charges";

export const COMPONENT_LABELS: Record<BreakdownKey, string> = {
  rto_tax: "RTO / road tax",
  registration_fee: "Registration",
  insurance_estimate: "Insurance (estimate)",
  handling_charges: "Handling charges",
  fastag: "FASTag",
  other_charges: "Other charges",
};

const COMPONENT_KEYS = Object.keys(COMPONENT_LABELS) as BreakdownKey[];

/** Components a calculated total cannot honestly be offered without. */
const REQUIRED_FOR_SUM: readonly BreakdownKey[] = ["rto_tax", "insurance_estimate"];

export type PriceBreakdown = {
  currency: string;
  /** The vehicle's listed price before on-road charges, when published. */
  listed: { amount: number; type: PriceType } | null;
  components: { key: BreakdownKey; label: string; amount: number }[];
  total:
    | { amount: number; kind: "published"; type: PriceType }
    | { amount: number; kind: "calculated"; type: "calculated" }
    | null;
  /** Why no total is shown, when one is not. */
  missingForTotal: string[];
};

const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export function buildBreakdown(price: MarketPrice): PriceBreakdown {
  const listedAmount = toNumber(price.ex_showroom_price);
  const listed =
    listedAmount !== null
      ? {
          amount: listedAmount,
          // An on-road row's pre-tax figure is the ex-showroom price.
          type: isOnRoadType(price.price_type)
            ? ("ex_showroom" as const)
            : price.price_type,
        }
      : null;

  const components = COMPONENT_KEYS.flatMap((key) => {
    const amount = toNumber(price[key]);
    return amount === null ? [] : [{ key, label: COMPONENT_LABELS[key], amount }];
  });

  const published = toNumber(price.on_road_price);
  if (published !== null) {
    return {
      currency: price.currency,
      listed,
      components,
      total: { amount: published, kind: "published", type: price.price_type },
      missingForTotal: [],
    };
  }

  const missing = REQUIRED_FOR_SUM.filter((key) => toNumber(price[key]) === null);
  if (listed === null || missing.length > 0 || components.length === 0) {
    return {
      currency: price.currency,
      listed,
      components,
      total: null,
      missingForTotal:
        listed === null
          ? ["Ex-showroom price"]
          : missing.map((key) => COMPONENT_LABELS[key]),
    };
  }

  const sum = components.reduce((acc, line) => acc + line.amount, listed.amount);
  return {
    currency: price.currency,
    listed,
    components,
    // Rounded to whole units: the inputs are whole-unit figures and a sum
    // with float noise would suggest false precision.
    total: { amount: Math.round(sum), kind: "calculated", type: "calculated" },
    missingForTotal: [],
  };
}

export type HistoryPoint = {
  date: string;
  amount: number;
  currency: string;
  id: string;
};

/**
 * The price over time for one market scope and figure type: every recorded
 * row with the same country/region/city, type and currency, oldest first.
 * The on-road total is used where the row publishes one.
 */
export function priceHistory(
  history: readonly MarketPrice[],
  like: Pick<
    MarketPrice,
    "country_id" | "region_id" | "city_id" | "price_type" | "currency"
  >,
): HistoryPoint[] {
  const points = history
    .filter(
      (row) =>
        row.country_id === like.country_id &&
        (row.region_id ?? null) === (like.region_id ?? null) &&
        (row.city_id ?? null) === (like.city_id ?? null) &&
        row.price_type === like.price_type &&
        row.currency === like.currency,
    )
    .flatMap((row) => {
      const amount = toNumber(row.on_road_price) ?? toNumber(row.ex_showroom_price);
      return amount === null
        ? []
        : [{ date: row.effective_from, amount, currency: row.currency, id: row.id }];
    });
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Whole days between a verification date (YYYY-MM-DD) and `today`. */
export function daysSince(date: string, today: Date = new Date()): number {
  const then = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
  );
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

/** Prices checked longer ago than this are flagged as possibly out of date. */
export const STALE_AFTER_DAYS = 180;
