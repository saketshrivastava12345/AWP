import type {
  Aspiration,
  BodyType,
  DriveType,
  EngineLayout,
  FuelType,
  TransmissionType,
  VehicleStatus,
} from "@/types/domain";

/**
 * Filter and sort definitions shared between server queries and client UI.
 *
 * Deliberately NOT in `lib/queries/cars.ts`: that module imports `server-only`,
 * and a client component reaching for `isSortKey` would drag the whole Supabase
 * server client into the browser bundle — which Next correctly refuses to
 * build. Types and pure predicates live here; anything that touches the
 * database stays behind the server-only boundary.
 */

export const DEFAULT_PAGE_SIZE = 12;

/** Page sizes offered on /cars. Anything else in the URL falls back to the default. */
export const PAGE_SIZES = [12, 24, 48] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

export function isPageSize(value: number | undefined): value is PageSize {
  return PAGE_SIZES.some((size) => size === value);
}

/** Catalogue-view columns a sort can order by. */
export type SortColumn =
  | "power_hp"
  | "top_speed_kmh"
  | "zero_to_100_s"
  | "listed_price"
  | "listed_price_currency"
  | "year_start"
  | "manufacturer_name"
  | "model_name"
  | "variant_name"
  | "range_km"
  | "range_standard";

export type SortOrder = { column: SortColumn; ascending: boolean };

type SortDefinition = {
  /** Short label for the segmented control. */
  label: string;
  /** What the order means, for the select and screen readers. Short: it has to fit a phone. */
  description: string;
  orders: readonly SortOrder[];
};

export const SORT_OPTIONS = {
  "power-desc": {
    label: "Power",
    description: "Most powerful",
    orders: [{ column: "power_hp", ascending: false }],
  },
  "speed-desc": {
    label: "Top speed",
    description: "Fastest top speed",
    orders: [{ column: "top_speed_kmh", ascending: false }],
  },
  "accel-asc": {
    label: "0–100",
    description: "Quickest 0–100 km/h",
    orders: [{ column: "zero_to_100_s", ascending: true }],
  },
  "price-asc": {
    label: "Price",
    description: "Lowest price",
    orders: [{ column: "listed_price", ascending: true }],
  },
  "year-desc": {
    label: "Newest",
    description: "Newest",
    orders: [{ column: "year_start", ascending: false }],
  },
  "name-asc": {
    label: "A–Z",
    description: "Make A–Z",
    orders: [
      { column: "manufacturer_name", ascending: true },
      { column: "model_name", ascending: true },
      { column: "variant_name", ascending: true },
    ],
  },
  "range-desc": {
    label: "Range",
    description: "Longest range",
    // Grouped by test cycle first (in the enum's declared order: WLTP, EPA,
    // ARAI, NEDC, CLTC), longest within each: an ARAI figure is not ranked
    // against a WLTP one, the same rule the compare page applies.
    orders: [
      { column: "range_standard", ascending: true },
      { column: "range_km", ascending: false },
    ],
  },
} as const satisfies Record<string, SortDefinition>;

export type SortKey = keyof typeof SORT_OPTIONS;
export const DEFAULT_SORT: SortKey = "power-desc";
export const SORT_KEYS = Object.keys(SORT_OPTIONS) as SortKey[];

export function isSortKey(value: string | undefined): value is SortKey {
  return value !== undefined && Object.hasOwn(SORT_OPTIONS, value);
}

export type CarFilters = {
  country?: string[];
  manufacturer?: string[];
  category?: string[];
  body?: BodyType[];
  fuel?: FuelType[];
  transmission?: TransmissionType[];
  drive?: DriveType[];
  engineLayout?: EngineLayout[];
  cylinders?: number[];
  aspiration?: Aspiration[];
  /** The RECORDED lifecycle status only — never the "discontinued" the UI derives from years. */
  status?: VehicleStatus[];
  powerMin?: number;
  powerMax?: number;
  speedMin?: number;
  speedMax?: number;
  /** Year range applies to the year a variant was introduced (year_start). */
  yearMin?: number;
  yearMax?: number;
  /** Minimum published electric range, in km. */
  rangeMin?: number;
  /**
   * Prices are never compared across currencies, so a price filter always
   * names one. Without a currency, priceMin/priceMax are ignored.
   */
  priceCurrency?: string;
  priceMin?: number;
  priceMax?: number;
  /** Free text, matched against the maintained tsvector. */
  text?: string;
};

/**
 * The ORDER BY for a sort, before the stable tiebreaker.
 *
 * Price is only comparable within one currency. With a currency filter the
 * amounts are all in that currency; without one, rows are grouped by currency
 * first and ordered by amount inside each group — never interleaved as if a
 * rupee and a dollar were the same unit.
 */
export function sortOrders(sort: SortKey, filters: CarFilters): SortOrder[] {
  if (sort === "price-asc" && !filters.priceCurrency) {
    return [
      { column: "listed_price_currency", ascending: true },
      { column: "listed_price", ascending: true },
    ];
  }
  return [...SORT_OPTIONS[sort].orders];
}

/** True when the range sort is active: ranges are grouped by test cycle. */
export function isGroupedRangeSort(sort: SortKey): boolean {
  return sort === "range-desc";
}

/** True when the price sort is active without a single currency to compare in. */
export function isGroupedPriceSort(sort: SortKey, filters: CarFilters): boolean {
  return sort === "price-asc" && !filters.priceCurrency;
}
