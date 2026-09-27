import type { BodyType, FuelType } from "@/types/domain";

/**
 * The home page's selection rules, kept pure so they can be tested and so
 * the page can state them in words a visitor can check.
 */

/** The four published dimensions the 3D car is built from. */
export type HeroDimensions = {
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  wheelbase_mm: number | null;
};

export type DimensionRow = HeroDimensions & { variant_id: string };

export function hasCompleteDimensions(row: HeroDimensions | null | undefined): boolean {
  if (!row) return false;
  return [row.length_mm, row.width_mm, row.height_mm, row.wheelbase_mm].every(
    (value) => typeof value === "number" && Number.isFinite(value) && value > 0,
  );
}

/**
 * The car on the hero stage: the first featured car (featured cars are
 * ordered by published output) whose length, width, height and wheelbase are
 * all published, so the 3D car is drawn at its real size. If none has all
 * four, the first featured car is used and the scene fills the gaps with its
 * body style's typical proportions — `complete: false` says so.
 */
export function pickHeroCandidate<T extends { variant_id: string | null }>(
  featured: readonly T[],
  dimensions: readonly DimensionRow[],
): { car: T; complete: boolean } | null {
  const byId = new Map(dimensions.map((row) => [row.variant_id, row]));
  const eligible = featured.filter((car) => car.variant_id !== null);
  const complete = eligible.find((car) =>
    hasCompleteDimensions(byId.get(car.variant_id as string)),
  );
  if (complete) return { car: complete, complete: true };
  const first = eligible[0];
  return first ? { car: first, complete: false } : null;
}

/** Makers for the strip: those with published cars, most catalogued first. */
export function stripOrder<T extends { name: string; variant_count: number }>(
  makers: readonly T[],
): T[] {
  const collator = new Intl.Collator("en", { sensitivity: "base" });
  return makers
    .filter((maker) => maker.variant_count > 0)
    .sort(
      (a, b) => b.variant_count - a.variant_count || collator.compare(a.name, b.name),
    );
}

/** Parts recorded against the most published cars, for the encyclopedia teaser. */
export function mostRecorded<T extends { name: string; usageCount: number }>(
  parts: readonly T[],
  limit: number,
): T[] {
  const collator = new Intl.Collator("en", { sensitivity: "base" });
  return parts
    .filter((part) => part.usageCount > 0)
    .sort((a, b) => b.usageCount - a.usageCount || collator.compare(a.name, b.name))
    .slice(0, limit);
}

/** "4,885 × 2,030 × 1,210 mm", or null unless all three are published. */
export function footprintLabel(
  dimensions: HeroDimensions,
  format: (value: number) => string,
): string | null {
  const { length_mm: l, width_mm: w, height_mm: h } = dimensions;
  if (l === null || w === null || h === null) return null;
  return `${format(l)} × ${format(w)} × ${format(h)} mm`;
}

// ---------------------------------------------------------------------------
// Shop by segment
// ---------------------------------------------------------------------------

/** A way into the collection by kind of car: one /cars filter. */
export type SegmentRule = {
  /** The /cars search param, as the filter rail writes it. */
  param: "category" | "body" | "fuel";
  value: string;
  label: string;
};

/**
 * The segments the home page offers, in order. A rule is a question, not a
 * claim: a segment the catalogue has no car for is simply not shown.
 */
export const SEGMENT_RULES: readonly SegmentRule[] = [
  { param: "category", value: "sports-car", label: "Sports cars" },
  { param: "category", value: "supercar", label: "Supercars" },
  { param: "category", value: "hypercar", label: "Hypercars" },
  { param: "fuel", value: "electric", label: "Electric" },
  { param: "body", value: "suv", label: "SUVs" },
  { param: "fuel", value: "phev", label: "Plug-in hybrids" },
];

/** The facet columns a segment reads from a catalogue row. */
export type SegmentRow = {
  category_slug: string | null;
  body_type: BodyType | null;
  fuel_type: FuelType | null;
};

/** A catalogued photograph, with the columns needed to place it in a segment. */
export type SegmentPhotoRow = SegmentRow & { name: string; image_url: string };

export type HomeSegment = {
  label: string;
  href: string;
  /** Cars the link will list: the same count the /cars filter rail shows. */
  count: number;
  /** The body style most of its cars share, for the drawing. */
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  /** A real photograph of one of its cars, or null (the tile shows a drawing). */
  photo: { url: string; name: string } | null;
};

const SEGMENT_COLUMN = {
  category: "category_slug",
  body: "body_type",
  fuel: "fuel_type",
} as const satisfies Record<SegmentRule["param"], keyof SegmentRow>;

/** The most common non-null value, ties broken alphabetically. */
function mostCommon<T extends string>(values: readonly (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: [T, number] | null = null;
  for (const entry of counts) {
    if (!best || entry[1] > best[1] || (entry[1] === best[1] && entry[0] < best[0])) {
      best = entry;
    }
  }
  return best ? best[0] : null;
}

/**
 * The segment tiles: every rule with at least one car, counted over the same
 * facet rows /cars counts (so "8 cars" on the tile is what the link lists).
 * `photos` should be ordered by preference (most powerful first); each tile
 * takes the first photograph of one of its cars that no earlier tile used.
 */
export function pickSegments(
  rows: readonly SegmentRow[],
  photos: readonly SegmentPhotoRow[],
  rules: readonly SegmentRule[] = SEGMENT_RULES,
): HomeSegment[] {
  const used = new Set<string>();
  const segments: HomeSegment[] = [];

  for (const rule of rules) {
    const column = SEGMENT_COLUMN[rule.param];
    const members = rows.filter((row) => row[column] === rule.value);
    if (members.length === 0) continue;

    const photo = photos.find(
      (candidate) => candidate[column] === rule.value && !used.has(candidate.image_url),
    );
    if (photo) used.add(photo.image_url);

    segments.push({
      label: rule.label,
      href: `/cars?${rule.param}=${encodeURIComponent(rule.value)}`,
      count: members.length,
      bodyType: mostCommon(members.map((row) => row.body_type)),
      fuelType: mostCommon(members.map((row) => row.fuel_type)),
      photo: photo ? { url: photo.image_url, name: photo.name } : null,
    });
  }
  return segments;
}
