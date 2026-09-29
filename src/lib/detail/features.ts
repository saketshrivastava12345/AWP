import type { VariantDetail } from "@/types/domain";

/**
 * Which chapter of the car page each catalogued feature belongs to.
 *
 * `features.category` is free text. The categories in the catalogue today are
 * Aerodynamics, Braking, Chassis, Driver Assistance, Drivetrain, EV, Interior
 * and Lighting; matching is case- and space-insensitive. A category nobody has
 * mapped yet lands in "other" — shown, never dropped, and never guessed into
 * a chapter it may not belong to.
 */

export type FeatureChapterId =
  "technology" | "interior" | "aerodynamics" | "chassis" | "other";

export type FeatureEntry = VariantDetail["features"][number];

export const FEATURE_CHAPTERS: Record<
  FeatureChapterId,
  { title: string; description: string; categories: readonly string[] }
> = {
  technology: {
    title: "Technology",
    description:
      "Driver assistance, lighting and electric-drive systems catalogued for this car.",
    categories: ["driver assistance", "lighting", "ev"],
  },
  interior: {
    title: "Interior",
    description: "Cabin equipment catalogued for this car.",
    categories: ["interior"],
  },
  aerodynamics: {
    title: "Aerodynamics",
    description: "Aerodynamic devices catalogued for this car.",
    categories: ["aerodynamics"],
  },
  chassis: {
    title: "Chassis & Brakes",
    description: "Chassis, braking and drivetrain systems catalogued for this car.",
    categories: ["chassis", "braking", "drivetrain"],
  },
  other: {
    title: "Other Features",
    description: "Features catalogued for this car outside the chapters above.",
    categories: [],
  },
};

/** Display order when every group is rendered together. */
export const FEATURE_CHAPTER_ORDER: readonly FeatureChapterId[] = [
  "technology",
  "interior",
  "aerodynamics",
  "chassis",
  "other",
];

const normalise = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const CHAPTER_BY_CATEGORY = new Map<string, FeatureChapterId>(
  FEATURE_CHAPTER_ORDER.flatMap((id) =>
    FEATURE_CHAPTERS[id].categories.map((category) => [category, id] as const),
  ),
);

export function featureChapterOf(category: string | null | undefined): FeatureChapterId {
  if (!category) return "other";
  return CHAPTER_BY_CATEGORY.get(normalise(category)) ?? "other";
}

/**
 * Every chapter, each with its features (possibly none). Order within a
 * chapter follows the category order declared above, then the feature name.
 */
export function groupFeatures(
  features: readonly FeatureEntry[],
): Record<FeatureChapterId, FeatureEntry[]> {
  const groups: Record<FeatureChapterId, FeatureEntry[]> = {
    technology: [],
    interior: [],
    aerodynamics: [],
    chassis: [],
    other: [],
  };
  for (const entry of features) {
    groups[featureChapterOf(entry.feature.category)].push(entry);
  }

  for (const id of FEATURE_CHAPTER_ORDER) {
    const categories = FEATURE_CHAPTERS[id].categories;
    const rank = (entry: FeatureEntry) => {
      const index = categories.indexOf(normalise(entry.feature.category ?? ""));
      return index === -1 ? categories.length : index;
    };
    groups[id].sort(
      (a, b) => rank(a) - rank(b) || a.feature.name.localeCompare(b.feature.name),
    );
  }
  return groups;
}
