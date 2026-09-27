import type {
  Aspiration,
  BodyType,
  CatalogCar,
  DriveType,
  EngineLayout,
  FuelType,
  TransmissionType,
  VehicleStatus,
} from "@/types/domain";
import type { CarFilters } from "@/lib/car-query";

/**
 * Facets for the catalogue filter rail: which values exist, how many cars
 * each would show, and the bounds of every numeric filter.
 *
 * Everything is derived from the catalogue rows themselves, so a filter is
 * never offered for a value no car has. Counts follow the usual faceted-search
 * rule: an option's count applies every OTHER active filter, so ticking a
 * second country shows exactly how many cars it adds.
 *
 * Pure and client-safe (type-only imports). The server fetches the facet
 * columns in one query and this module does the counting in memory — a few
 * thousand narrow rows is trivial, and it avoids one aggregate query per facet.
 */

/** Columns the facet computation reads. One narrow select of the catalogue view. */
export const FACET_COLUMNS = [
  "country_slug",
  "country_name",
  "manufacturer_slug",
  "manufacturer_name",
  "category_slug",
  "category_name",
  "body_type",
  "fuel_type",
  "transmission_type",
  "drive_type",
  "engine_layout",
  "engine_cylinders",
  "aspiration",
  "status",
  "power_hp",
  "top_speed_kmh",
  "year_start",
  "range_km",
  "listed_price",
  "listed_price_currency",
] as const satisfies readonly (keyof CatalogCar)[];

export type FacetColumn = (typeof FACET_COLUMNS)[number];
export type FacetRow = Pick<CatalogCar, FacetColumn>;

// ---------------------------------------------------------------------------
// Labels. Typed as Record<Enum, string> so a value added to a database enum
// fails the type check here until it is given a label — and the URL parser
// derives its allow-lists from these keys, so it can never drift either.
// ---------------------------------------------------------------------------

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  phev: "Plug-in hybrid",
  electric: "Electric",
  hydrogen: "Hydrogen",
};

export const DRIVE_LABELS: Record<DriveType, string> = {
  fwd: "Front-wheel drive",
  rwd: "Rear-wheel drive",
  awd: "All-wheel drive",
  "4wd": "Four-wheel drive",
};

export const BODY_LABELS: Record<BodyType, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  coupe: "Coupé",
  convertible: "Convertible",
  roadster: "Roadster",
  suv: "SUV",
  wagon: "Wagon",
  mpv: "MPV",
  pickup: "Pickup",
  off_road: "Off-road",
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manual: "Manual",
  automatic: "Automatic",
  dct: "Dual-clutch",
  amt: "AMT",
  cvt: "CVT",
  single_speed: "Single-speed",
};

export const LAYOUT_LABELS: Record<EngineLayout, string> = {
  inline: "Inline",
  vee: "V",
  flat: "Flat (boxer)",
  w: "W",
  rotary: "Rotary",
};

export const ASPIRATION_LABELS: Record<Aspiration, string> = {
  naturally_aspirated: "Naturally aspirated",
  turbocharged: "Turbocharged",
  twin_turbo: "Twin-turbo",
  supercharged: "Supercharged",
  twincharged: "Twincharged",
};

/** Recorded lifecycle status. The UI's derived "Discontinued" is not one of these. */
export const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "On sale",
  upcoming: "Upcoming",
  discontinued: "Discontinued",
  concept: "Concept",
  limited: "Limited run",
  sold_out: "Sold out",
};

// ---------------------------------------------------------------------------
// Facet definitions
// ---------------------------------------------------------------------------

export type ListFacetKey =
  | "country"
  | "manufacturer"
  | "category"
  | "body"
  | "fuel"
  | "transmission"
  | "drive"
  | "engineLayout"
  | "cylinders"
  | "aspiration"
  | "status";

export type RangeFacetKey = "power" | "speed" | "year" | "range";
export type FacetKey = ListFacetKey | RangeFacetKey | "price";

/** CarFilters keys that hold a single number. */
export type NumericFilterKey =
  | "powerMin"
  | "powerMax"
  | "speedMin"
  | "speedMax"
  | "yearMin"
  | "yearMax"
  | "rangeMin"
  | "priceMin"
  | "priceMax";

type ListFacetDefinition = {
  key: ListFacetKey;
  /** URL search param. */
  param: string;
  title: string;
  column: FacetColumn;
  /** Column holding the human name, for slug facets. */
  labelColumn?: FacetColumn;
  labels?: Readonly<Record<string, string>>;
  numeric?: boolean;
};

export const LIST_FACETS: readonly ListFacetDefinition[] = [
  {
    key: "country",
    param: "country",
    title: "Country",
    column: "country_slug",
    labelColumn: "country_name",
  },
  {
    key: "manufacturer",
    param: "manufacturer",
    title: "Manufacturer",
    column: "manufacturer_slug",
    labelColumn: "manufacturer_name",
  },
  {
    key: "category",
    param: "category",
    title: "Category",
    column: "category_slug",
    labelColumn: "category_name",
  },
  {
    key: "body",
    param: "body",
    title: "Body type",
    column: "body_type",
    labels: BODY_LABELS,
  },
  { key: "fuel", param: "fuel", title: "Fuel", column: "fuel_type", labels: FUEL_LABELS },
  {
    key: "transmission",
    param: "transmission",
    title: "Transmission",
    column: "transmission_type",
    labels: TRANSMISSION_LABELS,
  },
  {
    key: "drive",
    param: "drive",
    title: "Drivetrain",
    column: "drive_type",
    labels: DRIVE_LABELS,
  },
  {
    key: "engineLayout",
    param: "layout",
    title: "Engine layout",
    column: "engine_layout",
    labels: LAYOUT_LABELS,
  },
  {
    key: "cylinders",
    param: "cylinders",
    title: "Cylinders",
    column: "engine_cylinders",
    numeric: true,
  },
  {
    key: "aspiration",
    param: "aspiration",
    title: "Aspiration",
    column: "aspiration",
    labels: ASPIRATION_LABELS,
  },
  {
    key: "status",
    param: "status",
    title: "Status",
    column: "status",
    labels: STATUS_LABELS,
  },
];

type RangeFacetDefinition = {
  key: RangeFacetKey;
  title: string;
  /** Unit shown beside the inputs and in chips; empty for years. */
  unit: string;
  column: FacetColumn;
  minKey: NumericFilterKey;
  /** EV range is a minimum only: "at least 400 km". */
  maxKey: NumericFilterKey | null;
};

export const RANGE_FACETS: readonly RangeFacetDefinition[] = [
  {
    key: "power",
    title: "Power",
    unit: "hp",
    column: "power_hp",
    minKey: "powerMin",
    maxKey: "powerMax",
  },
  {
    key: "speed",
    title: "Top speed",
    unit: "km/h",
    column: "top_speed_kmh",
    minKey: "speedMin",
    maxKey: "speedMax",
  },
  {
    key: "range",
    title: "Electric range",
    unit: "km",
    column: "range_km",
    minKey: "rangeMin",
    maxKey: null,
  },
  {
    key: "year",
    title: "Year introduced",
    unit: "",
    column: "year_start",
    minKey: "yearMin",
    maxKey: "yearMax",
  },
];

// ---------------------------------------------------------------------------
// Output shapes (serialisable — they are passed to the client filter rail)
// ---------------------------------------------------------------------------

export type FacetOption = {
  value: string;
  label: string;
  /** Cars this option would show, given every other active filter. */
  count: number;
  selected: boolean;
};

export type ListFacet = {
  key: ListFacetKey;
  param: string;
  title: string;
  options: FacetOption[];
};

export type RangeFacet = {
  key: RangeFacetKey;
  title: string;
  unit: string;
  minParam: NumericFilterKey;
  maxParam: NumericFilterKey | null;
  /** Lowest and highest published figure among cars matching the other filters. */
  bounds: [number, number] | null;
  min: number | undefined;
  max: number | undefined;
};

export type PriceFacet = {
  /** Currencies that listed prices are recorded in. Never converted between. */
  currencies: FacetOption[];
  currency: string | undefined;
  /** Bounds within the selected currency only. */
  bounds: [number, number] | null;
  min: number | undefined;
  max: number | undefined;
};

export type FilterOptions = {
  lists: ListFacet[];
  ranges: RangeFacet[];
  price: PriceFacet | null;
  /** Cars matching every active filter. */
  total: number;
  /** Cars before any facet filter (after free-text search, if any). */
  universe: number;
};

export const EMPTY_FILTER_OPTIONS: FilterOptions = {
  lists: [],
  ranges: [],
  price: null,
  total: 0,
  universe: 0,
};

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** PostgREST may return numeric columns as numbers or numeric strings. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function listValues(
  filters: CarFilters,
  key: ListFacetKey,
): readonly (string | number)[] {
  return (filters[key] as readonly (string | number)[] | undefined) ?? [];
}

/**
 * Does a row satisfy the filters? Mirrors the SQL in `listCars` exactly —
 * including SQL's NULL semantics: a car with no published figure never
 * satisfies a range, and a NULL column is never IN a list.
 *
 * `except` skips one facet, which is how "count with every OTHER filter" works.
 * Free text is not evaluated here: the rows are already text-filtered by the
 * database, which owns the search document.
 */
export function rowMatches(
  row: FacetRow,
  filters: CarFilters,
  except?: FacetKey,
): boolean {
  for (const facet of LIST_FACETS) {
    if (facet.key === except) continue;
    const wanted = listValues(filters, facet.key);
    if (wanted.length === 0) continue;
    const value = row[facet.column];
    if (value === null || value === undefined) return false;
    const text = String(value);
    if (!wanted.some((entry) => String(entry) === text)) return false;
  }

  for (const facet of RANGE_FACETS) {
    if (facet.key === except) continue;
    const min = filters[facet.minKey];
    const max = facet.maxKey ? filters[facet.maxKey] : undefined;
    if (min === undefined && max === undefined) continue;
    const value = toNumber(row[facet.column]);
    if (value === null) return false;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
  }

  if (except !== "price" && filters.priceCurrency) {
    if (row.listed_price_currency !== filters.priceCurrency) return false;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const amount = toNumber(row.listed_price);
      if (amount === null) return false;
      if (filters.priceMin !== undefined && amount < filters.priceMin) return false;
      if (filters.priceMax !== undefined && amount > filters.priceMax) return false;
    }
  }

  return true;
}

/** Human label for a list-facet value when no row carries a name for it. */
export function fallbackLabel(key: ListFacetKey, value: string): string {
  const facet = LIST_FACETS.find((entry) => entry.key === key);
  const mapped = facet?.labels?.[value];
  if (mapped) return mapped;
  if (key === "cylinders") return `${value} cylinders`;
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function rowLabel(facet: ListFacetDefinition, row: FacetRow, value: string): string {
  if (facet.labelColumn) {
    const label = row[facet.labelColumn];
    if (typeof label === "string" && label.trim()) return label;
  }
  return fallbackLabel(facet.key, value);
}

function byCountThenLabel(numeric: boolean) {
  return (a: FacetOption, b: FacetOption): number => {
    // Options that would show something come first; the rest stay listed
    // (dimmed) so the facet does not pretend those values do not exist.
    const aEmpty = a.count === 0 ? 1 : 0;
    const bEmpty = b.count === 0 ? 1 : 0;
    if (aEmpty !== bEmpty) return aEmpty - bEmpty;
    if (numeric) return Number(a.value) - Number(b.value);
    return a.label.localeCompare(b.label);
  };
}

function bounds(values: number[]): [number, number] | null {
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

/**
 * Every facet, with counts that reflect the other active filters.
 *
 * - A list facet lists every value any car in the (text-matched) catalogue
 *   has. A value that would show nothing under the other filters is kept with
 *   a count of 0. A facet no car has a value for (status, today) is omitted.
 * - A range facet is bounded by the figures of the cars matching the other
 *   filters, and omitted when none of them publishes that figure — which is
 *   how electric range appears only when the result set contains an EV.
 * - Price lists the currencies prices are recorded in; bounds are only ever
 *   computed within the selected currency.
 *
 * A filter that is active is always kept, even with nothing to show, so it
 * can be seen and removed.
 */
export function computeFacets(
  rows: readonly FacetRow[],
  filters: CarFilters,
): FilterOptions {
  const lists: ListFacet[] = [];

  for (const facet of LIST_FACETS) {
    const universe = new Map<string, string>();
    for (const row of rows) {
      const value = row[facet.column];
      if (value === null || value === undefined || value === "") continue;
      const key = String(value);
      if (!universe.has(key)) universe.set(key, rowLabel(facet, row, key));
    }

    const selected = new Set(listValues(filters, facet.key).map(String));
    for (const value of selected) {
      if (!universe.has(value)) universe.set(value, fallbackLabel(facet.key, value));
    }
    if (universe.size === 0) continue;

    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = row[facet.column];
      if (value === null || value === undefined) continue;
      if (!rowMatches(row, filters, facet.key)) continue;
      const key = String(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    lists.push({
      key: facet.key,
      param: facet.param,
      title: facet.title,
      options: [...universe.entries()]
        .map(([value, label]) => ({
          value,
          label,
          count: counts.get(value) ?? 0,
          selected: selected.has(value),
        }))
        .sort(byCountThenLabel(Boolean(facet.numeric))),
    });
  }

  const ranges: RangeFacet[] = [];
  for (const facet of RANGE_FACETS) {
    const values: number[] = [];
    for (const row of rows) {
      if (!rowMatches(row, filters, facet.key)) continue;
      const value = toNumber(row[facet.column]);
      if (value !== null) values.push(value);
    }
    const min = filters[facet.minKey];
    const max = facet.maxKey ? filters[facet.maxKey] : undefined;
    let range = bounds(values);
    // Power, speed and year stay available even when the other filters leave
    // nothing to bound them (a zero-result view), using the catalogue's own
    // spread, so the rail does not lose controls the moment nothing matches.
    // Electric range is only offered while the results contain an EV.
    if (range === null && facet.key !== "range") {
      range = bounds(
        rows
          .map((row) => toNumber(row[facet.column]))
          .filter((value): value is number => value !== null),
      );
    }
    if (range === null && min === undefined && max === undefined) continue;
    ranges.push({
      key: facet.key,
      title: facet.title,
      unit: facet.unit,
      minParam: facet.minKey,
      maxParam: facet.maxKey,
      bounds: range,
      min,
      max,
    });
  }

  let price: PriceFacet | null = null;
  const currencyUniverse = new Set<string>();
  for (const row of rows) {
    if (row.listed_price_currency && toNumber(row.listed_price) !== null) {
      currencyUniverse.add(row.listed_price_currency);
    }
  }
  if (filters.priceCurrency) currencyUniverse.add(filters.priceCurrency);

  if (currencyUniverse.size > 0) {
    const currencyCounts = new Map<string, number>();
    const amounts: number[] = [];
    for (const row of rows) {
      if (!rowMatches(row, filters, "price")) continue;
      const currency = row.listed_price_currency;
      const amount = toNumber(row.listed_price);
      if (!currency || amount === null) continue;
      currencyCounts.set(currency, (currencyCounts.get(currency) ?? 0) + 1);
      if (currency === filters.priceCurrency) amounts.push(amount);
    }
    price = {
      currencies: [...currencyUniverse]
        .map((currency) => ({
          value: currency,
          label: currency,
          count: currencyCounts.get(currency) ?? 0,
          selected: currency === filters.priceCurrency,
        }))
        .sort(byCountThenLabel(false)),
      currency: filters.priceCurrency,
      bounds: filters.priceCurrency ? bounds(amounts) : null,
      min: filters.priceCurrency ? filters.priceMin : undefined,
      max: filters.priceCurrency ? filters.priceMax : undefined,
    };
  }

  let total = 0;
  for (const row of rows) if (rowMatches(row, filters)) total += 1;

  return { lists, ranges, price, total, universe: rows.length };
}

/** Count of rows that match a filter set, for "remove this filter → N cars" hints. */
export function countMatching(rows: readonly FacetRow[], filters: CarFilters): number {
  let total = 0;
  for (const row of rows) if (rowMatches(row, filters)) total += 1;
  return total;
}

/** Label of a list-facet value, preferring the name the data carries. */
export function optionLabel(
  options: FilterOptions,
  key: ListFacetKey,
  value: string,
): string {
  const facet = options.lists.find((entry) => entry.key === key);
  return (
    facet?.options.find((option) => option.value === value)?.label ??
    fallbackLabel(key, value)
  );
}
