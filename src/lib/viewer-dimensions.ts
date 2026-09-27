/**
 * The measurements the viewer can draw, from the variant's published
 * dimensions. A figure that is not published is simply not drawn — there is
 * no placeholder line with a guessed length.
 */

export const DIMENSION_IDS = [
  "length",
  "width",
  "height",
  "wheelbase",
  "groundClearance",
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export type PublishedDimensions = {
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  wheelbase_mm: number | null;
  ground_clearance_mm: number | null;
};

export const DIMENSION_LABELS: Record<DimensionId, string> = {
  length: "Length",
  width: "Width",
  height: "Height",
  wheelbase: "Wheelbase",
  groundClearance: "Ground clearance",
};

const FIELDS: Record<DimensionId, keyof PublishedDimensions> = {
  length: "length_mm",
  width: "width_mm",
  height: "height_mm",
  wheelbase: "wheelbase_mm",
  groundClearance: "ground_clearance_mm",
};

export type Measurement = { id: DimensionId; mm: number };

/** The published measurements, in drawing order; unknown ones are left out. */
export function publishedMeasurements(
  dimensions: PublishedDimensions | null | undefined,
): Measurement[] {
  if (!dimensions) return [];
  return DIMENSION_IDS.flatMap((id) => {
    const mm = dimensions[FIELDS[id]];
    return typeof mm === "number" && Number.isFinite(mm) && mm > 0 ? [{ id, mm }] : [];
  });
}
