/**
 * The command palette's data model, kept free of React and the DOM so the
 * ordering and highlighting rules can be unit-tested.
 */
import type { SearchResult, SearchResultKind } from "@/types/domain";
import { parseQuery } from "@/lib/search/parseQuery";

/** localStorage key for the palette's recent searches (JSON string[]). */
export const RECENT_SEARCHES_KEY = "aurix-recent-searches";
export const MAX_RECENT_SEARCHES = 6;

/**
 * Natural-language examples. Phrased the way the rule-based parser reads
 * them — country, category, comparison and engine terms — so they double as
 * documentation of what the /cars search understands.
 */
export const EXAMPLE_QUERIES = [
  "german supercars",
  "cars under 500 hp",
  "above 300 km/h",
  "japanese sports cars",
  "electric suv",
  "v8 rwd",
] as const;

/** Matches the API's limit (MAX_SEARCH_LENGTH in lib/queries/search.ts). */
export const MAX_QUERY_LENGTH = 80;

/** A score at or above this is an exact or near-exact name match. */
export const STRONG_MATCH_SCORE = 1;

/**
 * Tie-break order for groups whose best scores are equal. Marque and country
 * pages come before individual cars: a tie between them is a (misspelt) brand
 * or country name — "porche" — and the page for that name is the better
 * answer than whichever of its cars happened to match.
 */
export const KIND_ORDER: readonly SearchResultKind[] = [
  "manufacturer",
  "country",
  "car",
  "part",
];

/** Case-, accent- and spacing-insensitive form of a name, for exact matching. */
export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export const KIND_LABELS: Record<SearchResultKind, { group: string; item: string }> = {
  car: { group: "Cars", item: "Car" },
  manufacturer: { group: "Manufacturers", item: "Marque" },
  country: { group: "Countries", item: "Country" },
  part: { group: "Parts", item: "Part" },
};

export type PaletteOption =
  | { type: "result"; key: string; result: SearchResult }
  | {
      type: "search-all";
      key: "search-all";
      query: string;
      href: string;
      /** What the natural-language parser recognised, e.g. ["Germany", "Supercar"]. */
      understood: string[];
    }
  | { type: "recent"; key: string; query: string }
  | { type: "clear-recent"; key: "clear-recent" }
  | { type: "example"; key: string; query: string; href: string };

export type PaletteSection = {
  id: string;
  label: string;
  options: PaletteOption[];
};

/** The /cars URL that runs the full natural-language search. */
export function carsSearchHref(query: string): string {
  return `/cars?q=${encodeURIComponent(query.trim())}`;
}

/**
 * Labels for the filters the /cars parser would apply to this query. Free
 * text is left out: it is the query itself, so repeating it adds nothing.
 */
export function understoodAs(query: string): string[] {
  const labels = parseQuery(query)
    .matches.filter((match) => match.kind !== "text")
    .map((match) => match.label.charAt(0).toUpperCase() + match.label.slice(1));
  return [...new Set(labels)];
}

/**
 * Sections for a non-empty query.
 *
 * A result whose name IS the query ("porsche" → the Porsche marque) leads,
 * whatever its score: the search scores each kind on its own scale (a car
 * that mentions Porsche three times outscores the marque), so the scores
 * cannot settle that comparison. Otherwise groups are ordered by their best
 * score, so "brake" leads with parts and "japan" with the country, rather
 * than always putting cars first. The
 * "search all cars" action is always offered: it goes first when the query
 * reads as a description ("electric suv") and nothing matches a name
 * strongly — Enter should then run the full search, not open a weak fuzzy
 * hit — and last otherwise.
 */
export function buildResultSections(
  query: string,
  results: readonly SearchResult[],
): PaletteSection[] {
  const trimmed = query.trim();
  const understood = understoodAs(trimmed);
  const searchAll: PaletteSection = {
    id: "search",
    label: "Search",
    options: [
      {
        type: "search-all",
        key: "search-all",
        query: trimmed,
        href: carsSearchHref(trimmed),
        understood,
      },
    ],
  };

  const groups = new Map<SearchResultKind, SearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.kind) ?? [];
    list.push(result);
    groups.set(result.kind, list);
  }

  const folded = foldName(trimmed);
  const isExact = (result: SearchResult) => foldName(result.title) === folded;
  const hasExact = (list: readonly SearchResult[]) => list.some(isExact);
  const bestScore = (list: readonly SearchResult[]) =>
    list.reduce((best, result) => Math.max(best, result.score), -Infinity);

  const resultSections: PaletteSection[] = [...groups.entries()]
    .sort(
      ([kindA, listA], [kindB, listB]) =>
        Number(hasExact(listB)) - Number(hasExact(listA)) ||
        bestScore(listB) - bestScore(listA) ||
        KIND_ORDER.indexOf(kindA) - KIND_ORDER.indexOf(kindB),
    )
    .map(([kind, list]) => ({
      id: kind,
      label: KIND_LABELS[kind].group,
      options: [...list]
        .sort((a, b) => Number(isExact(b)) - Number(isExact(a)) || b.score - a.score)
        .map((result) => ({
          type: "result" as const,
          key: `${result.kind}:${result.id}`,
          result,
        })),
    }));

  if (resultSections.length === 0) return [searchAll];

  const strong = results.some(
    (result) => result.score >= STRONG_MATCH_SCORE || isExact(result),
  );
  return understood.length > 0 && !strong
    ? [searchAll, ...resultSections]
    : [...resultSections, searchAll];
}

/** Sections shown before anything is typed. */
export function buildIdleSections(recent: readonly string[]): PaletteSection[] {
  const sections: PaletteSection[] = [];
  if (recent.length > 0) {
    sections.push({
      id: "recent",
      label: "Recent searches",
      options: [
        ...recent.map((query) => ({
          type: "recent" as const,
          key: `recent:${query.toLowerCase()}`,
          query,
        })),
        // An option rather than a separate button: a listbox may only contain
        // options, and this keeps "clear" reachable with the arrow keys.
        { type: "clear-recent" as const, key: "clear-recent" as const },
      ],
    });
  }
  sections.push({
    id: "examples",
    label: "Describe what you are looking for",
    options: EXAMPLE_QUERIES.map((query) => ({
      type: "example" as const,
      key: `example:${query}`,
      query,
      href: carsSearchHref(query),
    })),
  });
  return sections;
}

export function flattenSections(sections: readonly PaletteSection[]): PaletteOption[] {
  return sections.flatMap((section) => section.options);
}

/** Moves an index through a list of `length`, wrapping at both ends. */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1;
  return (((current + delta) % length) + length) % length;
}

// ---------------------------------------------------------------- highlighting

/** Lower-cases and strips diacritics one character at a time, so indexes line up. */
function foldChar(char: string): string {
  return char.normalize("NFD").charAt(0).toLowerCase();
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

/**
 * Character ranges of `text` that match the words of `query`, for <mark>.
 *
 * A word matches at the start of a word in the text ("gt" in "911 GT3"); words
 * of four letters or more also match inside a word. Case and accents are
 * ignored ("coupe" marks "Coupé"). Fuzzy hits ("porche" → "Porsche") are left
 * unmarked rather than guessed at.
 */
export function highlightRanges(text: string, query: string): Array<[number, number]> {
  const folded = [...text].map(foldChar).join("");
  // Spread-and-join keeps one folded character per UTF-16 unit only for the
  // BMP; bail out on astral text (emoji) rather than mis-mark it.
  if (folded.length !== text.length) return [];

  const tokens = [
    ...new Set(
      [...query]
        .map(foldChar)
        .join("")
        .split(/[^\p{L}\p{N}]+/u)
        .filter((token) => token.length > 0),
    ),
  ];

  const ranges: Array<[number, number]> = [];
  for (const token of tokens) {
    let from = 0;
    while (from <= folded.length - token.length) {
      const at = folded.indexOf(token, from);
      if (at === -1) break;
      const wordStart = at === 0 || !WORD_CHAR.test(folded.charAt(at - 1));
      if (wordStart || token.length >= 4) ranges.push([at, at + token.length]);
      from = at + 1;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([range[0], range[1]]);
  }
  return merged;
}

export type TextPart = { text: string; match: boolean };

export function splitByRanges(text: string, ranges: Array<[number, number]>): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

// ------------------------------------------------------------ recent searches

/** Parses the stored list defensively: anything malformed reads as empty. */
export function parseRecentSearches(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return dedupe(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ).slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

/** Newest first, case-insensitively unique, capped. */
export function addRecentSearch(list: readonly string[], query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [...list];
  return dedupe([trimmed, ...list]).slice(0, MAX_RECENT_SEARCHES);
}

function dedupe(list: readonly string[]): string[] {
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ------------------------------------------------------------------ display

const FLAG = /^\p{Regional_Indicator}{2}$/u;

/**
 * The search RPC puts a country's flag emoji in its subtitle. The palette
 * shows the flag in the icon tile instead, so the subtitle line can say what
 * the row is.
 */
export function resultPresentation(result: SearchResult): {
  subtitle: string | null;
  flag: string | null;
} {
  const subtitle = result.subtitle?.trim() || null;
  if (result.kind === "country" && subtitle && FLAG.test(subtitle)) {
    return { subtitle: null, flag: subtitle };
  }
  return { subtitle, flag: null };
}
