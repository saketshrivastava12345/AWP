import type { SpecRow } from "@/components/cars/SpecSection";
import type { VariantDetail } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
import {
  formatEnumLabel,
  formatNumber,
  formatPrice,
  formatSeconds,
  formatYearRange,
} from "@/lib/format";

export type SpecSectionSpec = {
  id: string;
  title: string;
  rows: SpecRow[];
  note?: string | null;
};

/** `formatNumber` and friends return "Not available"; sections want null. */
function orNull(
  value: number | null | undefined,
  format: (v: number) => string,
): string | null {
  return value === null || value === undefined ? null : format(value);
}

function text(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}

/**
 * Build the specification sections for a variant.
 *
 * The powertrain sections are chosen from `fuel_type`, not from which spec
 * rows happen to exist. That is the difference between an electric car showing
 * "Engine — Not available" (wrong: it has no engine, and never will) and
 * showing its motor, battery and charging figures instead.
 *
 *   combustion  -> Engine, Fuel
 *   electric    -> Electric Drivetrain, Charging & Range   (no Engine section)
 *   hybrid/phev -> Engine, Electric Assist, Fuel, Charging & Range
 */
export function buildSpecSections(detail: VariantDetail): SpecSectionSpec[] {
  const { variant, model, manufacturer, country, category, engine, transmission } =
    detail;
  const { performance, dimensions, fuel, ev } = detail;
  const kind = powertrainKind(variant.fuel_type);

  const sections: SpecSectionSpec[] = [];

  // ---------------------------------------------------------------- Overview
  sections.push({
    id: "overview",
    title: "Overview",
    rows: [
      { label: "Manufacturer", value: manufacturer.name },
      { label: "Model", value: model.name },
      { label: "Variant", value: variant.name },
      { label: "Generation", value: text(model.generation) },
      { label: "Country of origin", value: country.name },
      { label: "Category", value: category.name },
      { label: "Body type", value: formatEnumLabel(model.body_type, "") || null },
      {
        label: "Production",
        value: formatYearRange(variant.year_start, variant.year_end),
      },
      {
        label: "Starting price",
        value:
          variant.base_price === null
            ? null
            : formatPrice(variant.base_price, variant.price_currency),
        hint: "Indicative launch price in the market shown. Never converted between currencies.",
      },
    ],
    note: text(variant.notes),
  });

  // ------------------------------------------------------------- Performance
  sections.push({
    id: "performance",
    title: "Performance",
    rows: [
      {
        label: "Power",
        value: orNull(performance?.power_hp, (v) => `${formatNumber(v)} hp`),
        hint: text(performance?.source),
      },
      {
        label: "Power at",
        value: orNull(performance?.power_rpm, (v) => `${formatNumber(v)} rpm`),
      },
      {
        label: "Torque",
        value: orNull(performance?.torque_nm, (v) => `${formatNumber(v)} Nm`),
      },
      {
        label: "Torque at",
        value: orNull(performance?.torque_rpm, (v) => `${formatNumber(v)} rpm`),
      },
      {
        label: "Top speed",
        value: orNull(performance?.top_speed_kmh, (v) => `${formatNumber(v)} km/h`),
      },
      {
        label: "0–100 km/h",
        value: orNull(performance?.zero_to_100_s, (v) => formatSeconds(v)),
      },
      {
        label: "0–200 km/h",
        value: orNull(performance?.zero_to_200_s, (v) => formatSeconds(v)),
      },
      {
        label: "Quarter mile",
        value: orNull(performance?.quarter_mile_s, (v) => formatSeconds(v)),
      },
      {
        label: "Braking 100–0",
        value: orNull(performance?.braking_100_0_m, (v) => `${v} m`),
      },
      {
        label: "Power-to-weight",
        value:
          performance?.power_hp && dimensions?.kerb_weight_kg
            ? `${((performance.power_hp * 1000) / dimensions.kerb_weight_kg).toFixed(1)} hp/t`
            : null,
        hint: "Computed from power and kerb weight. Absent where the manufacturer publishes dry weight instead.",
      },
    ],
    note: text(performance?.notes),
  });

  // ------------------------------------------- Engine (combustion + hybrid)
  if (kind !== "electric") {
    sections.push({
      id: "engine",
      title: "Engine",
      rows: [
        { label: "Engine", value: text(engine?.name) },
        { label: "Configuration", value: text(engine?.configuration) },
        { label: "Cylinders", value: orNull(engine?.cylinders, (v) => String(v)) },
        {
          label: "Displacement",
          value: orNull(engine?.displacement_cc, (v) => `${formatNumber(v)} cc`),
        },
        { label: "Aspiration", value: formatEnumLabel(engine?.aspiration, "") || null },
        { label: "Fuel system", value: text(engine?.fuel_system) },
        {
          label: "Compression ratio",
          value: orNull(engine?.compression_ratio, (v) => `${v}:1`),
        },
        {
          label: "Redline",
          value: orNull(engine?.redline_rpm, (v) => `${formatNumber(v)} rpm`),
        },
        {
          label: "Valves per cylinder",
          value: orNull(engine?.valves_per_cylinder, (v) => String(v)),
        },
        { label: "Cooling", value: text(engine?.cooling) },
      ],
      note: text(engine?.notes),
    });
  }

  // ------------------------------------------ Electric drive (EV + hybrid)
  if (kind !== "combustion") {
    const isFullyElectric = kind === "electric";
    sections.push({
      id: "electric",
      title: isFullyElectric ? "Electric Drivetrain" : "Electric Assist",
      rows: [
        {
          label: "Motors",
          value: orNull(ev?.motor_count, (v) => `${v} motor${v === 1 ? "" : "s"}`),
        },
        { label: "Battery capacity", value: orNull(ev?.battery_kwh, (v) => `${v} kWh`) },
        {
          label: "Usable capacity",
          value: orNull(ev?.usable_battery_kwh, (v) => `${v} kWh`),
          hint: "Usable capacity is what determines real range; gross includes the buffer the battery management system reserves.",
        },
        { label: "Drive", value: formatEnumLabel(variant.drive_type, "") || null },
      ],
      note: text(ev?.notes),
    });
  }

  // --------------------------------------------------- Transmission & drive
  sections.push({
    id: "transmission",
    title: "Transmission & Drivetrain",
    rows: [
      { label: "Transmission", value: text(transmission?.name) },
      { label: "Type", value: formatEnumLabel(transmission?.type, "") || null },
      { label: "Gears", value: orNull(transmission?.gears, (v) => String(v)) },
      { label: "Drive type", value: formatEnumLabel(variant.drive_type, "") || null },
    ],
    note: text(transmission?.notes),
  });

  // --------------------------------------------------------- Dimensions
  sections.push({
    id: "dimensions",
    title: "Dimensions & Weight",
    rows: [
      {
        label: "Length",
        value: orNull(dimensions?.length_mm, (v) => `${formatNumber(v)} mm`),
      },
      {
        label: "Width",
        value: orNull(dimensions?.width_mm, (v) => `${formatNumber(v)} mm`),
      },
      {
        label: "Height",
        value: orNull(dimensions?.height_mm, (v) => `${formatNumber(v)} mm`),
      },
      {
        label: "Wheelbase",
        value: orNull(dimensions?.wheelbase_mm, (v) => `${formatNumber(v)} mm`),
      },
      {
        label: "Kerb weight",
        value: orNull(dimensions?.kerb_weight_kg, (v) => `${formatNumber(v)} kg`),
      },
      {
        label: "Ground clearance",
        value: orNull(dimensions?.ground_clearance_mm, (v) => `${v} mm`),
      },
      {
        label: "Boot capacity",
        value: orNull(dimensions?.boot_capacity_l, (v) => `${v} L`),
      },
      {
        label: "Seating",
        value: orNull(dimensions?.seating_capacity, (v) => `${v} seats`),
      },
    ],
    note: text(dimensions?.notes),
  });

  // ------------------------------------------------ Fuel (non-electric only)
  if (kind !== "electric") {
    sections.push({
      id: "fuel",
      title: "Fuel & Efficiency",
      rows: [
        { label: "Fuel type", value: formatEnumLabel(variant.fuel_type, "") || null },
        { label: "Tank capacity", value: orNull(fuel?.tank_capacity_l, (v) => `${v} L`) },
        {
          label: "Fuel economy",
          value: orNull(fuel?.mileage_kmpl, (v) => `${v} km/l`),
          hint: "Left blank where the manufacturer publishes l/100 km or mpg — converting would misrepresent the source figure.",
        },
        { label: "CO₂ emissions", value: orNull(fuel?.co2_g_km, (v) => `${v} g/km`) },
        { label: "Emission standard", value: text(fuel?.emission_standard) },
      ],
      note: text(fuel?.notes),
    });
  }

  // ---------------------------------------- Charging & range (EV and PHEV)
  if (kind !== "combustion") {
    const isFullyElectric = kind === "electric";
    sections.push({
      id: "charging",
      title: isFullyElectric ? "Range & Charging" : "Electric Range & Charging",
      rows: [
        {
          label: isFullyElectric ? "Range" : "Electric-only range",
          value: orNull(ev?.range_km, (v) => `${formatNumber(v)} km`),
          hint: "Test standards are not interchangeable: WLTP, EPA and ARAI produce different figures for the same car.",
        },
        {
          label: "Test standard",
          value: formatEnumLabel(ev?.range_standard, "") || null,
        },
        {
          label: "Max charging power",
          value: orNull(ev?.max_charge_kw, (v) => `${v} kW`),
        },
        {
          label: "Charge 10–80%",
          value: orNull(ev?.charge_10_80_min, (v) => `${v} min`),
        },
      ],
      note: text(ev?.source) ? `Source: ${ev?.source}` : null,
    });
  }

  return sections;
}

/** Sections that actually have something to show, for the sticky nav. */
export function visibleSections(sections: SpecSectionSpec[]): SpecSectionSpec[] {
  return sections.filter((section) => section.rows.some((row) => row.value !== null));
}
