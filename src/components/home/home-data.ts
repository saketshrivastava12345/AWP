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
