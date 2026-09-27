import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  isPageSize,
  isSortKey,
  type CarFilters,
  type SortKey,
} from "@/lib/car-query";
import {
  ASPIRATION_LABELS,
  BODY_LABELS,
  DRIVE_LABELS,
  FUEL_LABELS,
  LAYOUT_LABELS,
  LIST_FACETS,
  RANGE_FACETS,
  STATUS_LABELS,
  TRANSMISSION_LABELS,
  optionLabel,
  type FacetRow,
  rowMatches,
  type FilterOptions,
  type ListFacetKey,
  type NumericFilterKey,
} from "@/lib/facets";
import { parseQuery, type ParsedQuery, type QueryMatch } from "@/lib/search/parseQuery";
import { formatNumber, formatPriceCompact } from "@/lib/format";

/**
 * The catalogue's URL is its state: every filter, the sort, the page size and
 * the page live in search params, so a view is shareable, back/forward works
 * and the page functions without JavaScript.
 *
 * Client-safe (no server imports): the filter rail builds URLs with it too.
 */

/** Next passes search params as string or string[] (repeated keys). */
export type RawSearchParams = Record<string, string | string[] | undefined>;

export const CATALOGUE_PATH = "/cars";

/** Longest free-text query we accept. Anything longer is truncated, not rejected. */
const MAX_QUERY_LENGTH = 200;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENCY = /^[A-Z]{3}$/;

/** Every value of a param, exactly as sent. Never split: free text may contain commas. */
function allValues(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * A repeatable list param. Accepts both `?fuel=a&fuel=b` and `?fuel=a,b`, so
 * hand-typed and generated URLs both work. Only ever used for facet params,
 * whose values (slugs, enum members, integers) cannot contain a comma.
 */
function readList(raw: string | string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const value of allValues(raw)) {
    for (const part of value.split(",")) {
      const trimmed = part.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  return [...seen];
}

function readOne(raw: string | string[] | undefined): string | undefined {
  const value = allValues(raw)[0]?.trim();
  return value ? value : undefined;
}

function readNumber(raw: string | string[] | undefined): number | undefined {
  const value = readOne(raw);
  if (value === undefined) return undefined;
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function slugs(values: string[]): string[] {
  return values.map((value) => value.toLowerCase()).filter((value) => SLUG.test(value));
}

/** Keep only values that are real members of the enum (the label map's keys). */
function members<T extends string>(values: string[], labels: Record<T, string>): T[] {
  return values.filter((value): value is T => Object.hasOwn(labels, value));
}

function nonEmpty<T>(values: T[]): T[] | undefined {
  return values.length > 0 ? values : undefined;
}

/** A min above its max is obviously meant the other way round. */
function ordered(
  min: number | undefined,
  max: number | undefined,
): [number | undefined, number | undefined] {
  if (min !== undefined && max !== undefined && min > max) return [max, min];
  return [min, max];
}

export type CatalogueParams = {
  /** Filters written explicitly in the URL. */
  filters: CarFilters;
  page: number;
  pageSize: number;
  sort: SortKey | undefined;
  /** The raw free-text query (`q`), before the parser reads it. */
  query: string | undefined;
};

/**
 * Turn URL search params into filters.
 *
 * Unknown or malformed values are dropped rather than rejected: a shared link
 * with a stale filter should still show results, not an error. Price bounds
 * without a currency are dropped too — AURIX never compares prices across
 * currencies, so a bare "under 100000" has no meaning.
 */
export function parseCarSearchParams(params: RawSearchParams): CatalogueParams {
  const rawQuery = readOne(params.q);
  const query = rawQuery ? rawQuery.slice(0, MAX_QUERY_LENGTH) : undefined;

  const [powerMin, powerMax] = ordered(
    readNumber(params.powerMin),
    readNumber(params.powerMax),
  );
  const [speedMin, speedMax] = ordered(
    readNumber(params.speedMin),
    readNumber(params.speedMax),
  );
  const [yearMin, yearMax] = ordered(
    readNumber(params.yearMin),
    readNumber(params.yearMax),
  );

  const currency = readOne(params.priceCurrency)?.toUpperCase();
  const priceCurrency = currency && CURRENCY.test(currency) ? currency : undefined;
  const [priceMin, priceMax] = priceCurrency
    ? ordered(readNumber(params.priceMin), readNumber(params.priceMax))
    : [undefined, undefined];

  const filters: CarFilters = compact({
    country: nonEmpty(slugs(readList(params.country))),
    manufacturer: nonEmpty(slugs(readList(params.manufacturer))),
    category: nonEmpty(slugs(readList(params.category))),
    body: nonEmpty(members(readList(params.body), BODY_LABELS)),
    fuel: nonEmpty(members(readList(params.fuel), FUEL_LABELS)),
    transmission: nonEmpty(members(readList(params.transmission), TRANSMISSION_LABELS)),
    drive: nonEmpty(members(readList(params.drive), DRIVE_LABELS)),
    engineLayout: nonEmpty(members(readList(params.layout), LAYOUT_LABELS)),
    cylinders: nonEmpty(
      readList(params.cylinders)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0 && value <= 24),
    ),
    aspiration: nonEmpty(members(readList(params.aspiration), ASPIRATION_LABELS)),
    status: nonEmpty(members(readList(params.status), STATUS_LABELS)),
    powerMin,
    powerMax,
    speedMin,
    speedMax,
    yearMin,
    yearMax,
    rangeMin: readNumber(params.rangeMin),
    priceCurrency,
    priceMin,
    priceMax,
  });

  const sortParam = readOne(params.sort);
  const pageSizeParam = readNumber(params.pageSize);
  const pageParam = readNumber(params.page);

  return {
    filters,
    page: pageParam !== undefined && pageParam >= 1 ? Math.floor(pageParam) : 1,
    pageSize: isPageSize(pageSizeParam) ? pageSizeParam : DEFAULT_PAGE_SIZE,
    sort: isSortKey(sortParam) ? sortParam : undefined,
    query,
  };
}

/** Drop undefined keys so filter objects compare and serialise cleanly. */
function compact(filters: CarFilters): CarFilters {
  const out: CarFilters = {};
  for (const key of FILTER_KEYS) copyKey(filters, out, key);
  if (filters.text !== undefined) out.text = filters.text;
  return out;
}

/** Every CarFilters key except free text, in canonical URL order. */
const FILTER_KEYS = [
  "country",
  "manufacturer",
  "category",
  "body",
  "fuel",
  "transmission",
  "drive",
  "engineLayout",
  "cylinders",
  "aspiration",
  "status",
  "powerMin",
  "powerMax",
  "speedMin",
  "speedMax",
  "rangeMin",
  "yearMin",
  "yearMax",
  "priceCurrency",
  "priceMin",
  "priceMax",
] as const satisfies readonly Exclude<keyof CarFilters, "text">[];

type FilterKey = (typeof FILTER_KEYS)[number];

function isSet(value: CarFilters[keyof CarFilters]): boolean {
  if (value === undefined || value === "") return false;
  return Array.isArray(value) ? value.length > 0 : true;
}

function copyKey<K extends keyof CarFilters>(
  from: CarFilters,
  to: CarFilters,
  key: K,
): void {
  if (isSet(from[key])) to[key] = from[key];
}

/** A number as it appears in a URL: no exponent, no trailing zeros. */
function paramNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

/** URL param for a filter key. List facets can have a different name (engineLayout -> layout). */
const PARAM_FOR: Record<FilterKey, string> = {
  country: "country",
  manufacturer: "manufacturer",
  category: "category",
  body: "body",
  fuel: "fuel",
  transmission: "transmission",
  drive: "drive",
  engineLayout: "layout",
  cylinders: "cylinders",
  aspiration: "aspiration",
  status: "status",
  powerMin: "powerMin",
  powerMax: "powerMax",
  speedMin: "speedMin",
  speedMax: "speedMax",
  rangeMin: "rangeMin",
  yearMin: "yearMin",
  yearMax: "yearMax",
  priceCurrency: "priceCurrency",
  priceMin: "priceMin",
  priceMax: "priceMax",
};

/** Filters as URL params, in canonical order. Free text is carried separately as `q`. */
export function filtersToParams(filters: CarFilters): [string, string][] {
  const entries: [string, string][] = [];
  for (const key of FILTER_KEYS) {
    if ((key === "priceMin" || key === "priceMax") && !filters.priceCurrency) continue;
    const value = filters[key];
    if (!isSet(value)) continue;
    if (Array.isArray(value)) {
      for (const entry of value) entries.push([PARAM_FOR[key], String(entry)]);
    } else if (typeof value === "number") {
      entries.push([PARAM_FOR[key], paramNumber(value)]);
    } else if (typeof value === "string") {
      entries.push([PARAM_FOR[key], value]);
    }
  }
  return entries;
}

/**
 * A canonical catalogue URL. Defaults are omitted (sort=power-desc,
 * pageSize=12, page=1), so equivalent views share one URL.
 */
export function catalogueHref({
  query,
  filters,
  sort,
  pageSize,
  page,
}: {
  query?: string;
  filters: CarFilters;
  sort?: SortKey;
  pageSize?: number;
  page?: number;
}): string {
  const search = new URLSearchParams();
  if (query?.trim()) search.append("q", query.trim());
  for (const [key, value] of filtersToParams(filters)) search.append(key, value);
  if (sort && sort !== DEFAULT_SORT) search.append("sort", sort);
  if (pageSize && pageSize !== DEFAULT_PAGE_SIZE)
    search.append("pageSize", String(pageSize));
  if (page && page > 1) search.append("page", String(page));
  const result = search.toString();
  return result ? `${CATALOGUE_PATH}?${result}` : CATALOGUE_PATH;
}

/** True when any filter is actually narrowing the result set. */
export function hasActiveFilters(filters: CarFilters): boolean {
  return FILTER_KEYS.some((key) => isSet(filters[key]));
}

/** True when the URL carries any state at all — used to keep permutations out of the index. */
export function hasAnySearchParam(params: RawSearchParams): boolean {
  return Object.values(params).some((value) =>
    Array.isArray(value) ? value.some(Boolean) : Boolean(value),
  );
}

/**
 * Build a URL query string from the current params with overrides applied.
 * Values are copied exactly as received — a `q` of "porsche, v8" or a compare
 * slug stays one value — and an override replaces every value of its key.
 */
export function buildQueryString(
  current: RawSearchParams,
  overrides: Record<string, string | string[] | number | undefined | null>,
): string {
  const search = new URLSearchParams();

  for (const [key, raw] of Object.entries(current)) {
    if (Object.hasOwn(overrides, key)) continue;
    for (const value of allValues(raw)) search.append(key, value);
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

// ---------------------------------------------------------------------------
// Resolved state: URL filters + what the parser read from q
// ---------------------------------------------------------------------------

export type CatalogueState = {
  /** Filters written explicitly in the URL. */
  explicit: CarFilters;
  /** The raw q param. */
  query: string | undefined;
  parsed: ParsedQuery | null;
  /**
   * What is actually applied. Per key, an explicit URL filter wins over the
   * parser's reading of q, so clicking a facet is never silently overridden
   * by words in the search box.
   */
  effective: CarFilters;
  /** Keys whose effective value came from the search text. */
  searchKeys: FilterKey[];
  sort: SortKey;
  page: number;
  pageSize: number;
};

export function resolveCatalogueState(params: RawSearchParams): CatalogueState {
  return resolveParts(parseCarSearchParams(params));
}

export function resolveParts(parts: CatalogueParams): CatalogueState {
  const parsed = parts.query ? parseQuery(parts.query) : null;
  const effective: CarFilters = {};
  const searchKeys: FilterKey[] = [];

  for (const key of FILTER_KEYS) {
    if (isSet(parts.filters[key])) {
      copyKey(parts.filters, effective, key);
    } else if (parsed && isSet(parsed.filters[key])) {
      copyKey(parsed.filters, effective, key);
      searchKeys.push(key);
    }
  }
  if (!effective.priceCurrency) {
    delete effective.priceMin;
    delete effective.priceMax;
  }
  if (parsed?.text) effective.text = parsed.text;

  return {
    explicit: parts.filters,
    query: parts.query,
    parsed,
    effective,
    searchKeys,
    sort: parts.sort ?? DEFAULT_SORT,
    page: parts.page,
    pageSize: parts.pageSize,
  };
}

/** Matches that turned into filters (everything but the leftover text). */
function filterMatches(parsed: ParsedQuery | null): QueryMatch[] {
  return parsed ? parsed.matches.filter((match) => match.kind !== "text") : [];
}

/**
 * The q to carry once the parser's filters have been written into the URL as
 * explicit params: just the words no rule claimed. With no filter matches the
 * query is kept exactly as typed.
 */
export function textQuery(state: CatalogueState): string | undefined {
  if (filterMatches(state.parsed).length === 0) return state.query;
  return state.parsed?.text;
}

/** The URL for this state with some parts changed. Page resets unless given. */
export function stateHref(
  state: CatalogueState,
  changes: {
    query?: string | undefined;
    filters?: CarFilters;
    sort?: SortKey;
    pageSize?: number;
    page?: number;
  } = {},
): string {
  return catalogueHref({
    query: "query" in changes ? changes.query : state.query,
    filters: changes.filters ?? state.explicit,
    sort: changes.sort ?? state.sort,
    pageSize: changes.pageSize ?? state.pageSize,
    page: changes.page,
  });
}

/** "Clear all": every filter goes, including those read from the search box; sort, page size and free text stay. */
export function clearFiltersHref(state: CatalogueState): string {
  return stateHref(state, { query: textQuery(state), filters: {} });
}

// ---------------------------------------------------------------------------
// Editing the search text
// ---------------------------------------------------------------------------

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A case- and whitespace-insensitive pattern for a token the parser claimed. */
function tokenPattern(token: string): RegExp {
  const body = token.trim().split(/\s+/).map(escapeRegExp).join("\\s+");
  const start = /^\w/.test(token.trim()) ? "\\b" : "";
  const end = /\w$/.test(token.trim()) ? "\\b" : "";
  return new RegExp(`${start}${body}${end}`, "i");
}

function tidy(text: string): string | undefined {
  const result = text.replace(/\s+/g, " ").trim();
  return result ? result : undefined;
}

function matchKeys(matches: QueryMatch[]): string {
  return matches
    .map((match) => `${match.kind}:${match.label}`)
    .sort()
    .join("|");
}

/**
 * q with one parsed filter removed, keeping the rest of the user's wording.
 *
 * The token is cut from the original text; if re-parsing the result does not
 * give back exactly the remaining matches (words can interact once one is
 * gone), the query is rebuilt from the remaining tokens instead, which always
 * parses back to them.
 */
export function removeMatchFromQuery(
  query: string,
  parsed: ParsedQuery,
  match: QueryMatch,
): string | undefined {
  const remaining = parsed.matches.filter((entry) => entry !== match);
  const expected = matchKeys(remaining);

  const cut = tidy(query.replace(tokenPattern(match.token), " "));
  if (
    cut === undefined ? expected === "" : matchKeys(parseQuery(cut).matches) === expected
  ) {
    return cut;
  }

  return tidy(remaining.map((entry) => entry.token).join(" "));
}

/** q without its free-text words, keeping every word the parser turned into a filter. */
export function removeTextFromQuery(
  query: string,
  parsed: ParsedQuery,
): string | undefined {
  const remaining = parsed.matches.filter((entry) => entry.kind !== "text");
  let cut = query;
  for (const word of (parsed.text ?? "").split(/\s+/).filter(Boolean)) {
    cut = cut.replace(tokenPattern(word), " ");
  }
  const tidied = tidy(cut);
  const check = tidied ? parseQuery(tidied) : null;
  if (
    tidied === undefined ||
    (check && !check.text && matchKeys(check.matches) === matchKeys(remaining))
  ) {
    return tidied;
  }
  return tidy(remaining.map((entry) => entry.token).join(" "));
}

// ---------------------------------------------------------------------------
// Active filter chips
// ---------------------------------------------------------------------------

export type FilterChip = {
  id: string;
  label: string;
  /** A URL filter, a filter the parser read from the search text, or the free text itself. */
  source: "filter" | "search" | "text";
  /** URL of this view without it. */
  href: string;
  /** Effective filters without it, for "remove this → N cars" hints. */
  after: CarFilters;
  /** False when removing it changes the full-text search (counts need a new query). */
  sameText: boolean;
};

function rangeLabel(
  title: string,
  unit: string,
  min: number | undefined,
  max: number | undefined,
): string {
  const format = (value: number) => (unit ? formatNumber(value) : String(value));
  const suffix = unit ? ` ${unit}` : "";
  if (min !== undefined && max !== undefined) {
    return `${title} ${format(min)}–${format(max)}${suffix}`;
  }
  if (min !== undefined) return `${title} ≥ ${format(min)}${suffix}`;
  return `${title} ≤ ${format(max ?? 0)}${suffix}`;
}

function withoutValue(filters: CarFilters, key: ListFacetKey, value: string): CarFilters {
  const next: CarFilters = { ...filters };
  const current = (filters[key] as readonly (string | number)[] | undefined) ?? [];
  const remaining = current.filter((entry) => String(entry) !== value);
  setList(next, key, remaining);
  return next;
}

function setList(
  filters: CarFilters,
  key: ListFacetKey,
  values: readonly (string | number)[],
) {
  const list = filters as Record<ListFacetKey, readonly (string | number)[] | undefined>;
  if (values.length > 0) list[key] = values;
  else delete list[key];
}

function withoutKeys(
  filters: CarFilters,
  keys: readonly (keyof CarFilters)[],
): CarFilters {
  const next: CarFilters = { ...filters };
  for (const key of keys) delete next[key];
  return next;
}

/**
 * The parser's label for a phrase, tidied for display. Its bare "over 300
 * speed" rule leaves an internal label ("speed above") behind.
 */
function matchLabel(match: QueryMatch, contribution: CarFilters): string {
  if (match.kind === "speed" && match.label === "speed above" && contribution.speedMin) {
    return `Over ${formatNumber(contribution.speedMin)} km/h`;
  }
  return match.label.charAt(0).toUpperCase() + match.label.slice(1);
}

/**
 * Every active filter as a removable chip: the ones in the URL, the ones the
 * parser read from the search text (removing one edits q), and the leftover
 * free text. The filter count shown anywhere is the number of non-text chips,
 * so it always matches what the user can see.
 */
export function buildChips(state: CatalogueState, options: FilterOptions): FilterChip[] {
  const chips: FilterChip[] = [];
  const { explicit, parsed, query } = state;
  const baseText = state.effective.text;

  const chipFor = (
    id: string,
    label: string,
    source: FilterChip["source"],
    parts: CatalogueParams,
  ): FilterChip => {
    const after = resolveParts(parts);
    return {
      id,
      label,
      source,
      href: stateHref(state, { query: parts.query, filters: parts.filters }),
      after: after.effective,
      sameText: after.effective.text === baseText,
    };
  };

  const partsWith = (changes: Partial<CatalogueParams>): CatalogueParams => ({
    filters: explicit,
    page: 1,
    pageSize: state.pageSize,
    sort: state.sort,
    query,
    ...changes,
  });

  // Filters read from the search text. One chip per phrase the parser
  // understood; a phrase whose every key is overridden by a URL filter has
  // no effect and gets no chip.
  if (parsed && query) {
    // In the order the words were typed, not the order the rules ran.
    const position = (match: QueryMatch) => {
      const index = query.search(tokenPattern(match.token));
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    const inTypedOrder = parsed.matches
      .map((match, index) => ({ match, index }))
      .sort((a, b) => position(a.match) - position(b.match) || a.index - b.index);

    inTypedOrder.forEach(({ match, index }) => {
      if (match.kind === "text") return;
      const contribution = parseQuery(match.token).filters;
      const keys = FILTER_KEYS.filter((key) => isSet(contribution[key]));
      if (keys.length > 0 && keys.every((key) => isSet(explicit[key]))) return;
      chips.push(
        chipFor(
          `search-${index}`,
          matchLabel(match, contribution),
          "search",
          partsWith({ query: removeMatchFromQuery(query, parsed, match) }),
        ),
      );
    });
  }

  for (const facet of LIST_FACETS) {
    const values =
      (explicit[facet.key] as readonly (string | number)[] | undefined) ?? [];
    for (const raw of values) {
      const value = String(raw);
      chips.push(
        chipFor(
          `${facet.param}-${value}`,
          optionLabel(options, facet.key, value),
          "filter",
          partsWith({ filters: withoutValue(explicit, facet.key, value) }),
        ),
      );
    }
  }

  for (const facet of RANGE_FACETS) {
    const min = explicit[facet.minKey];
    const max = facet.maxKey ? explicit[facet.maxKey] : undefined;
    if (min === undefined && max === undefined) continue;
    const keys: NumericFilterKey[] = facet.maxKey
      ? [facet.minKey, facet.maxKey]
      : [facet.minKey];
    chips.push(
      chipFor(
        `range-${facet.key}`,
        rangeLabel(facet.title, facet.unit, min, max),
        "filter",
        partsWith({ filters: withoutKeys(explicit, keys) }),
      ),
    );
  }

  if (explicit.priceCurrency) {
    const currency = explicit.priceCurrency;
    const { priceMin: min, priceMax: max } = explicit;
    const format = (value: number) => formatPriceCompact(value, currency, String(value));
    const label =
      min !== undefined && max !== undefined
        ? `${format(min)}–${format(max)}`
        : min !== undefined
          ? `From ${format(min)}`
          : max !== undefined
            ? `Up to ${format(max)}`
            : `Priced in ${currency}`;
    chips.push(
      chipFor(
        "price",
        label,
        "filter",
        partsWith({
          filters: withoutKeys(explicit, ["priceCurrency", "priceMin", "priceMax"]),
        }),
      ),
    );
  }

  if (parsed?.text && query) {
    chips.push(
      chipFor(
        "text",
        `“${parsed.text}”`,
        "text",
        partsWith({ query: removeTextFromQuery(query, parsed) }),
      ),
    );
  }

  return chips;
}

/** Number shown on "Filters (n)" — the chips a user can see, minus the free text. */
export function countFilterChips(chips: readonly FilterChip[]): number {
  return chips.filter((chip) => chip.source !== "text").length;
}

// ---------------------------------------------------------------------------
// Page title for a filtered view
// ---------------------------------------------------------------------------

/** "German cars". Keyed by country slug; any other country reads "Cars from X". */
const COUNTRY_ADJECTIVES: Record<string, string> = {
  china: "Chinese",
  france: "French",
  germany: "German",
  india: "Indian",
  italy: "Italian",
  japan: "Japanese",
  "south-korea": "South Korean",
  sweden: "Swedish",
  "united-kingdom": "British",
  "united-states": "American",
};

const FUEL_ADJECTIVES: Record<string, string> = {
  petrol: "petrol",
  diesel: "diesel",
  hybrid: "hybrid",
  phev: "plug-in hybrid",
  electric: "electric",
  hydrogen: "hydrogen",
};

/** Plural nouns for body styles, as they read mid-sentence. */
const BODY_NOUNS: Record<string, string> = {
  hatchback: "hatchbacks",
  sedan: "sedans",
  coupe: "coupés",
  convertible: "convertibles",
  roadster: "roadsters",
  suv: "SUVs",
  wagon: "wagons",
  mpv: "MPVs",
  pickup: "pickups",
  off_road: "off-roaders",
};

/** Plural nouns for the recorded segments (category slugs). */
const SEGMENT_NOUNS: Record<string, string> = {
  coupe: "coupés",
  hatchback: "hatchbacks",
  hypercar: "hypercars",
  "off-road": "off-roaders",
  pickup: "pickups",
  sedan: "sedans",
  "sports-car": "sports cars",
  supercar: "supercars",
  suv: "SUVs",
  wagon: "wagons",
  mpv: "MPVs",
};

function only<T>(values: readonly T[] | undefined): T | undefined {
  return values && values.length === 1 ? values[0] : undefined;
}

function sentence(words: readonly (string | undefined)[]): string {
  const text = words.filter(Boolean).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The /cars heading for the current view: "All cars", or one built from the
 * filters that read naturally as a title — "German cars", "Electric SUVs",
 * "Porsche", "Japanese sports cars". It names only single values of brand,
 * country, powertrain and body style or segment; anything else it cannot say
 * in a phrase falls back to "Cars matching your filters" (the chips below the
 * heading list every filter either way).
 */
export function catalogueTitle(state: CatalogueState, options: FilterOptions): string {
  const filters = state.effective;
  const active = (Object.keys(filters) as (keyof CarFilters)[]).filter((key) => {
    const value = filters[key];
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  });
  if (active.length === 0) return "All cars";

  const maker = only(filters.manufacturer);
  const country = only(filters.country);
  const fuel = only(filters.fuel);
  const body = only(filters.body);
  const segment = only(filters.category);

  const makerName = maker ? optionLabel(options, "manufacturer", maker) : undefined;
  const countryWord = country ? COUNTRY_ADJECTIVES[country] : undefined;
  const countryName =
    country && !countryWord ? optionLabel(options, "country", country) : undefined;
  let fuelWord = fuel ? FUEL_ADJECTIVES[fuel] : undefined;
  // The "EV" segment says the same as the electric powertrain.
  if (segment === "ev" && !fuelWord) fuelWord = "electric";
  const noun =
    (body ? BODY_NOUNS[body] : undefined) ??
    (segment && segment !== "ev" ? SEGMENT_NOUNS[segment] : undefined);

  if (!makerName && !countryWord && !countryName && !fuelWord && !noun) {
    if (active.length === 1 && filters.text && state.query) {
      return `Results for “${state.query}”`;
    }
    return "Cars matching your filters";
  }

  // "Porsche" on its own reads as the brand's catalogue.
  if (makerName && !fuelWord && !noun) return makerName;
  if (countryName && !makerName) {
    return sentence([fuelWord, noun ?? "cars", `from ${countryName}`]);
  }
  return sentence([fuelWord, makerName ?? countryWord, noun ?? "cars"]);
}

/** Distinct brands and countries among the rows a view matches, for its lead line. */
export function matchingSpread(
  rows: readonly FacetRow[],
  filters: CarFilters,
): { cars: number; brands: number; countries: number } {
  const brands = new Set<string>();
  const countries = new Set<string>();
  let cars = 0;
  for (const row of rows) {
    if (!rowMatches(row, filters)) continue;
    cars += 1;
    if (row.manufacturer_slug) brands.add(row.manufacturer_slug);
    if (row.country_slug) countries.add(row.country_slug);
  }
  return { cars, brands: brands.size, countries: countries.size };
}
