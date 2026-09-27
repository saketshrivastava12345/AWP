import type { BodyType, CatalogCar, ManufacturerSegment } from "@/types/domain";

/**
 * Pure helpers behind the manufacturer pages: monograms, grouping, the brand
 * page's tabs and its model line-up. No React and no server imports, so they
 * run in server components, client components and unit tests alike.
 */

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

/** Presentation order of manufacturer segments. */
export const SEGMENT_ORDER: readonly ManufacturerSegment[] = [
  "performance",
  "luxury",
  "ev",
  "mass",
  "commercial",
];

export const SEGMENT_LABELS: Record<ManufacturerSegment, string> = {
  performance: "Performance",
  luxury: "Luxury",
  ev: "Electric",
  mass: "Mass market",
  commercial: "Commercial",
};

export type SegmentFilter = ManufacturerSegment | "all";

/** "All" plus every segment that at least one maker belongs to, with counts. */
export function segmentOptions<T extends { segment: ManufacturerSegment }>(
  makers: readonly T[],
): { value: SegmentFilter; label: string; count: number }[] {
  const counts = new Map<ManufacturerSegment, number>();
  for (const maker of makers) {
    counts.set(maker.segment, (counts.get(maker.segment) ?? 0) + 1);
  }
  return [
    { value: "all", label: "All", count: makers.length },
    ...SEGMENT_ORDER.filter((segment) => counts.has(segment)).map((segment) => ({
      value: segment,
      label: SEGMENT_LABELS[segment],
      count: counts.get(segment) ?? 0,
    })),
  ];
}

// ---------------------------------------------------------------------------
// Monogram
// ---------------------------------------------------------------------------

/** Corporate words that say nothing about the marque ("Tata Motors" is a T). */
const GENERIC_WORDS = new Set([
  "motors",
  "motor",
  "cars",
  "car",
  "automobiles",
  "automobili",
  "automotive",
  "company",
  "co",
  "group",
  "ag",
  "gmbh",
  "spa",
  "ltd",
  "limited",
  "inc",
  "corp",
  "corporation",
]);

/**
 * A typographic monogram for a marque: its initials, never a drawn logo.
 *
 * Acronyms stay whole (BMW, BYD), hyphenated names give one letter per part
 * (Mercedes-Benz -> MB), an ampersand is kept (Mahindra & Mahindra -> M&M)
 * and generic corporate words are dropped. At most three letters.
 */
export function monogramOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (/^[A-Z0-9]{2,4}$/.test(trimmed)) return trimmed;

  const words = trimmed.split(/[\s\-–—]+/).filter(Boolean);
  let letters = 0;
  let out = "";
  words.forEach((word, index) => {
    if (letters >= 3) return;
    if (word === "&" || word === "+") {
      out += "&";
      return;
    }
    const bare = word.toLowerCase().replace(/[.,]/g, "");
    if (index > 0 && GENERIC_WORDS.has(bare)) return;
    const initial = Array.from(word).find((char) => /[\p{L}\p{N}]/u.test(char));
    if (!initial) return;
    out += initial.toLocaleUpperCase();
    letters += 1;
  });

  // A trailing ampersand ("Smith &") reads as a typo.
  out = out.replace(/&+$/, "");
  return out || (Array.from(trimmed)[0] ?? "?").toLocaleUpperCase();
}

// ---------------------------------------------------------------------------
// Grouping makers by country
// ---------------------------------------------------------------------------

type CountryRef = { name: string; slug: string; flag_emoji: string | null };

export type CountryGroup<T> = {
  slug: string;
  name: string;
  flag: string | null;
  makers: T[];
};

/** Makers grouped by country, countries A–Z and makers A–Z within each. */
export function groupByCountry<T extends { name: string; country: CountryRef | null }>(
  makers: readonly T[],
): CountryGroup<T>[] {
  const groups = new Map<string, CountryGroup<T>>();
  for (const maker of makers) {
    const key = maker.country?.slug ?? "unknown";
    let group = groups.get(key);
    if (!group) {
      group = {
        slug: key,
        name: maker.country?.name ?? "Country not recorded",
        flag: maker.country?.flag_emoji ?? null,
        makers: [],
      };
      groups.set(key, group);
    }
    group.makers.push(maker);
  }
  const collator = new Intl.Collator("en", { sensitivity: "base" });
  return [...groups.values()]
    .map((group) => ({
      ...group,
      makers: [...group.makers].sort((a, b) => collator.compare(a.name, b.name)),
    }))
    .sort((a, b) => {
      // A maker whose country is missing goes last rather than under "C".
      if (a.slug === "unknown") return 1;
      if (b.slug === "unknown") return -1;
      return collator.compare(a.name, b.name);
    });
}

// ---------------------------------------------------------------------------
// Brand page tabs
// ---------------------------------------------------------------------------

export type BrandTabId = "all" | "performance" | "ev" | "suv" | "sports";

type TabCar = Pick<CatalogCar, "category_slug" | "fuel_type" | "body_type">;

/** Catalogue categories that count as performance cars. */
export const PERFORMANCE_CATEGORIES: ReadonlySet<string> = new Set([
  "hypercar",
  "supercar",
  "sports-car",
]);

const TAB_DEFINITIONS: {
  id: BrandTabId;
  label: string;
  test: (car: TabCar) => boolean;
}[] = [
  { id: "all", label: "All", test: () => true },
  {
    id: "performance",
    label: "Performance",
    test: (car) => PERFORMANCE_CATEGORIES.has(car.category_slug ?? ""),
  },
  { id: "ev", label: "EV", test: (car) => car.fuel_type === "electric" },
  {
    id: "suv",
    label: "SUV",
    test: (car) => car.body_type === "suv" || car.body_type === "off_road",
  },
  {
    id: "sports",
    label: "Sports cars",
    test: (car) => car.category_slug === "sports-car",
  },
];

/**
 * The brand page's tabs, in a fixed order, keeping only those with at least
 * one car. A tab is never offered for a set the maker has no cars in.
 */
export function brandTabs<T extends TabCar>(
  cars: readonly T[],
): { id: BrandTabId; label: string; cars: T[] }[] {
  return TAB_DEFINITIONS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    cars: cars.filter(tab.test),
  })).filter((tab) => tab.cars.length > 0);
}

// ---------------------------------------------------------------------------
// Figures
// ---------------------------------------------------------------------------

/**
 * Lowest and highest published power across a set of cars. Cars that do not
 * publish a figure are ignored; null when none do.
 */
export function powerRange(
  cars: readonly { power_hp: number | null }[],
): { min: number; max: number; count: number } | null {
  const values = cars
    .map((car) => car.power_hp)
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values), count: values.length };
}

// ---------------------------------------------------------------------------
// Model line-up
// ---------------------------------------------------------------------------

/** A car_models row as the brand query returns it. */
export type LineupModelInput = {
  id: string;
  slug: string;
  name: string;
  /** Free-text generation code on the model (e.g. "992"). */
  generation: string | null;
  production_start: number | null;
  production_end: number | null;
  body_type: BodyType | null;
  category: { name: string; slug: string } | null;
  generations: {
    id: string;
    name: string;
    year_start: number | null;
    year_end: number | null;
  }[];
};

export type LineupCar = Pick<
  CatalogCar,
  | "variant_id"
  | "variant_name"
  | "model_id"
  | "model_slug"
  | "model_name"
  | "body_type"
  | "category_name"
  | "category_slug"
  | "generation"
  | "generation_id"
  | "generation_name"
  | "power_hp"
  | "year_start"
>;

export type LineupGeneration<T> = {
  key: string;
  /** Generation code, when one is recorded. */
  name: string | null;
  yearStart: number | null;
  yearEnd: number | null;
  /** True when the years are the model's production years, not the generation's own. */
  yearsFromModel: boolean;
  cars: T[];
};

export type LineupModel<T> = {
  id: string;
  slug: string;
  name: string;
  bodyType: BodyType | null;
  categoryName: string | null;
  categorySlug: string | null;
  generations: LineupGeneration<T>[];
  variantCount: number;
  /** Highest published power in the model, for ordering. */
  maxPower: number | null;
};

const byPowerThenName = <T extends LineupCar>(a: T, b: T) =>
  (b.power_hp ?? -1) - (a.power_hp ?? -1) ||
  (a.variant_name ?? "").localeCompare(b.variant_name ?? "");

/**
 * Groups a maker's published cars into its models and, within each model,
 * its generations. Only models with at least one published car appear, so a
 * model that exists only as a draft is never listed.
 *
 * The model rows are optional enrichment (production years, generation
 * years); without them the line-up is still built from the cars alone.
 */
export function buildLineup<T extends LineupCar>(
  models: readonly LineupModelInput[],
  cars: readonly T[],
): LineupModel<T>[] {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const lineup = new Map<
    string,
    LineupModel<T> & {
      source: LineupModelInput | undefined;
      byGeneration: Map<string, LineupGeneration<T>>;
    }
  >();

  for (const car of cars) {
    const key = car.model_id ?? car.model_slug;
    if (!key) continue;
    const source = car.model_id ? modelsById.get(car.model_id) : undefined;

    let entry = lineup.get(key);
    if (!entry) {
      entry = {
        id: key,
        slug: source?.slug ?? car.model_slug ?? key,
        name: source?.name ?? car.model_name ?? "Unnamed model",
        bodyType: source?.body_type ?? car.body_type ?? null,
        categoryName: source?.category?.name ?? car.category_name ?? null,
        categorySlug: source?.category?.slug ?? car.category_slug ?? null,
        generations: [],
        variantCount: 0,
        maxPower: null,
        source,
        byGeneration: new Map(),
      };
      lineup.set(key, entry);
    }

    const generationName =
      car.generation_name ?? car.generation ?? source?.generation ?? null;
    const generationKey = car.generation_id ?? `name:${generationName ?? ""}`;
    let generation = entry.byGeneration.get(generationKey);
    if (!generation) {
      const row = car.generation_id
        ? source?.generations.find((candidate) => candidate.id === car.generation_id)
        : undefined;
      generation = {
        key: generationKey,
        name: generationName,
        yearStart: row?.year_start ?? null,
        yearEnd: row?.year_end ?? null,
        yearsFromModel: false,
        cars: [],
      };
      entry.byGeneration.set(generationKey, generation);
    }
    generation.cars.push(car);
    entry.variantCount += 1;
    if (
      car.power_hp !== null &&
      (entry.maxPower === null || car.power_hp > entry.maxPower)
    ) {
      entry.maxPower = car.power_hp;
    }
  }

  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

  return [...lineup.values()]
    .map(({ source, byGeneration, ...model }) => {
      const generations = [...byGeneration.values()];
      // With a single generation and no dates of its own, the model's
      // production years describe it; they are flagged as such.
      const only = generations.length === 1 ? generations[0] : undefined;
      if (only && only.yearStart === null && source?.production_start != null) {
        only.yearStart = source.production_start;
        only.yearEnd = source.production_end;
        only.yearsFromModel = true;
      }
      for (const generation of generations) generation.cars.sort(byPowerThenName);
      generations.sort(
        (a, b) =>
          (b.yearStart ?? -Infinity) - (a.yearStart ?? -Infinity) ||
          collator.compare(a.name ?? "", b.name ?? ""),
      );
      return { ...model, generations };
    })
    .sort(
      (a, b) =>
        (b.maxPower ?? -1) - (a.maxPower ?? -1) || collator.compare(a.name, b.name),
    );
}

// ---------------------------------------------------------------------------
// Website
// ---------------------------------------------------------------------------

/**
 * The maker's website as a safe external link: only http(s) URLs are linked
 * (a stored "javascript:" value is dropped), labelled by host without "www.".
 */
export function websiteLink(
  value: string | null | undefined,
): { href: string; label: string } | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return { href: url.toString(), label: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}
