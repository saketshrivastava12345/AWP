import type {
  Aspiration,
  BodyType,
  DriveType,
  EngineLayout,
  FuelType,
  TransmissionType,
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

export const SORT_OPTIONS = {
  "power-desc": { column: "power_hp", ascending: false, label: "Power (high to low)" },
  "power-asc": { column: "power_hp", ascending: true, label: "Power (low to high)" },
  "speed-desc": { column: "top_speed_kmh", ascending: false, label: "Top speed" },
  "accel-asc": { column: "zero_to_100_s", ascending: true, label: "0–100 km/h" },
  "price-asc": { column: "base_price", ascending: true, label: "Price (low to high)" },
  "price-desc": { column: "base_price", ascending: false, label: "Price (high to low)" },
  "year-desc": { column: "year_start", ascending: false, label: "Newest" },
  "name-asc": {
    column: "manufacturer_name",
    ascending: true,
    label: "Manufacturer (A–Z)",
  },
} as const;

export type SortKey = keyof typeof SORT_OPTIONS;
export const DEFAULT_SORT: SortKey = "power-desc";

export function isSortKey(value: string | undefined): value is SortKey {
  return value !== undefined && value in SORT_OPTIONS;
}

export type CarFilters = {
  country?: string[];
  manufacturer?: string[];
  category?: string[];
  fuel?: FuelType[];
  drive?: DriveType[];
  body?: BodyType[];
  transmission?: TransmissionType[];
  engineLayout?: EngineLayout[];
  aspiration?: Aspiration[];
  cylinders?: number[];
  powerMin?: number;
  powerMax?: number;
  speedMin?: number;
  speedMax?: number;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  /** Free text, matched against the maintained tsvector. */
  text?: string;
};
