import type { VariantDetail } from "@/types/domain";
import {
  formatEnumLabel,
  formatNumber,
  formatPrice,
  formatSeconds,
  formatYearRange,
} from "@/lib/format";

export type CompareCell = {
  value: string | null;
  isBest: boolean;
};

export type CompareRow = {
  label: string;
  hint?: string;
  cells: CompareCell[];
};

export type CompareGroup = {
  title: string;
  rows: CompareRow[];
};

/** Which direction counts as "better" for a numeric row. */
type Better = "higher" | "lower" | "none";

type RowSpec = {
  label: string;
  hint?: string;
  better?: Better;
  /** Raw comparable number, or null when not published. */
  value: (car: VariantDetail) => number | null;
  /** How to render it. Falls back to a plain formatted number. */
  format?: (car: VariantDetail) => string | null;
};

/** A row whose values are text and therefore never "best". */
type TextRowSpec = {
  label: string;
  hint?: string;
  text: (car: VariantDetail) => string | null;
};

function isTextRow(spec: RowSpec | TextRowSpec): spec is TextRowSpec {
  return "text" in spec;
}

function buildRow(spec: RowSpec | TextRowSpec, cars: VariantDetail[]): CompareRow {
  if (isTextRow(spec)) {
    return {
      label: spec.label,
      ...(spec.hint ? { hint: spec.hint } : {}),
      cells: cars.map((car) => ({ value: spec.text(car), isBest: false })),
    };
  }

  const numbers = cars.map((car) => spec.value(car));
  const present = numbers.filter((value): value is number => value !== null);

  // Only crown a winner when at least two cars published a figure. Otherwise
  // the single car with data would look like it won a contest it entered alone.
  const comparable = present.length >= 2 && (spec.better ?? "none") !== "none";
  const best = comparable
    ? spec.better === "lower"
      ? Math.min(...present)
      : Math.max(...present)
    : null;

  return {
    label: spec.label,
    ...(spec.hint ? { hint: spec.hint } : {}),
    cells: cars.map((car, index) => {
      const raw = numbers[index] ?? null;
      const formatted = spec.format
        ? spec.format(car)
        : raw === null
          ? null
          : formatNumber(raw);
      return {
        value: formatted,
        isBest: best !== null && raw !== null && raw === best,
      };
    }),
  };
}

/**
 * Build the grouped comparison rows.
 *
 * Groups are fixed rather than derived from the cars, so the table has the
 * same shape whatever mix of petrol, hybrid and electric is being compared —
 * an electric car simply shows an em dash in the engine rows, which is the
 * honest answer to "what is its displacement".
 */
export function buildCompareRows(cars: VariantDetail[]): CompareGroup[] {
  const group = (title: string, specs: (RowSpec | TextRowSpec)[]): CompareGroup => ({
    title,
    rows: specs
      .map((spec) => buildRow(spec, cars))
      // Drop a row only when not one car has a value for it.
      .filter((row) => row.cells.some((cell) => cell.value !== null)),
  });

  return [
    group("Identity", [
      {
        label: "Country",
        text: (car) => `${car.country.flag_emoji ?? ""} ${car.country.name}`.trim(),
      },
      { label: "Category", text: (car) => car.category.name },
      {
        label: "Body type",
        text: (car) => formatEnumLabel(car.model.body_type, "") || null,
      },
      { label: "Generation", text: (car) => car.model.generation },
      {
        label: "Production",
        text: (car) => formatYearRange(car.variant.year_start, car.variant.year_end),
      },
    ]),

    group("Performance", [
      {
        label: "Power",
        better: "higher",
        hint: "Metric PS for European makers, SAE hp for US and Japanese ones.",
        value: (car) => car.performance?.power_hp ?? null,
        format: (car) =>
          car.performance?.power_hp == null
            ? null
            : `${formatNumber(car.performance.power_hp)} hp`,
      },
      {
        label: "Torque",
        better: "higher",
        value: (car) => car.performance?.torque_nm ?? null,
        format: (car) =>
          car.performance?.torque_nm == null
            ? null
            : `${formatNumber(car.performance.torque_nm)} Nm`,
      },
      {
        label: "Top speed",
        better: "higher",
        value: (car) => car.performance?.top_speed_kmh ?? null,
        format: (car) =>
          car.performance?.top_speed_kmh == null
            ? null
            : `${formatNumber(car.performance.top_speed_kmh)} km/h`,
      },
      {
        label: "0–100 km/h",
        better: "lower",
        value: (car) => car.performance?.zero_to_100_s ?? null,
        format: (car) =>
          car.performance?.zero_to_100_s == null
            ? null
            : formatSeconds(car.performance.zero_to_100_s),
      },
      {
        label: "0–200 km/h",
        better: "lower",
        value: (car) => car.performance?.zero_to_200_s ?? null,
        format: (car) =>
          car.performance?.zero_to_200_s == null
            ? null
            : formatSeconds(car.performance.zero_to_200_s),
      },
      {
        label: "Power-to-weight",
        better: "higher",
        hint: "Computed from power and kerb weight; absent where only dry weight is published.",
        value: (car) =>
          car.performance?.power_hp && car.dimensions?.kerb_weight_kg
            ? (car.performance.power_hp * 1000) / car.dimensions.kerb_weight_kg
            : null,
        format: (car) =>
          car.performance?.power_hp && car.dimensions?.kerb_weight_kg
            ? `${((car.performance.power_hp * 1000) / car.dimensions.kerb_weight_kg).toFixed(1)} hp/t`
            : null,
      },
    ]),

    group("Engine", [
      { label: "Engine", text: (car) => car.engine?.name ?? null },
      { label: "Configuration", text: (car) => car.engine?.configuration ?? null },
      {
        label: "Displacement",
        better: "none",
        value: (car) => car.engine?.displacement_cc ?? null,
        format: (car) =>
          car.engine?.displacement_cc == null
            ? null
            : `${formatNumber(car.engine.displacement_cc)} cc`,
      },
      {
        label: "Aspiration",
        text: (car) => formatEnumLabel(car.engine?.aspiration, "") || null,
      },
      {
        label: "Redline",
        better: "higher",
        value: (car) => car.engine?.redline_rpm ?? null,
        format: (car) =>
          car.engine?.redline_rpm == null
            ? null
            : `${formatNumber(car.engine.redline_rpm)} rpm`,
      },
    ]),

    group("Transmission", [
      { label: "Transmission", text: (car) => car.transmission?.name ?? null },
      {
        label: "Type",
        text: (car) => formatEnumLabel(car.transmission?.type, "") || null,
      },
      {
        label: "Gears",
        better: "none",
        value: (car) => car.transmission?.gears ?? null,
        format: (car) =>
          car.transmission?.gears == null ? null : String(car.transmission.gears),
      },
      {
        label: "Drive type",
        text: (car) => formatEnumLabel(car.variant.drive_type, "") || null,
      },
    ]),

    group("Dimensions & Weight", [
      {
        label: "Length",
        better: "none",
        value: (car) => car.dimensions?.length_mm ?? null,
        format: (car) =>
          car.dimensions?.length_mm == null
            ? null
            : `${formatNumber(car.dimensions.length_mm)} mm`,
      },
      {
        label: "Width",
        better: "none",
        value: (car) => car.dimensions?.width_mm ?? null,
        format: (car) =>
          car.dimensions?.width_mm == null
            ? null
            : `${formatNumber(car.dimensions.width_mm)} mm`,
      },
      {
        label: "Height",
        better: "none",
        value: (car) => car.dimensions?.height_mm ?? null,
        format: (car) =>
          car.dimensions?.height_mm == null
            ? null
            : `${formatNumber(car.dimensions.height_mm)} mm`,
      },
      {
        label: "Wheelbase",
        better: "none",
        value: (car) => car.dimensions?.wheelbase_mm ?? null,
        format: (car) =>
          car.dimensions?.wheelbase_mm == null
            ? null
            : `${formatNumber(car.dimensions.wheelbase_mm)} mm`,
      },
      {
        label: "Kerb weight",
        better: "lower",
        value: (car) => car.dimensions?.kerb_weight_kg ?? null,
        format: (car) =>
          car.dimensions?.kerb_weight_kg == null
            ? null
            : `${formatNumber(car.dimensions.kerb_weight_kg)} kg`,
      },
      {
        label: "Seating",
        better: "none",
        value: (car) => car.dimensions?.seating_capacity ?? null,
        format: (car) =>
          car.dimensions?.seating_capacity == null
            ? null
            : `${car.dimensions.seating_capacity} seats`,
      },
    ]),

    group("Fuel & Energy", [
      {
        label: "Fuel type",
        text: (car) => formatEnumLabel(car.variant.fuel_type, "") || null,
      },
      {
        label: "Tank capacity",
        better: "none",
        value: (car) => car.fuel?.tank_capacity_l ?? null,
        format: (car) =>
          car.fuel?.tank_capacity_l == null ? null : `${car.fuel.tank_capacity_l} L`,
      },
      {
        label: "Battery",
        better: "higher",
        value: (car) => car.ev?.battery_kwh ?? null,
        format: (car) =>
          car.ev?.battery_kwh == null ? null : `${car.ev.battery_kwh} kWh`,
      },
      {
        label: "Range",
        better: "higher",
        hint: "Test standards differ; WLTP, EPA and ARAI are not directly comparable.",
        value: (car) => car.ev?.range_km ?? null,
        format: (car) =>
          car.ev?.range_km == null
            ? null
            : `${formatNumber(car.ev.range_km)} km${car.ev.range_standard ? ` (${car.ev.range_standard.toUpperCase()})` : ""}`,
      },
      {
        label: "Max charging",
        better: "higher",
        value: (car) => car.ev?.max_charge_kw ?? null,
        format: (car) =>
          car.ev?.max_charge_kw == null ? null : `${car.ev.max_charge_kw} kW`,
      },
    ]),

    group("Price", [
      {
        label: "Starting price",
        // No "best": the cars are priced in different currencies and this
        // project never converts between them, so a numeric comparison would
        // be meaningless.
        better: "none",
        value: () => null,
        format: (car) =>
          car.variant.base_price == null
            ? null
            : formatPrice(car.variant.base_price, car.variant.price_currency, ""),
      },
    ]),
  ].filter((entry) => entry.rows.length > 0);
}
