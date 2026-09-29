import type { VariantDetail } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
import {
  formatEnumLabel,
  formatNumber,
  formatSeconds,
  formatWithUnit,
} from "@/lib/format";

/**
 * The cards of the feature showcase, built from a variant's own rows and
 * nothing else. Pure, so it runs on the server (the page) and is testable.
 *
 * Two kinds:
 *   feature    a row of `variant_features`: the feature's name and category,
 *              the note catalogued for THIS car (`detail`) and the feature's
 *              general description
 *   highlight  a published subsystem summary — engine, drivetrain,
 *              performance, electric drive, dimensions — made only of the
 *              figures the catalogue holds. A subsystem with no published
 *              figure at all produces no card.
 */
export type ShowcaseFigure = { label: string; value: string };

export type ShowcaseCard = {
  id: string;
  kind: "feature" | "highlight";
  /** Category or subsystem name, printed as the mono eyebrow. */
  eyebrow: string;
  title: string;
  /** One line shown while collapsed. Null when there is nothing to say. */
  summary: string | null;
  /** The longer text revealed on expand. Null when there is none. */
  detail: string | null;
  /** Published figures only. */
  figures: ShowcaseFigure[];
};

const present = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

function figuresOf(entries: (ShowcaseFigure | null)[]): ShowcaseFigure[] {
  return entries.filter((entry): entry is ShowcaseFigure => entry !== null);
}

function figure(
  label: string,
  value: number | null | undefined,
  unit: string,
): ShowcaseFigure | null {
  return present(value) ? { label, value: formatWithUnit(value, unit) } : null;
}

/** The published highlights, in reading order. */
export function highlightCards(detail: VariantDetail): ShowcaseCard[] {
  const { variant, engine, transmission, performance, ev, dimensions } = detail;
  const kind = powertrainKind(variant.fuel_type);
  const cards: ShowcaseCard[] = [];

  if (engine && kind !== "electric") {
    const figures = figuresOf([
      figure("Displacement", engine.displacement_cc, "cc"),
      present(engine.cylinders)
        ? { label: "Cylinders", value: formatNumber(engine.cylinders) }
        : null,
      engine.aspiration
        ? { label: "Aspiration", value: formatEnumLabel(engine.aspiration) }
        : null,
      figure("Redline", engine.redline_rpm, "rpm"),
      figure("Power", performance?.power_hp, "hp"),
      figure("Torque", performance?.torque_nm, "Nm"),
    ]);
    if (figures.length > 0) {
      cards.push({
        id: "highlight-engine",
        kind: "highlight",
        eyebrow: "Engine",
        title: engine.configuration ?? engine.name,
        summary: kind === "hybrid" ? "Combustion side of the hybrid system." : null,
        detail: engine.notes?.trim() || null,
        figures,
      });
    }
  }

  if (ev && kind !== "combustion") {
    const figures = figuresOf([
      figure("Battery", ev.battery_kwh, "kWh"),
      figure("Usable", ev.usable_battery_kwh, "kWh"),
      present(ev.range_km)
        ? {
            label: ev.range_standard
              ? `Range (${formatEnumLabel(ev.range_standard)})`
              : "Range",
            value: formatWithUnit(ev.range_km, "km"),
          }
        : null,
      figure("Max charge", ev.max_charge_kw, "kW"),
      figure("10–80 %", ev.charge_10_80_min, "min"),
      present(ev.motor_count)
        ? { label: "Motors", value: formatNumber(ev.motor_count) }
        : null,
    ]);
    if (figures.length > 0) {
      cards.push({
        id: "highlight-electric",
        kind: "highlight",
        eyebrow: kind === "electric" ? "Electric drive" : "Electric assist",
        title: kind === "electric" ? "Battery and motors" : "Hybrid system",
        summary: null,
        detail: ev.notes?.trim() || null,
        figures,
      });
    }
  }

  {
    const figures = figuresOf([
      variant.drive_type
        ? { label: "Drive", value: formatEnumLabel(variant.drive_type) }
        : null,
      transmission
        ? { label: "Transmission", value: formatEnumLabel(transmission.type) }
        : null,
      present(transmission?.gears)
        ? { label: "Gears", value: formatNumber(transmission.gears) }
        : null,
    ]);
    if (figures.length > 0) {
      cards.push({
        id: "highlight-drivetrain",
        kind: "highlight",
        eyebrow: "Drivetrain",
        title: transmission?.name ?? "Drivetrain",
        summary: null,
        detail: transmission?.notes?.trim() || null,
        figures,
      });
    }
  }

  if (performance) {
    const figures = figuresOf([
      present(performance.zero_to_100_s)
        ? { label: "0–100 km/h", value: formatSeconds(performance.zero_to_100_s) }
        : null,
      present(performance.zero_to_200_s)
        ? { label: "0–200 km/h", value: formatSeconds(performance.zero_to_200_s) }
        : null,
      figure("Top speed", performance.top_speed_kmh, "km/h"),
      present(performance.quarter_mile_s)
        ? { label: "Quarter mile", value: formatSeconds(performance.quarter_mile_s) }
        : null,
      figure("Braking 100–0", performance.braking_100_0_m, "m"),
    ]);
    if (figures.length > 0) {
      cards.push({
        id: "highlight-performance",
        kind: "highlight",
        eyebrow: "Performance",
        title: "Published performance",
        summary: performance.source ? `Source: ${performance.source}` : null,
        detail: performance.notes?.trim() || null,
        figures,
      });
    }
  }

  if (dimensions) {
    const figures = figuresOf([
      figure("Length", dimensions.length_mm, "mm"),
      figure("Width", dimensions.width_mm, "mm"),
      figure("Height", dimensions.height_mm, "mm"),
      figure("Wheelbase", dimensions.wheelbase_mm, "mm"),
      figure("Kerb weight", dimensions.kerb_weight_kg, "kg"),
      present(dimensions.seating_capacity)
        ? { label: "Seats", value: formatNumber(dimensions.seating_capacity) }
        : null,
    ]);
    if (figures.length > 0) {
      cards.push({
        id: "highlight-dimensions",
        kind: "highlight",
        eyebrow: "Dimensions",
        title: "Size and weight",
        summary: null,
        detail: dimensions.notes?.trim() || null,
        figures,
      });
    }
  }

  return cards;
}

/** One card per catalogued feature, in catalogue order. */
export function featureCards(features: VariantDetail["features"]): ShowcaseCard[] {
  return features.map(({ feature, detail }) => ({
    id: `feature-${feature.id}`,
    kind: "feature",
    eyebrow: feature.category?.trim() || "Feature",
    title: feature.name,
    summary: detail?.trim() || null,
    detail: feature.description?.trim() || null,
    figures: [],
  }));
}

/** Highlights first (the car's own numbers), then its catalogued features. */
export function buildShowcaseCards(detail: VariantDetail): ShowcaseCard[] {
  return [...highlightCards(detail), ...featureCards(detail.features)];
}
