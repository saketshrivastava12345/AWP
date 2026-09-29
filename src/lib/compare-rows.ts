import {
  powertrainKind,
  type FuelType,
  type PowertrainKind,
  type VariantDetail,
  type VehicleStatus,
} from "@/types/domain";
import {
  formatDate,
  formatEnumLabel,
  formatNumber,
  formatPrice,
  formatYearRange,
} from "@/lib/format";
import { PRICE_TYPE_LABELS } from "@/lib/pricing/engine";

/**
 * The comparison, as data: grouped rows of cells with bars and best-in-row
 * flags, built from each car's catalogue record.
 *
 * Pure and client-safe. Everything a reader could mistake for a claim is
 * decided here, in one tested place:
 *
 *   - A figure the maker does not publish is `missing` and renders "—",
 *     never 0. A figure that cannot exist for a powertrain (an electric car's
 *     displacement) is `not-applicable`, which is a different statement.
 *   - "Best" is only crowned when at least two cars publish the figure, the
 *     row has a direction (bigger is not always better), and the cars do not
 *     all tie. Crowning the only car with data would imply it won a contest
 *     the others never entered.
 *   - Bars are drawn only on the headline performance rows (`showBar`), and
 *     only under the same rule: one figure alone has nothing to be measured
 *     against, so it gets no bar. A bar on gears, seats or a dimension says
 *     nothing a reader can use, so those rows are figures only.
 *   - Figures measured under different standards (WLTP vs EPA range) are
 *     neither ranked nor scaled against each other.
 *   - Prices are never ranked or scaled: they are in different currencies and
 *     of different types, and nothing is converted.
 */

export type Better = "higher" | "lower" | "none";

export type CellState = "value" | "missing" | "not-applicable";

export type CompareCell = {
  state: CellState;
  /** Formatted figure with its unit; null unless state is "value". */
  display: string | null;
  /** Secondary line: price type and market, range standard, peak rpm, feature detail. */
  note: string | null;
  /** Comparable number, for numeric rows. */
  value: number | null;
  /** Bar length, 0–1 of the row's scale. Null when the row has no bars. */
  bar: number | null;
  isBest: boolean;
};

export type RowKind = "number" | "text" | "feature" | "price";

export type CompareRow = {
  /** Stable key, e.g. "performance.power". */
  id: string;
  label: string;
  /** A smaller line under the label (a feature's category). */
  sublabel: string | null;
  kind: RowKind;
  /** The direction actually used for this set of cars ("none" when not rankable). */
  better: Better;
  /** What the figure is and any caveat. */
  hint: string | null;
  /** How the bars are scaled, when the row has bars. */
  scale: string | null;
  cells: CompareCell[];
  /** False when every car shows exactly the same thing. */
  differs: boolean;
  hasBars: boolean;
  hasBest: boolean;
};

export type CompareGroup = {
  id: string;
  title: string;
  note: string | null;
  rows: CompareRow[];
  /** True when at least one row differs between the cars. */
  differs: boolean;
};

/** The catalogue's listed price for a variant (car_catalog.listed_price_*). */
export type ListedPrice = {
  amount: number | string | null;
  currency: string | null;
  /** 'base_price' or a price_type value. */
  type: string | null;
  market: string | null;
  verifiedAt: string | null;
};

export type CompareInput = {
  detail: VariantDetail;
  listed: ListedPrice | null;
};

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const FUEL_LABELS: Record<FuelType, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  phev: "Plug-in hybrid",
  electric: "Electric",
  hydrogen: "Hydrogen",
};

export const STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "On sale",
  upcoming: "Upcoming",
  discontinued: "Discontinued",
  concept: "Concept",
  limited: "Limited run",
  sold_out: "Sold out",
};

/** Price type label, including the catalogue's 'base_price' fallback. */
export function priceTypeLabel(type: string | null): string | null {
  if (!type) return null;
  if (type === "base_price") return "Base price";
  return type in PRICE_TYPE_LABELS
    ? PRICE_TYPE_LABELS[type as keyof typeof PRICE_TYPE_LABELS]
    : formatEnumLabel(type, "");
}

/**
 * Which power convention a performance source records, when it says so.
 * Only reported when the source text states it — never inferred from the
 * maker's country.
 */
export function powerConvention(source: string | null | undefined): string | null {
  if (!source) return null;
  if (/\bSAE\b/i.test(source)) return "SAE net hp";
  if (/\b(PS|DIN|CV|metric)\b/i.test(source)) return "metric PS";
  if (/\bbhp\b/i.test(source)) return "bhp";
  return null;
}

// ---------------------------------------------------------------------------
// Row specifications
// ---------------------------------------------------------------------------

type Applies = (car: CompareInput) => boolean;

type NumberSpec = {
  kind: "number";
  id: string;
  label: string;
  hint?: string;
  better: Better;
  /** Raw comparable number, null when not published. */
  value: (car: CompareInput) => number | null;
  format: (value: number) => string;
  note?: (car: CompareInput) => string | null;
  /**
   * Values are only ranked and scaled against each other when every car that
   * publishes one returns the same key (e.g. the same range test cycle).
   */
  comparableKey?: (car: CompareInput) => string | null;
  incomparableNote?: string;
  applies?: Applies;
  /**
   * Draw bars for this row. Only the headline performance figures have them
   * (power, torque, sprints, top speed, power-to-weight, range); every other
   * row is figures, and a best marker where the row has a direction.
   */
  showBar?: boolean;
};

type TextSpec = {
  kind: "text";
  id: string;
  label: string;
  hint?: string;
  text: (car: CompareInput) => string | null;
  note?: (car: CompareInput) => string | null;
  applies?: Applies;
};

type PriceSpec = {
  kind: "price";
  id: string;
  label: string;
  hint?: string;
  price: (car: CompareInput) => { display: string; note: string | null } | null;
};

type FeatureSpec = {
  kind: "feature";
  id: string;
  label: string;
  sublabel: string | null;
  hint?: string;
  detail: (car: CompareInput) => { present: boolean; detail: string | null };
};

type RowSpec = NumberSpec | TextSpec | PriceSpec | FeatureSpec;

const kind = (car: CompareInput): PowertrainKind =>
  powertrainKind(car.detail.variant.fuel_type);
const hasEngine: Applies = (car) => kind(car) !== "electric";
const hasBattery: Applies = (car) => kind(car) !== "combustion";

const withUnit = (unit: string) => (value: number) => `${formatNumber(value)} ${unit}`;
const seconds = (value: number) => `${value.toFixed(1)} s`;
const rpmNote = (rpm: number | null | undefined) =>
  rpm == null ? null : `at ${formatNumber(rpm)} rpm`;

/** Cells for a row, before ranking. */
function emptyCell(state: CellState): CompareCell {
  return { state, display: null, note: null, value: null, bar: null, isBest: false };
}

function numberCells(spec: NumberSpec, cars: CompareInput[]): CompareCell[] {
  return cars.map((car) => {
    if (spec.applies && !spec.applies(car)) return emptyCell("not-applicable");
    const value = spec.value(car);
    if (value === null || !Number.isFinite(value)) return emptyCell("missing");
    return {
      state: "value",
      display: spec.format(value),
      note: spec.note?.(car) ?? null,
      value,
      bar: null,
      isBest: false,
    };
  });
}

const SCALE_TEXT: Record<Better, string> = {
  higher:
    "Higher is better. Each bar is this car's figure as a share of the highest figure in the row.",
  lower:
    "Lower is better, so the scale is inverted: the lowest figure fills the bar, and every other bar is the lowest figure divided by this car's.",
  none: "Not ranked — more is neither better nor worse here. Each bar is this car's figure as a share of the largest in the row.",
};

/** Rank and scale a numeric row. */
function rankNumbers(spec: NumberSpec, cars: CompareInput[]): CompareRow {
  const cells = numberCells(spec, cars);
  const present = cells.filter((cell) => cell.value !== null);
  const values = present.map((cell) => cell.value as number);

  // Different measurement standards: show the figures, rank nothing.
  const keys = spec.comparableKey
    ? new Set(
        cars
          .filter((_, index) => cells[index]?.value !== null)
          .map((car) => spec.comparableKey?.(car) ?? "unknown"),
      )
    : null;
  const comparable = keys === null || keys.size <= 1;

  const enough = values.length >= 2;
  const max = enough ? Math.max(...values) : 0;
  const min = enough ? Math.min(...values) : 0;
  const allTie = enough && max === min;

  const better: Better = comparable ? spec.better : "none";
  // A scale needs a positive reference: the lowest figure when lower is better.
  const scalable = comparable && enough && (spec.better === "lower" ? min > 0 : max > 0);
  const hasBars = scalable && spec.showBar === true;
  const hasBest = scalable && better !== "none" && !allTie;

  for (const cell of cells) {
    if (cell.value === null) continue;
    if (hasBars) {
      const share = spec.better === "lower" ? min / cell.value : cell.value / max;
      cell.bar = Math.min(1, Math.max(0, share));
    }
    if (hasBest) {
      cell.isBest = cell.value === (spec.better === "lower" ? min : max);
    }
  }

  const hintParts = [spec.hint, comparable ? null : spec.incomparableNote].filter(
    (part): part is string => Boolean(part),
  );

  return {
    id: spec.id,
    label: spec.label,
    sublabel: null,
    kind: "number",
    better,
    hint: hintParts.length > 0 ? hintParts.join(" ") : null,
    scale: hasBars ? SCALE_TEXT[spec.better] : null,
    cells,
    differs: differs(cells),
    hasBars,
    hasBest,
  };
}

function textRow(spec: TextSpec, cars: CompareInput[]): CompareRow {
  const cells = cars.map((car): CompareCell => {
    if (spec.applies && !spec.applies(car)) return emptyCell("not-applicable");
    const text = spec.text(car);
    if (!text) return emptyCell("missing");
    return {
      state: "value",
      display: text,
      note: spec.note?.(car) ?? null,
      value: null,
      bar: null,
      isBest: false,
    };
  });
  return plainRow(spec, "text", cells);
}

function priceRow(spec: PriceSpec, cars: CompareInput[]): CompareRow {
  const cells = cars.map((car): CompareCell => {
    const price = spec.price(car);
    if (!price) return emptyCell("missing");
    return {
      state: "value",
      display: price.display,
      note: price.note,
      value: null,
      bar: null,
      isBest: false,
    };
  });
  return plainRow(spec, "price", cells);
}

function featureRow(spec: FeatureSpec, cars: CompareInput[]): CompareRow {
  const cells = cars.map((car): CompareCell => {
    const { present, detail } = spec.detail(car);
    if (!present) return emptyCell("missing");
    return {
      state: "value",
      display: "Catalogued",
      note: detail,
      value: null,
      bar: null,
      isBest: false,
    };
  });
  return { ...plainRow(spec, "feature", cells), sublabel: spec.sublabel };
}

function plainRow(
  spec: { id: string; label: string; hint?: string },
  rowKind: RowKind,
  cells: CompareCell[],
): CompareRow {
  return {
    id: spec.id,
    label: spec.label,
    sublabel: null,
    kind: rowKind,
    better: "none",
    hint: spec.hint ?? null,
    scale: null,
    cells,
    differs: differs(cells),
    hasBars: false,
    hasBest: false,
  };
}

/** Two cells say the same thing when their state, figure and note all match. */
function cellKey(cell: CompareCell): string {
  if (cell.state !== "value") return cell.state;
  return cell.value !== null
    ? `n:${cell.value}|${cell.note ?? ""}`
    : `t:${cell.display ?? ""}|${cell.note ?? ""}`;
}

function differs(cells: CompareCell[]): boolean {
  return new Set(cells.map(cellKey)).size > 1;
}

export function buildRow(spec: RowSpec, cars: CompareInput[]): CompareRow {
  switch (spec.kind) {
    case "number":
      return rankNumbers(spec, cars);
    case "text":
      return textRow(spec, cars);
    case "price":
      return priceRow(spec, cars);
    case "feature":
      return featureRow(spec, cars);
  }
}

// ---------------------------------------------------------------------------
// The groups
// ---------------------------------------------------------------------------

/** Feature categories that belong under "Safety & assistance". */
export const SAFETY_CATEGORIES = new Set(["Driver Assistance", "Braking"]);

function featureSpecs(cars: CompareInput[], safety: boolean): FeatureSpec[] {
  const byId = new Map<
    string,
    { name: string; category: string; description: string | null }
  >();
  for (const car of cars) {
    for (const { feature } of car.detail.features) {
      const category = feature.category ?? "Other";
      if (SAFETY_CATEGORIES.has(category) !== safety) continue;
      byId.set(feature.id, {
        name: feature.name,
        category,
        description: feature.description,
      });
    }
  }

  return [...byId.entries()]
    .sort(
      ([, a], [, b]) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    )
    .map(([id, feature]) => ({
      kind: "feature" as const,
      id: `feature.${id}`,
      label: feature.name,
      sublabel: feature.category,
      ...(feature.description ? { hint: feature.description } : {}),
      detail: (car: CompareInput) => {
        const entry = car.detail.features.find((item) => item.feature.id === id);
        return { present: entry !== undefined, detail: entry?.detail ?? null };
      },
    }));
}

function listedPrice(car: CompareInput): { display: string; note: string | null } | null {
  const listed = car.listed;
  if (!listed || listed.amount === null || !listed.currency) return null;
  const display = formatPrice(listed.amount, listed.currency, "");
  if (!display) return null;
  const parts = [
    priceTypeLabel(listed.type),
    listed.market ?? "market not recorded",
    listed.verifiedAt ? `verified ${formatDate(listed.verifiedAt, "")}` : "unverified",
  ].filter((part): part is string => Boolean(part));
  return { display, note: parts.length > 0 ? parts.join(" · ") : null };
}

/** The group definitions, in display order. */
function groupSpecs(
  cars: CompareInput[],
): { id: string; title: string; note?: string; when?: boolean; rows: RowSpec[] }[] {
  const anyElectrified = cars.some((car) => kind(car) !== "combustion");
  const anyHybrid = cars.some((car) => kind(car) === "hybrid");

  return [
    {
      id: "identity",
      title: "Identity",
      rows: [
        {
          kind: "text",
          id: "identity.country",
          label: "Country",
          text: ({ detail }) =>
            `${detail.country.flag_emoji ?? ""} ${detail.country.name}`.trim() || null,
        },
        {
          kind: "text",
          id: "identity.category",
          label: "Category",
          text: ({ detail }) => detail.category.name,
        },
        {
          kind: "text",
          id: "identity.body",
          label: "Body",
          text: ({ detail }) => formatEnumLabel(detail.model.body_type, "") || null,
        },
        {
          kind: "text",
          id: "identity.powertrain",
          label: "Powertrain",
          text: ({ detail }) => FUEL_LABELS[detail.variant.fuel_type] ?? null,
        },
        {
          kind: "text",
          id: "identity.generation",
          label: "Generation",
          text: ({ detail }) => detail.generation?.name ?? detail.model.generation,
        },
        {
          kind: "text",
          id: "identity.production",
          label: "Production",
          text: ({ detail }) =>
            detail.variant.year_start
              ? formatYearRange(detail.variant.year_start, detail.variant.year_end)
              : null,
        },
        {
          kind: "text",
          id: "identity.status",
          label: "Status",
          hint: "Lifecycle as recorded from a source. A dash means no status has been recorded.",
          text: ({ detail }) =>
            detail.variant.status ? STATUS_LABELS[detail.variant.status] : null,
        },
      ],
    },
    {
      id: "price",
      title: "Price",
      note: "Each price is shown in the currency, type and market its source published. Nothing is converted, so prices are not ranked.",
      rows: [
        {
          kind: "price",
          id: "price.listed",
          label: "Listed price",
          hint: "The catalogue's most recently verified listed price for the variant, else the maker's base price. Taxes and on-road charges differ by market.",
          price: listedPrice,
        },
      ],
    },
    {
      id: "performance",
      title: "Performance",
      rows: [
        {
          kind: "number",
          id: "performance.power",
          showBar: true,
          label: "Power",
          better: "higher",
          hint: "As published: metric PS for most European makers, SAE net hp for US and Japanese makers. The two differ by about 1.4 %.",
          value: ({ detail }) => detail.performance?.power_hp ?? null,
          format: withUnit("hp"),
          note: ({ detail }) =>
            [
              rpmNote(detail.performance?.power_rpm),
              powerConvention(detail.performance?.source),
            ]
              .filter(Boolean)
              .join(" · ") || null,
        },
        {
          kind: "number",
          id: "performance.torque",
          showBar: true,
          label: "Torque",
          better: "higher",
          value: ({ detail }) => detail.performance?.torque_nm ?? null,
          format: withUnit("Nm"),
          note: ({ detail }) => rpmNote(detail.performance?.torque_rpm),
        },
        {
          kind: "number",
          id: "performance.zero100",
          showBar: true,
          label: "0–100 km/h",
          better: "lower",
          value: ({ detail }) => detail.performance?.zero_to_100_s ?? null,
          format: seconds,
        },
        {
          kind: "number",
          id: "performance.zero200",
          showBar: true,
          label: "0–200 km/h",
          better: "lower",
          value: ({ detail }) => detail.performance?.zero_to_200_s ?? null,
          format: seconds,
        },
        {
          kind: "number",
          id: "performance.quarter",
          label: "Quarter mile",
          better: "lower",
          value: ({ detail }) => detail.performance?.quarter_mile_s ?? null,
          format: seconds,
        },
        {
          kind: "number",
          id: "performance.top",
          showBar: true,
          label: "Top speed",
          better: "higher",
          value: ({ detail }) => detail.performance?.top_speed_kmh ?? null,
          format: withUnit("km/h"),
        },
        {
          kind: "number",
          id: "performance.ptw",
          showBar: true,
          label: "Power-to-weight",
          better: "higher",
          hint: "Computed from published power and kerb weight. Absent where only a dry weight is published.",
          value: ({ detail }) => {
            const power = detail.performance?.power_hp;
            const weight = detail.dimensions?.kerb_weight_kg;
            if (!power || !weight) return null;
            return Math.round(((power * 1000) / weight) * 10) / 10;
          },
          format: (value) => `${value.toFixed(1)} hp/t`,
        },
        {
          kind: "number",
          id: "performance.braking",
          label: "Braking 100–0 km/h",
          better: "lower",
          value: ({ detail }) => detail.performance?.braking_100_0_m ?? null,
          format: (value) => `${formatNumber(value)} m`,
        },
      ],
    },
    {
      id: "engine",
      title: "Engine",
      rows: [
        {
          kind: "text",
          id: "engine.name",
          label: "Engine",
          applies: hasEngine,
          text: ({ detail }) => detail.engine?.name ?? null,
        },
        {
          kind: "text",
          id: "engine.configuration",
          label: "Configuration",
          applies: hasEngine,
          text: ({ detail }) => detail.engine?.configuration ?? null,
        },
        {
          kind: "number",
          id: "engine.displacement",
          label: "Displacement",
          better: "none",
          applies: hasEngine,
          value: ({ detail }) => detail.engine?.displacement_cc ?? null,
          format: withUnit("cc"),
        },
        {
          kind: "text",
          id: "engine.aspiration",
          label: "Aspiration",
          applies: hasEngine,
          text: ({ detail }) => formatEnumLabel(detail.engine?.aspiration, "") || null,
        },
        {
          kind: "number",
          id: "engine.redline",
          label: "Redline",
          better: "none",
          applies: hasEngine,
          value: ({ detail }) => detail.engine?.redline_rpm ?? null,
          format: withUnit("rpm"),
        },
      ],
    },
    {
      id: "electric",
      title: "Electric",
      when: anyElectrified,
      ...(anyHybrid
        ? {
            note: "For hybrids: the traction battery and the range on electric power alone.",
          }
        : {}),
      rows: [
        {
          kind: "number",
          id: "electric.battery",
          label: "Battery (gross)",
          better: "none",
          applies: hasBattery,
          value: ({ detail }) => detail.ev?.battery_kwh ?? null,
          format: withUnit("kWh"),
        },
        {
          kind: "number",
          id: "electric.usable",
          label: "Battery (usable)",
          better: "none",
          applies: hasBattery,
          value: ({ detail }) => detail.ev?.usable_battery_kwh ?? null,
          format: withUnit("kWh"),
        },
        {
          kind: "number",
          id: "electric.motors",
          label: "Electric motors",
          better: "none",
          applies: hasBattery,
          value: ({ detail }) => detail.ev?.motor_count ?? null,
          format: (value) => String(value),
        },
        {
          kind: "number",
          id: "electric.range",
          showBar: true,
          label: "Electric range",
          better: "higher",
          applies: hasBattery,
          hint: "Distance on battery power alone, under the test cycle shown.",
          value: ({ detail }) => detail.ev?.range_km ?? null,
          format: withUnit("km"),
          note: ({ detail }) =>
            detail.ev?.range_standard ? formatEnumLabel(detail.ev.range_standard) : null,
          comparableKey: ({ detail }) => detail.ev?.range_standard ?? null,
          incomparableNote:
            "Not ranked: these figures come from different test cycles (WLTP, EPA, ARAI…), which are not directly comparable.",
        },
        {
          kind: "number",
          id: "electric.charge",
          label: "Max DC charging",
          better: "higher",
          applies: hasBattery,
          value: ({ detail }) => detail.ev?.max_charge_kw ?? null,
          format: withUnit("kW"),
        },
        {
          kind: "number",
          id: "electric.charge1080",
          label: "Charge 10–80 %",
          better: "lower",
          applies: hasBattery,
          value: ({ detail }) => detail.ev?.charge_10_80_min ?? null,
          format: withUnit("min"),
        },
      ],
    },
    {
      id: "transmission",
      title: "Transmission & drive",
      rows: [
        {
          kind: "text",
          id: "transmission.name",
          label: "Transmission",
          text: ({ detail }) => detail.transmission?.name ?? null,
        },
        {
          kind: "text",
          id: "transmission.type",
          label: "Type",
          text: ({ detail }) => formatEnumLabel(detail.transmission?.type, "") || null,
        },
        {
          kind: "number",
          id: "transmission.gears",
          label: "Gears",
          better: "none",
          value: ({ detail }) => detail.transmission?.gears ?? null,
          format: (value) => String(value),
        },
        {
          kind: "text",
          id: "transmission.drive",
          label: "Driven wheels",
          text: ({ detail }) => formatEnumLabel(detail.variant.drive_type, "") || null,
        },
      ],
    },
    {
      id: "dimensions",
      title: "Dimensions & weight",
      rows: [
        {
          kind: "number",
          id: "dimensions.length",
          label: "Length",
          better: "none",
          value: ({ detail }) => detail.dimensions?.length_mm ?? null,
          format: withUnit("mm"),
        },
        {
          kind: "number",
          id: "dimensions.width",
          label: "Width",
          better: "none",
          value: ({ detail }) => detail.dimensions?.width_mm ?? null,
          format: withUnit("mm"),
        },
        {
          kind: "number",
          id: "dimensions.height",
          label: "Height",
          better: "none",
          value: ({ detail }) => detail.dimensions?.height_mm ?? null,
          format: withUnit("mm"),
        },
        {
          kind: "number",
          id: "dimensions.wheelbase",
          label: "Wheelbase",
          better: "none",
          value: ({ detail }) => detail.dimensions?.wheelbase_mm ?? null,
          format: withUnit("mm"),
        },
        {
          kind: "number",
          id: "dimensions.clearance",
          label: "Ground clearance",
          better: "none",
          value: ({ detail }) => detail.dimensions?.ground_clearance_mm ?? null,
          format: withUnit("mm"),
        },
        {
          kind: "number",
          id: "dimensions.kerb",
          label: "Kerb weight",
          // Not ranked: a lighter car is not simply a better one (a heavier
          // car may carry a battery, four seats or a bigger boot).
          better: "none",
          hint: "Kerb weight as published. Not ranked: a lighter car is not simply a better one. Makers that publish only a dry weight show a dash here.",
          value: ({ detail }) => detail.dimensions?.kerb_weight_kg ?? null,
          format: withUnit("kg"),
        },
        {
          kind: "number",
          id: "dimensions.seats",
          label: "Seats",
          better: "none",
          value: ({ detail }) => detail.dimensions?.seating_capacity ?? null,
          format: (value) => String(value),
        },
        {
          kind: "number",
          id: "dimensions.boot",
          label: "Boot",
          better: "higher",
          hint: "Luggage volume as published. Makers measure it in different ways, so treat small differences with care.",
          value: ({ detail }) => detail.dimensions?.boot_capacity_l ?? null,
          format: withUnit("L"),
        },
      ],
    },
    {
      id: "fuel",
      title: "Fuel",
      rows: [
        {
          kind: "number",
          id: "fuel.tank",
          label: "Fuel tank",
          better: "none",
          applies: hasEngine,
          value: ({ detail }) => detail.fuel?.tank_capacity_l ?? null,
          format: withUnit("L"),
        },
        {
          kind: "number",
          id: "fuel.efficiency",
          label: "Fuel efficiency",
          better: "higher",
          applies: hasEngine,
          hint: "Only where a maker publishes km/l. Figures published as l/100 km or mpg are not converted.",
          value: ({ detail }) => detail.fuel?.mileage_kmpl ?? null,
          format: withUnit("km/l"),
        },
        {
          kind: "number",
          id: "fuel.co2",
          label: "CO₂",
          better: "lower",
          applies: hasEngine,
          hint: "As published. Test cycles differ between markets.",
          value: ({ detail }) => detail.fuel?.co2_g_km ?? null,
          format: withUnit("g/km"),
        },
        {
          kind: "text",
          id: "fuel.emission",
          label: "Emission standard",
          applies: hasEngine,
          text: ({ detail }) => detail.fuel?.emission_standard ?? null,
        },
      ],
    },
    {
      id: "features",
      title: "Features",
      note: "A dash means the feature is not catalogued for that car — not that the car lacks it.",
      rows: featureSpecs(cars, false),
    },
    {
      id: "safety",
      title: "Safety & assistance",
      note: "A dash means the system is not catalogued for that car — not that the car lacks it.",
      rows: featureSpecs(cars, true),
    },
  ];
}

/**
 * Build the grouped comparison. Rows where no car has a figure are dropped,
 * and groups left with no rows are dropped, so an all-electric comparison has
 * no Engine group and a petrol-only one has no Electric group.
 */
export function buildCompareRows(cars: CompareInput[]): CompareGroup[] {
  if (cars.length === 0) return [];

  return groupSpecs(cars)
    .filter((group) => group.when !== false)
    .map((group) => {
      const rows = group.rows
        .map((spec) => buildRow(spec, cars))
        .filter((row) => row.cells.some((cell) => cell.state === "value"));
      return {
        id: group.id,
        title: group.title,
        note: group.note ?? null,
        rows,
        differs: rows.some((row) => row.differs),
      };
    })
    .filter((group) => group.rows.length > 0);
}

/** Rows that differ, and all rows, across the groups. */
export function countRows(groups: readonly CompareGroup[]): {
  total: number;
  differing: number;
} {
  let total = 0;
  let differing = 0;
  for (const group of groups) {
    for (const row of group.rows) {
      total += 1;
      if (row.differs) differing += 1;
    }
  }
  return { total, differing };
}

// ---------------------------------------------------------------------------
// Header summaries
// ---------------------------------------------------------------------------

export type CompareCarSummary = {
  slug: string;
  href: string;
  variantId: string;
  manufacturer: string;
  model: string;
  variant: string;
  /** "911 GT3" — model and variant, without repeating a variant named like the model. */
  shortName: string;
  /** "Porsche 911 GT3". */
  fullName: string;
  flag: string | null;
  country: string;
  category: string;
  bodyType: VariantDetail["model"]["body_type"];
  fuelType: FuelType;
  fuelLabel: string;
  powertrain: PowertrainKind;
  statusLabel: string | null;
  generation: string | null;
  years: string | null;
  photo: { src: string; alt: string; credit: string | null } | null;
  /** The performance source as recorded, for the power-convention notes. */
  powerSource: string | null;
};

/** "911" + "GT3" -> "911 GT3"; "296 GTB" + "296 GTB" -> "296 GTB". */
export function shortCarName(model: string, variant: string): string {
  const m = model.trim();
  const v = variant.trim();
  if (!v || v.toLowerCase() === m.toLowerCase()) return m;
  if (v.toLowerCase().startsWith(m.toLowerCase())) return v;
  return `${m} ${v}`;
}

export function summariseCar(detail: VariantDetail, slug: string): CompareCarSummary {
  const image =
    detail.media.find((media) => media.type === "image") ??
    detail.modelMedia.find((media) => media.type === "image") ??
    null;
  const shortName = shortCarName(detail.model.name, detail.variant.name);

  return {
    slug,
    href: `/cars/${slug}`,
    variantId: detail.variant.id,
    manufacturer: detail.manufacturer.name,
    model: detail.model.name,
    variant: detail.variant.name,
    shortName,
    fullName: `${detail.manufacturer.name} ${shortName}`,
    flag: detail.country.flag_emoji,
    country: detail.country.name,
    category: detail.category.name,
    bodyType: detail.model.body_type,
    fuelType: detail.variant.fuel_type,
    fuelLabel:
      FUEL_LABELS[detail.variant.fuel_type] ?? formatEnumLabel(detail.variant.fuel_type),
    powertrain: powertrainKind(detail.variant.fuel_type),
    statusLabel: detail.variant.status ? STATUS_LABELS[detail.variant.status] : null,
    generation: detail.generation?.name ?? detail.model.generation,
    years: detail.variant.year_start
      ? formatYearRange(detail.variant.year_start, detail.variant.year_end)
      : null,
    photo: image
      ? {
          src: image.url,
          alt: image.alt ?? `${detail.manufacturer.name} ${shortName}`,
          credit: image.credit,
        }
      : null,
    powerSource: detail.performance?.source ?? null,
  };
}
