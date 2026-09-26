import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import type { FacetOption, FilterOptions } from "@/lib/facets";

export type { FacetOption, FilterOptions } from "@/lib/facets";

const EMPTY: FilterOptions = {
  countries: [],
  manufacturers: [],
  categories: [],
  bodyTypes: [],
  transmissionTypes: [],
  engineLayouts: [],
  cylinders: [],
  ranges: { power: null, speed: null, year: null },
};

/** Enum values that read better with a specific label than a generic one. */
const BODY_LABELS: Record<string, string> = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  coupe: "Coupé",
  convertible: "Convertible",
  roadster: "Roadster",
  suv: "SUV",
  wagon: "Wagon",
  mpv: "MPV",
  pickup: "Pickup",
  off_road: "Off-Road",
};

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: "Manual",
  automatic: "Automatic",
  dct: "Dual-Clutch",
  amt: "AMT",
  cvt: "CVT",
  single_speed: "Single-Speed",
};

const LAYOUT_LABELS: Record<string, string> = {
  inline: "Inline",
  vee: "V",
  flat: "Flat",
  w: "W",
  rotary: "Rotary",
};

type FacetRow = {
  country_slug: string | null;
  country_name: string | null;
  manufacturer_slug: string | null;
  manufacturer_name: string | null;
  category_slug: string | null;
  category_name: string | null;
  body_type: string | null;
  transmission_type: string | null;
  engine_layout: string | null;
  engine_cylinders: number | null;
  power_hp: number | null;
  top_speed_kmh: number | null;
  year_start: number | null;
};

function tally(
  rows: FacetRow[],
  valueKey: keyof FacetRow,
  labelKey: keyof FacetRow,
): FacetOption[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    const value = row[valueKey];
    if (typeof value !== "string" || value === "") continue;
    const rawLabel = row[labelKey];
    const label = typeof rawLabel === "string" ? rawLabel : value;
    const existing = counts.get(value);
    if (existing) existing.count += 1;
    else counts.set(value, { label, count: 1 });
  }
  return [...counts.entries()]
    .map(([value, entry]) => ({ value, label: entry.label, count: entry.count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function tallyEnum(
  rows: FacetRow[],
  key: keyof FacetRow,
  labels: Record<string, string>,
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = row[key];
    if (typeof value !== "string" || value === "") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: labels[value] ?? value, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function range(values: (number | null)[]): [number, number] | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return [Math.min(...present), Math.max(...present)];
}

/**
 * Facet options built from the catalogue itself.
 *
 * Derived from the data rather than hardcoded, so a filter is never offered
 * for a value no car actually has — and the range sliders bound themselves to
 * figures that exist. The catalogue is small (54 variants), so one pass over
 * the whole view is cheaper than seven aggregate queries.
 */
export async function getFilterOptions(): Promise<FilterOptions> {
  if (!isConfigured()) return EMPTY;

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_catalog")
      .select(
        "country_slug,country_name,manufacturer_slug,manufacturer_name," +
          "category_slug,category_name,body_type,transmission_type," +
          "engine_layout,engine_cylinders,power_hp,top_speed_kmh,year_start",
      )
      .returns<FacetRow[]>();

    if (error) {
      console.error("getFilterOptions failed:", error.message);
      return EMPTY;
    }

    const rows = data ?? [];

    const cylinderCounts = new Map<number, number>();
    for (const row of rows) {
      if (row.engine_cylinders === null) continue;
      cylinderCounts.set(
        row.engine_cylinders,
        (cylinderCounts.get(row.engine_cylinders) ?? 0) + 1,
      );
    }

    return {
      countries: tally(rows, "country_slug", "country_name"),
      manufacturers: tally(rows, "manufacturer_slug", "manufacturer_name"),
      categories: tally(rows, "category_slug", "category_name"),
      bodyTypes: tallyEnum(rows, "body_type", BODY_LABELS),
      transmissionTypes: tallyEnum(rows, "transmission_type", TRANSMISSION_LABELS),
      engineLayouts: tallyEnum(rows, "engine_layout", LAYOUT_LABELS),
      cylinders: [...cylinderCounts.entries()]
        .sort(([a], [b]) => a - b)
        .map(([value, count]) => ({
          value: String(value),
          label: `${value} cylinders`,
          count,
        })),
      ranges: {
        power: range(rows.map((row) => row.power_hp)),
        speed: range(rows.map((row) => row.top_speed_kmh)),
        year: range(rows.map((row) => row.year_start)),
      },
    };
  } catch (error) {
    console.error("getFilterOptions threw:", error);
    return EMPTY;
  }
}
