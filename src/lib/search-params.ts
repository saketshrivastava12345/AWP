import { isSortKey, type CarFilters, type SortKey } from "@/lib/car-query";
import type {
  Aspiration,
  BodyType,
  DriveType,
  EngineLayout,
  FuelType,
  TransmissionType,
} from "@/types/domain";

/** Next passes search params as string or string[] (repeated keys). */
export type RawSearchParams = Record<string, string | string[] | undefined>;

const FUEL_VALUES = new Set<string>([
  "petrol",
  "diesel",
  "hybrid",
  "phev",
  "electric",
  "hydrogen",
]);
const DRIVE_VALUES = new Set<string>(["fwd", "rwd", "awd", "4wd"]);
const BODY_VALUES = new Set<string>([
  "hatchback",
  "sedan",
  "coupe",
  "convertible",
  "roadster",
  "suv",
  "wagon",
  "mpv",
  "pickup",
  "off_road",
]);
const TRANSMISSION_VALUES = new Set<string>([
  "manual",
  "automatic",
  "dct",
  "amt",
  "cvt",
  "single_speed",
]);
const LAYOUT_VALUES = new Set<string>(["inline", "vee", "flat", "w", "rotary"]);
const ASPIRATION_VALUES = new Set<string>([
  "naturally_aspirated",
  "turbocharged",
  "twin_turbo",
  "supercharged",
  "twincharged",
]);

/**
 * Read a repeatable param. Accepts both `?fuel=a&fuel=b` and `?fuel=a,b`, so
 * hand-typed and generated URLs both work.
 */
function readList(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function readOne(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value?.trim() || undefined;
}

function readInt(raw: string | string[] | undefined): number | undefined {
  const value = readOne(raw);
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Keep only values that are real members of the enum. */
function keepValid<T extends string>(values: string[], allowed: Set<string>): T[] {
  return values.filter((value): value is T => allowed.has(value));
}

/**
 * Turn URL search params into filters.
 *
 * Unknown or malformed values are dropped rather than rejected: a shared link
 * with a stale filter should still show results, not an error.
 */
export function parseCarSearchParams(params: RawSearchParams): {
  filters: CarFilters;
  page: number;
  sort: SortKey | undefined;
  query: string | undefined;
} {
  const query = readOne(params.q);

  const filters: CarFilters = {
    country: readList(params.country),
    manufacturer: readList(params.manufacturer),
    category: readList(params.category),
    fuel: keepValid<FuelType>(readList(params.fuel), FUEL_VALUES),
    drive: keepValid<DriveType>(readList(params.drive), DRIVE_VALUES),
    body: keepValid<BodyType>(readList(params.body), BODY_VALUES),
    transmission: keepValid<TransmissionType>(
      readList(params.transmission),
      TRANSMISSION_VALUES,
    ),
    engineLayout: keepValid<EngineLayout>(readList(params.layout), LAYOUT_VALUES),
    aspiration: keepValid<Aspiration>(readList(params.aspiration), ASPIRATION_VALUES),
    cylinders: readList(params.cylinders)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value)),
    powerMin: readInt(params.powerMin),
    powerMax: readInt(params.powerMax),
    speedMin: readInt(params.speedMin),
    speedMax: readInt(params.speedMax),
    priceMin: readInt(params.priceMin),
    priceMax: readInt(params.priceMax),
    yearMin: readInt(params.yearMin),
    yearMax: readInt(params.yearMax),
  };

  const sortParam = readOne(params.sort);

  return {
    filters,
    page: Math.max(1, readInt(params.page) ?? 1),
    sort: isSortKey(sortParam) ? sortParam : undefined,
    query,
  };
}

/** True when any filter is actually narrowing the result set. */
export function hasActiveFilters(filters: CarFilters): boolean {
  return Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== undefined,
  );
}

/** Count of active filter facets, for the "N active" badge. */
export function countActiveFilters(filters: CarFilters): number {
  return Object.values(filters).reduce<number>((total, value) => {
    if (Array.isArray(value)) return total + value.length;
    return value === undefined ? total : total + 1;
  }, 0);
}

/**
 * Build a URL query string from the current params with overrides applied.
 * Used by pagination, sorting and filter toggles so each one preserves the
 * rest of the state — the whole filter set lives in the URL and is shareable.
 */
export function buildQueryString(
  current: RawSearchParams,
  overrides: Record<string, string | string[] | number | undefined | null>,
): string {
  const search = new URLSearchParams();

  for (const [key, raw] of Object.entries(current)) {
    if (key in overrides) continue;
    for (const value of readList(raw)) search.append(key, value);
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const entry of value) search.append(key, entry);
    } else {
      search.append(key, String(value));
    }
  }

  const result = search.toString();
  return result ? `?${result}` : "";
}
