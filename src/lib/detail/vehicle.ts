import type { VariantDetail } from "@/types/domain";
import { formatEnumLabel, formatYearRange } from "@/lib/format";
import { formatFigure, toFinite } from "./figures";

/**
 * Pure helpers behind the vehicle header: its identity line, key figures and
 * the links its actions point at. (The status badge uses the cards' own
 * lifecycleOf(), so the two can never disagree.)
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

/** The generation's name: the generation row first, the model's text column second. */
export function generationName(
  detail: Pick<VariantDetail, "generation" | "model">,
): string | null {
  return detail.generation?.name?.trim() || detail.model.generation?.trim() || null;
}

/**
 * "992 · 2021 – present · Coupe · Sports Car". Parts that are not recorded
 * are simply left out.
 */
export function identityLine(detail: VariantDetail): string[] {
  const body = formatEnumLabel(detail.model.body_type, "");
  const category = detail.category.name.trim();
  return [
    generationName(detail),
    detail.variant.year_start
      ? formatYearRange(detail.variant.year_start, detail.variant.year_end)
      : null,
    body || null,
    // "Coupe · Coupe" says nothing twice.
    category && category.toLowerCase() !== body.toLowerCase() ? category : null,
  ].filter((part): part is string => Boolean(part));
}

/**
 * A technical reference built from the URL slugs, e.g. "911-GT3 · 992". The
 * variant slug is dropped when it merely repeats the model's.
 */
export function vehicleCode(
  detail: Pick<VariantDetail, "model" | "variant" | "generation">,
): string {
  const model = detail.model.slug;
  const variant = detail.variant.slug;
  const core =
    variant === model || variant.startsWith(`${model}-`)
      ? variant
      : `${model}-${variant}`;
  return [core.toUpperCase(), generationName(detail)?.toUpperCase()]
    .filter(Boolean)
    .join(" · ");
}

/** The car's own path, which is also its compare key. */
export function carPath(
  detail: Pick<VariantDetail, "manufacturer" | "model" | "variant">,
): string {
  return `/cars/${detail.manufacturer.slug}/${detail.model.slug}/${detail.variant.slug}`;
}

/** /compare?car=porsche/911/gt3 — the compare page's documented URL shape. */
export function compareHref(
  detail: Pick<VariantDetail, "manufacturer" | "model" | "variant">,
): string {
  return `/compare?car=${[
    detail.manufacturer.slug,
    detail.model.slug,
    detail.variant.slug,
  ]
    .map(encodeURIComponent)
    .join("/")}`;
}

// ---------------------------------------------------------------------------
// Key figures
// ---------------------------------------------------------------------------

export type KeyFigure = {
  id: "power" | "torque" | "acceleration" | "topSpeed";
  label: string;
  /** Formatted number, or null when the figure is not published. */
  value: string | null;
  /** The raw number, for animation. */
  raw: number | null;
  decimals: number;
  unit: string;
};

export function keyFigures(performance: VariantDetail["performance"]): KeyFigure[] {
  const figure = (
    id: KeyFigure["id"],
    label: string,
    raw: number | null | undefined,
    unit: string,
    decimals = 0,
  ): KeyFigure => {
    const value = toFinite(raw);
    return {
      id,
      label,
      value: value === null ? null : formatFigure(value, decimals),
      raw: value,
      decimals,
      unit,
    };
  };
  return [
    figure("power", "Power", performance?.power_hp, "hp"),
    figure("torque", "Torque", performance?.torque_nm, "Nm"),
    figure("acceleration", "0–100 km/h", performance?.zero_to_100_s, "s", 1),
    figure("topSpeed", "Top speed", performance?.top_speed_kmh, "km/h"),
  ];
}
