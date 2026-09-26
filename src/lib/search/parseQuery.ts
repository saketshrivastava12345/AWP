import type { CarFilters } from "@/lib/car-query";

/**
 * A rule-based natural-language query parser.
 *
 * Deliberately not an AI call: the vocabulary of car search is small and
 * closed (nationalities, categories, powertrains, engine layouts, numeric
 * comparisons), so a set of ordered rules is faster, free, offline, and
 * completely predictable — which also makes it testable.
 *
 * The strategy is consume-and-blank: each rule matches against the remaining
 * text and blanks what it claimed, so a later rule cannot re-read the same
 * words. Whatever survives becomes a full-text search term rather than being
 * discarded, so "porsche german supercars" still searches for "porsche".
 */

export type MatchKind =
  | "country"
  | "category"
  | "fuel"
  | "drive"
  | "engine"
  | "cylinders"
  | "aspiration"
  | "body"
  | "transmission"
  | "power"
  | "speed"
  | "year"
  | "text";

export type QueryMatch = {
  kind: MatchKind;
  /** What the user typed that triggered this. */
  token: string;
  /** How it will be applied, for the "understood as" chips. */
  label: string;
};

export type ParsedQuery = {
  filters: CarFilters;
  /** Words no rule claimed, passed to full-text search. */
  text: string | undefined;
  matches: QueryMatch[];
};

/** Longest phrases first, so "sports car" wins over "car". */
type Lexicon = {
  pattern: RegExp;
  apply: (filters: CarFilters) => void;
  kind: MatchKind;
  label: string;
};

const COUNTRY_WORDS: Record<string, { slug: string; label: string }> = {
  german: { slug: "germany", label: "Germany" },
  germany: { slug: "germany", label: "Germany" },
  italian: { slug: "italy", label: "Italy" },
  italy: { slug: "italy", label: "Italy" },
  japanese: { slug: "japan", label: "Japan" },
  japan: { slug: "japan", label: "Japan" },
  american: { slug: "united-states", label: "United States" },
  america: { slug: "united-states", label: "United States" },
  usa: { slug: "united-states", label: "United States" },
  british: { slug: "united-kingdom", label: "United Kingdom" },
  britain: { slug: "united-kingdom", label: "United Kingdom" },
  english: { slug: "united-kingdom", label: "United Kingdom" },
  uk: { slug: "united-kingdom", label: "United Kingdom" },
  french: { slug: "france", label: "France" },
  france: { slug: "france", label: "France" },
  korean: { slug: "south-korea", label: "South Korea" },
  korea: { slug: "south-korea", label: "South Korea" },
  swedish: { slug: "sweden", label: "Sweden" },
  sweden: { slug: "sweden", label: "Sweden" },
  chinese: { slug: "china", label: "China" },
  china: { slug: "china", label: "China" },
  indian: { slug: "india", label: "India" },
  india: { slug: "india", label: "India" },
};

const CATEGORY_WORDS: Record<string, { slug: string; label: string }> = {
  hypercar: { slug: "hypercar", label: "Hypercar" },
  hypercars: { slug: "hypercar", label: "Hypercar" },
  supercar: { slug: "supercar", label: "Supercar" },
  supercars: { slug: "supercar", label: "Supercar" },
  "sports car": { slug: "sports-car", label: "Sports Car" },
  "sports cars": { slug: "sports-car", label: "Sports Car" },
  sportscar: { slug: "sports-car", label: "Sports Car" },
  sportscars: { slug: "sports-car", label: "Sports Car" },
};

const BODY_WORDS: Record<string, { value: string; label: string }> = {
  sedan: { value: "sedan", label: "Sedan" },
  sedans: { value: "sedan", label: "Sedan" },
  saloon: { value: "sedan", label: "Sedan" },
  coupe: { value: "coupe", label: "Coupé" },
  coupes: { value: "coupe", label: "Coupé" },
  convertible: { value: "convertible", label: "Convertible" },
  convertibles: { value: "convertible", label: "Convertible" },
  roadster: { value: "roadster", label: "Roadster" },
  suv: { value: "suv", label: "SUV" },
  suvs: { value: "suv", label: "SUV" },
  hatchback: { value: "hatchback", label: "Hatchback" },
  hatchbacks: { value: "hatchback", label: "Hatchback" },
  hatch: { value: "hatchback", label: "Hatchback" },
  wagon: { value: "wagon", label: "Wagon" },
  wagons: { value: "wagon", label: "Wagon" },
  estate: { value: "wagon", label: "Wagon" },
  mpv: { value: "mpv", label: "MPV" },
  pickup: { value: "pickup", label: "Pickup" },
  pickups: { value: "pickup", label: "Pickup" },
  truck: { value: "pickup", label: "Pickup" },
  "off road": { value: "off_road", label: "Off-Road" },
  "off-road": { value: "off_road", label: "Off-Road" },
  offroad: { value: "off_road", label: "Off-Road" },
};

const FUEL_WORDS: Record<string, { value: string; label: string }> = {
  "plug-in hybrid": { value: "phev", label: "Plug-in Hybrid" },
  "plug in hybrid": { value: "phev", label: "Plug-in Hybrid" },
  phev: { value: "phev", label: "Plug-in Hybrid" },
  hybrid: { value: "hybrid", label: "Hybrid" },
  hybrids: { value: "hybrid", label: "Hybrid" },
  electric: { value: "electric", label: "Electric" },
  ev: { value: "electric", label: "Electric" },
  evs: { value: "electric", label: "Electric" },
  "battery electric": { value: "electric", label: "Electric" },
  petrol: { value: "petrol", label: "Petrol" },
  gasoline: { value: "petrol", label: "Petrol" },
  gas: { value: "petrol", label: "Petrol" },
  diesel: { value: "diesel", label: "Diesel" },
  hydrogen: { value: "hydrogen", label: "Hydrogen" },
};

const DRIVE_WORDS: Record<string, { value: string; label: string }> = {
  "all wheel drive": { value: "awd", label: "All-Wheel Drive" },
  "all-wheel drive": { value: "awd", label: "All-Wheel Drive" },
  awd: { value: "awd", label: "All-Wheel Drive" },
  "four wheel drive": { value: "4wd", label: "Four-Wheel Drive" },
  "four-wheel drive": { value: "4wd", label: "Four-Wheel Drive" },
  "4wd": { value: "4wd", label: "Four-Wheel Drive" },
  "4x4": { value: "4wd", label: "Four-Wheel Drive" },
  "rear wheel drive": { value: "rwd", label: "Rear-Wheel Drive" },
  "rear-wheel drive": { value: "rwd", label: "Rear-Wheel Drive" },
  rwd: { value: "rwd", label: "Rear-Wheel Drive" },
  "front wheel drive": { value: "fwd", label: "Front-Wheel Drive" },
  "front-wheel drive": { value: "fwd", label: "Front-Wheel Drive" },
  fwd: { value: "fwd", label: "Front-Wheel Drive" },
};

const TRANSMISSION_WORDS: Record<string, { value: string; label: string }> = {
  manual: { value: "manual", label: "Manual" },
  "dual clutch": { value: "dct", label: "Dual-Clutch" },
  "dual-clutch": { value: "dct", label: "Dual-Clutch" },
  dct: { value: "dct", label: "Dual-Clutch" },
  automatic: { value: "automatic", label: "Automatic" },
  cvt: { value: "cvt", label: "CVT" },
};

const ASPIRATION_WORDS: Record<string, { values: string[]; label: string }> = {
  "twin turbo": { values: ["twin_turbo"], label: "Twin-Turbo" },
  "twin-turbo": { values: ["twin_turbo"], label: "Twin-Turbo" },
  biturbo: { values: ["twin_turbo"], label: "Twin-Turbo" },
  supercharged: { values: ["supercharged"], label: "Supercharged" },
  supercharger: { values: ["supercharged"], label: "Supercharged" },
  // "turbo" covers both single and twin unless twin was matched first.
  turbocharged: { values: ["turbocharged", "twin_turbo"], label: "Turbocharged" },
  turbo: { values: ["turbocharged", "twin_turbo"], label: "Turbocharged" },
  "naturally aspirated": {
    values: ["naturally_aspirated"],
    label: "Naturally Aspirated",
  },
  na: { values: ["naturally_aspirated"], label: "Naturally Aspirated" },
};

const WORD_NUMBERS: Record<string, number> = {
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  eight: 8,
  ten: 10,
  twelve: 12,
};

/** Escape a lexicon key so it can be embedded in a regex. */
function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build word-boundary patterns, longest key first. */
function buildRules<T>(
  table: Record<string, T>,
  kind: MatchKind,
  apply: (filters: CarFilters, entry: T) => void,
  labelOf: (entry: T) => string,
): Lexicon[] {
  return Object.keys(table)
    .sort((a, b) => b.length - a.length)
    .map((key) => {
      const entry = table[key] as T;
      return {
        kind,
        label: labelOf(entry),
        pattern: new RegExp(`\\b${escape(key)}\\b`, "i"),
        apply: (filters: CarFilters) => apply(filters, entry),
      };
    });
}

function push<T>(list: T[] | undefined, value: T): T[] {
  const next = list ?? [];
  return next.includes(value) ? next : [...next, value];
}

export function parseQuery(input: string): ParsedQuery {
  const filters: CarFilters = {};
  const matches: QueryMatch[] = [];

  if (!input || !input.trim()) {
    return { filters, text: undefined, matches };
  }

  // Normalise separators but keep hyphens, which several rules depend on.
  let remaining = ` ${input.toLowerCase().replace(/\s+/g, " ").trim()} `;

  const claim = (pattern: RegExp, kind: MatchKind, label: string) => {
    const match = pattern.exec(remaining);
    if (!match) return null;
    matches.push({ kind, token: match[0].trim(), label });
    remaining = remaining.replace(pattern, " ");
    return match;
  };

  // ---------------------------------------------------------------- numbers
  // Comparisons run first: they consume a unit word ("hp", "km/h") that a
  // later rule might otherwise claim.

  const NUMBER = "(\\d[\\d,]*(?:\\.\\d+)?)";
  const LESS = "(?:under|below|less than|up to|max|<)";
  const MORE = "(?:over|above|more than|at least|min|>)";
  const POWER_UNIT = "(?:hp|bhp|ps|horsepower)";
  const SPEED_UNIT = "(?:km\\/h|kmh|kph|kmph)";

  const toNumber = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    const value = Number.parseFloat(raw.replace(/,/g, ""));
    return Number.isFinite(value) ? value : undefined;
  };

  // "under 500 hp" / "less than 500hp"
  let m = claim(
    new RegExp(`${LESS}\\s*${NUMBER}\\s*${POWER_UNIT}`, "i"),
    "power",
    "power below",
  );
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.powerMax = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `Under ${value} hp`;
    }
  }

  m = claim(
    new RegExp(`${MORE}\\s*${NUMBER}\\s*${POWER_UNIT}`, "i"),
    "power",
    "power above",
  );
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.powerMin = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `Over ${value} hp`;
    }
  }

  m = claim(
    new RegExp(`${LESS}\\s*${NUMBER}\\s*${SPEED_UNIT}`, "i"),
    "speed",
    "speed below",
  );
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.speedMax = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `Under ${value} km/h`;
    }
  }

  m = claim(
    new RegExp(`${MORE}\\s*${NUMBER}\\s*${SPEED_UNIT}`, "i"),
    "speed",
    "speed above",
  );
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.speedMin = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `Over ${value} km/h`;
    }
  }

  // A bare "above 300" with no unit is ambiguous; treat three-digit-plus
  // values as speed only when km/h context is absent but "speed" is named.
  m = claim(
    new RegExp(`${MORE}\\s*${NUMBER}\\s*(?:top speed|speed)`, "i"),
    "speed",
    "speed above",
  );
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) filters.speedMin = value;
  }

  // "after 2020" / "since 2020" / "from 2020"
  m = claim(/\b(?:after|since|from|newer than)\s*(\d{4})\b/i, "year", "year from");
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.yearMin = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `From ${value}`;
    }
  }

  m = claim(/\b(?:before|until|older than)\s*(\d{4})\b/i, "year", "year to");
  if (m) {
    const value = toNumber(m[1]);
    if (value !== undefined) {
      filters.yearMax = value;
      const last = matches[matches.length - 1];
      if (last) last.label = `Before ${value}`;
    }
  }

  // ---------------------------------------------------------------- engines
  // "v8" / "v-12"
  m = claim(/\bv[- ]?(6|8|10|12|16)\b/i, "engine", "V engine");
  if (m) {
    const cylinders = toNumber(m[1]);
    filters.engineLayout = push(filters.engineLayout, "vee" as never);
    if (cylinders !== undefined) filters.cylinders = push(filters.cylinders, cylinders);
    const last = matches[matches.length - 1];
    if (last) last.label = `V${cylinders}`;
  }

  // "flat-6" / "boxer six"
  m = claim(/\b(?:flat|boxer)[- ]?(4|6|12|four|six|twelve)\b/i, "engine", "Flat engine");
  if (m) {
    const raw = m[1] ?? "";
    const cylinders = WORD_NUMBERS[raw] ?? toNumber(raw);
    filters.engineLayout = push(filters.engineLayout, "flat" as never);
    if (cylinders !== undefined) filters.cylinders = push(filters.cylinders, cylinders);
    const last = matches[matches.length - 1];
    if (last) last.label = `Flat-${cylinders}`;
  }

  // "inline-4" / "straight six" / "i6"
  m = claim(
    /\b(?:inline|straight|i)[- ]?(3|4|5|6|three|four|five|six)\b/i,
    "engine",
    "Inline engine",
  );
  if (m) {
    const raw = m[1] ?? "";
    const cylinders = WORD_NUMBERS[raw] ?? toNumber(raw);
    filters.engineLayout = push(filters.engineLayout, "inline" as never);
    if (cylinders !== undefined) filters.cylinders = push(filters.cylinders, cylinders);
    const last = matches[matches.length - 1];
    if (last) last.label = `Inline-${cylinders}`;
  }

  // "4-cylinder" / "six cylinder"
  m = claim(
    /\b(3|4|5|6|8|10|12|three|four|five|six|eight|ten|twelve)[- ]?cylinders?\b/i,
    "cylinders",
    "cylinders",
  );
  if (m) {
    const raw = m[1] ?? "";
    const cylinders = WORD_NUMBERS[raw] ?? toNumber(raw);
    if (cylinders !== undefined) {
      filters.cylinders = push(filters.cylinders, cylinders);
      const last = matches[matches.length - 1];
      if (last) last.label = `${cylinders} cylinders`;
    }
  }

  m = claim(/\brotary\b/i, "engine", "Rotary");
  if (m) filters.engineLayout = push(filters.engineLayout, "rotary" as never);

  // --------------------------------------------------------------- lexicons
  const lexicons: Lexicon[] = [
    ...buildRules(
      ASPIRATION_WORDS,
      "aspiration",
      (f, e) => {
        for (const value of e.values) f.aspiration = push(f.aspiration, value as never);
      },
      (e) => e.label,
    ),
    ...buildRules(
      DRIVE_WORDS,
      "drive",
      (f, e) => {
        f.drive = push(f.drive, e.value as never);
      },
      (e) => e.label,
    ),
    ...buildRules(
      FUEL_WORDS,
      "fuel",
      (f, e) => {
        f.fuel = push(f.fuel, e.value as never);
      },
      (e) => e.label,
    ),
    ...buildRules(
      CATEGORY_WORDS,
      "category",
      (f, e) => {
        f.category = push(f.category, e.slug);
      },
      (e) => e.label,
    ),
    ...buildRules(
      BODY_WORDS,
      "body",
      (f, e) => {
        f.body = push(f.body, e.value as never);
      },
      (e) => e.label,
    ),
    ...buildRules(
      TRANSMISSION_WORDS,
      "transmission",
      (f, e) => {
        f.transmission = push(f.transmission, e.value as never);
      },
      (e) => e.label,
    ),
    ...buildRules(
      COUNTRY_WORDS,
      "country",
      (f, e) => {
        f.country = push(f.country, e.slug);
      },
      (e) => e.label,
    ),
  ];

  for (const rule of lexicons) {
    if (claim(rule.pattern, rule.kind, rule.label)) rule.apply(filters);
  }

  // ------------------------------------------------------------- leftovers
  // Filler words carry no meaning on their own and would only pollute the
  // full-text query.
  const STOP_WORDS = new Set([
    "car",
    "cars",
    "with",
    "and",
    "the",
    "a",
    "an",
    "of",
    "in",
    "for",
    "me",
    "show",
    "find",
    "all",
    "any",
    "that",
    "is",
    "are",
    "engine",
    "engines",
    "drive",
    "speed",
    "top",
  ]);

  const leftover = remaining
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word))
    .join(" ")
    .trim();

  if (leftover) {
    matches.push({ kind: "text", token: leftover, label: `Text: “${leftover}”` });
  }

  return { filters, text: leftover || undefined, matches };
}
