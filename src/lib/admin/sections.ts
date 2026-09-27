import {
  ASPIRATION_OPTIONS,
  ASPIRATIONS,
  ENGINE_LAYOUTS,
  LAYOUT_OPTIONS,
  RANGE_STANDARD_OPTIONS,
  RANGE_STANDARDS,
  TRANSMISSION_OPTIONS,
  TRANSMISSION_TYPES,
  type Option,
} from "./labels";
import {
  LONG_TEXT_MAX,
  readProvenance,
  type FieldReader,
  type NumberRule,
} from "./validation";

/**
 * Field definitions for the specification sections of the vehicle editor.
 *
 * One definition drives three things, so they cannot drift apart: the form
 * the admin sees, the server-side validation of what comes back, and the
 * provenance table that lists every populated figure with its source. Ranges
 * are the database CHECK constraints (and column precision), plus a generous
 * upper bound that only catches typing slips — never a plausibility guess.
 *
 * Client-safe (no server imports).
 */

export type SectionKey =
  "performance" | "dimensions" | "fuel" | "ev" | "engine" | "transmission";

export type NumberField = {
  kind: "number";
  name: string;
  label: string;
  unit?: string;
  rule: NumberRule;
  hint?: string;
};

export type TextField = {
  kind: "text" | "textarea";
  name: string;
  label: string;
  max?: number;
  required?: boolean;
  hint?: string;
};

export type ChoiceField = {
  kind: "choice";
  name: string;
  label: string;
  options: Option[];
  values: readonly string[];
  required?: boolean;
  hint?: string;
};

export type SectionField = NumberField | TextField | ChoiceField;

export type SectionSchema = {
  key: SectionKey;
  table:
    | "performance_specs"
    | "dimensions"
    | "fuel_specs"
    | "ev_specs"
    | "engines"
    | "transmissions";
  title: string;
  description: string;
  fields: SectionField[];
  /** Fields describing the record itself, not measured figures (names, types). */
  identity?: string[];
};

const n = (
  name: string,
  label: string,
  unit: string | undefined,
  rule: NumberRule,
  hint?: string,
): NumberField => ({
  kind: "number",
  name,
  label,
  unit,
  // Ratios (":1") read badly in "must be at most 99.99 :1"; keep units for the rest.
  rule: unit && !unit.startsWith(":") ? { unit, ...rule } : rule,
  hint,
});

const notes: TextField = {
  kind: "textarea",
  name: "notes",
  label: "Notes",
  max: LONG_TEXT_MAX,
  hint: "Caveats about these figures, e.g. which market or model year they apply to.",
};

export const SECTION_SCHEMAS: Record<SectionKey, SectionSchema> = {
  performance: {
    key: "performance",
    table: "performance_specs",
    title: "Performance",
    description:
      "Figures exactly as the maker publishes them. Leave a field empty when it is not published.",
    fields: [
      n(
        "power_hp",
        "Power",
        "hp",
        { above: 0, max: 5000 },
        "Record whether the figure is PS/cv or SAE hp in the source or notes.",
      ),
      n("power_rpm", "Peak power at", "rpm", { above: 0, max: 25000 }),
      n("torque_nm", "Torque", "Nm", { above: 0, max: 20000 }),
      n("torque_rpm", "Peak torque at", "rpm", { above: 0, max: 25000 }),
      n("top_speed_kmh", "Top speed", "km/h", { above: 0, max: 800 }),
      n("zero_to_100_s", "0–100 km/h", "s", { above: 0, max: 99.99, scale: 2 }),
      n("zero_to_200_s", "0–200 km/h", "s", { above: 0, max: 999.99, scale: 2 }),
      n("quarter_mile_s", "Quarter mile", "s", { above: 0, max: 999.99, scale: 2 }),
      n("braking_100_0_m", "Braking 100–0 km/h", "m", { above: 0, max: 500, scale: 1 }),
      notes,
    ],
  },
  dimensions: {
    key: "dimensions",
    table: "dimensions",
    title: "Dimensions & weight",
    description:
      "Kerb weight only: if the maker publishes dry weight, leave kerb weight empty and put the dry figure in the notes.",
    fields: [
      n("length_mm", "Length", "mm", { above: 0, max: 30000 }),
      n(
        "width_mm",
        "Width",
        "mm",
        { above: 0, max: 10000 },
        "Body width excluding mirrors, as published.",
      ),
      n("height_mm", "Height", "mm", { above: 0, max: 10000 }),
      n("wheelbase_mm", "Wheelbase", "mm", { above: 0, max: 20000 }),
      n("kerb_weight_kg", "Kerb weight", "kg", { above: 0, max: 100000 }),
      n("ground_clearance_mm", "Ground clearance", "mm", { above: 0, max: 2000 }),
      n("boot_capacity_l", "Boot capacity", "L", { min: 0, max: 10000 }),
      n("seating_capacity", "Seats", undefined, { min: 1, max: 9 }),
      notes,
    ],
  },
  fuel: {
    key: "fuel",
    table: "fuel_specs",
    title: "Fuel & efficiency",
    description:
      "Only for vehicles that burn fuel. Record efficiency in km/l only when a source publishes it in km/l; never convert from l/100 km or mpg.",
    fields: [
      n("tank_capacity_l", "Fuel tank", "L", { above: 0, max: 9999.9, scale: 1 }),
      n("mileage_kmpl", "Efficiency", "km/l", { above: 0, max: 999.99, scale: 2 }),
      n("co2_g_km", "CO₂", "g/km", { min: 0, max: 2000 }),
      {
        kind: "text",
        name: "emission_standard",
        label: "Emission standard",
        max: 60,
        hint: "e.g. Euro 6d, BS6 Phase 2",
      },
      notes,
    ],
  },
  ev: {
    key: "ev",
    table: "ev_specs",
    title: "EV & charging",
    description:
      "Battery and charging figures for electric, plug-in hybrid and hybrid vehicles. A range figure must name its test standard.",
    fields: [
      n("battery_kwh", "Battery (gross)", "kWh", { above: 0, max: 9999.99, scale: 2 }),
      n("usable_battery_kwh", "Battery (usable)", "kWh", {
        above: 0,
        max: 9999.99,
        scale: 2,
      }),
      n("range_km", "Range", "km", { above: 0, max: 5000 }),
      {
        kind: "choice",
        name: "range_standard",
        label: "Range standard",
        options: RANGE_STANDARD_OPTIONS,
        values: RANGE_STANDARDS,
      },
      n("max_charge_kw", "Max DC charging", "kW", { above: 0, max: 2000 }),
      n("charge_10_80_min", "10–80% charge", "min", { above: 0, max: 2000 }),
      n("motor_count", "Motors", undefined, { min: 1, max: 4 }),
      notes,
    ],
  },
  engine: {
    key: "engine",
    table: "engines",
    title: "Engine",
    description:
      "Engines are shared: editing this record changes every vehicle that uses it.",
    identity: ["name", "layout", "aspiration"],
    fields: [
      {
        kind: "text",
        name: "name",
        label: "Engine name",
        max: 120,
        required: true,
        hint: "Unique, e.g. “Porsche 3.7 twin-turbo flat-six (9A2)”.",
      },
      {
        kind: "choice",
        name: "layout",
        label: "Layout",
        options: LAYOUT_OPTIONS,
        values: ENGINE_LAYOUTS,
        required: true,
      },
      n(
        "cylinders",
        "Cylinders",
        undefined,
        { min: 1, max: 16 },
        "Rotor count for a rotary engine.",
      ),
      n("displacement_cc", "Displacement", "cc", { above: 0, max: 20000 }),
      {
        kind: "choice",
        name: "aspiration",
        label: "Aspiration",
        options: ASPIRATION_OPTIONS,
        values: ASPIRATIONS,
        required: true,
      },
      {
        kind: "text",
        name: "fuel_system",
        label: "Fuel system",
        max: 120,
        hint: "e.g. Direct injection",
      },
      n("compression_ratio", "Compression ratio", ":1", {
        above: 0,
        max: 99.99,
        scale: 2,
      }),
      n("redline_rpm", "Redline", "rpm", { above: 0, max: 25000 }),
      { kind: "text", name: "cooling", label: "Cooling", max: 60 },
      n("valves_per_cylinder", "Valves per cylinder", undefined, { min: 1, max: 8 }),
      notes,
    ],
  },
  transmission: {
    key: "transmission",
    table: "transmissions",
    title: "Transmission",
    description:
      "Transmissions are shared: editing this record changes every vehicle that uses it.",
    identity: ["name", "type"],
    fields: [
      {
        kind: "text",
        name: "name",
        label: "Transmission name",
        max: 120,
        required: true,
        hint: "Unique, e.g. “8-speed PDK”.",
      },
      {
        kind: "choice",
        name: "type",
        label: "Type",
        options: TRANSMISSION_OPTIONS,
        values: TRANSMISSION_TYPES,
        required: true,
      },
      n("gears", "Gears", undefined, { min: 1, max: 12 }),
      notes,
    ],
  },
};

export type SectionValues = Record<string, string | number | null>;

export type SectionRead = {
  values: SectionValues;
  /** True when at least one measured figure (not identity/notes) was entered. */
  hasFigures: boolean;
};

/**
 * Validates a section's fields plus its provenance. Empty fields become NULL;
 * cross-field rules that the database also enforces are checked here first
 * so the admin sees which field is wrong.
 */
export function readSection(
  reader: FieldReader,
  schema: SectionSchema,
  today: string,
): SectionRead {
  const values: SectionValues = {};
  let hasFigures = false;
  const identity = new Set(schema.identity ?? []);

  for (const field of schema.fields) {
    let value: string | number | null;
    if (field.kind === "number") {
      value = reader.number(field.name, field.label, field.rule);
    } else if (field.kind === "choice") {
      value = reader.choice(field.name, field.label, field.values, {
        required: field.required,
      });
    } else {
      value = reader.text(field.name, field.label, {
        max: field.max,
        required: field.required,
      });
    }
    values[field.name] = value;
    if (value !== null && field.name !== "notes" && !identity.has(field.name)) {
      hasFigures = true;
    }
  }

  const provenance = readProvenance(reader, {
    hasData: hasFigures,
    today,
    // Shared engine/transmission records must always say where they come from.
    sourceRequired: schema.identity ? true : hasFigures,
  });
  Object.assign(values, provenance);

  // Cross-field rules (mirroring CHECK constraints).
  const num = (name: string) =>
    typeof values[name] === "number" ? (values[name] as number) : null;
  if (schema.key === "performance") {
    const t100 = num("zero_to_100_s");
    const t200 = num("zero_to_200_s");
    if (t100 !== null && t200 !== null && !(t200 > t100)) {
      reader.fail("zero_to_200_s", "0–200 km/h must take longer than 0–100 km/h.");
    }
  }
  if (schema.key === "dimensions") {
    const length = num("length_mm");
    const wheelbase = num("wheelbase_mm");
    if (length !== null && wheelbase !== null && !(wheelbase < length)) {
      reader.fail(
        "wheelbase_mm",
        "The wheelbase must be shorter than the overall length.",
      );
    }
  }
  if (schema.key === "ev") {
    const gross = num("battery_kwh");
    const usable = num("usable_battery_kwh");
    if (gross !== null && usable !== null && usable > gross) {
      reader.fail(
        "usable_battery_kwh",
        "Usable capacity cannot exceed the gross capacity.",
      );
    }
    if (num("range_km") !== null && values.range_standard === null) {
      reader.fail("range_standard", "Choose the standard this range was measured under.");
    }
  }
  if (schema.key === "transmission") {
    const gears = num("gears");
    if (values.type === "single_speed" && gears !== null && gears !== 1) {
      reader.fail("gears", "A single-speed transmission has exactly one gear.");
    }
  }
  return { values, hasFigures };
}

/** Formats a stored value for display in tables (provenance, lists). */
export function formatFieldValue(field: SectionField, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (field.kind === "choice") {
    const match = field.options.find((option) => option.value === value);
    return match?.label ?? String(value);
  }
  if (field.kind === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const text = numeric.toLocaleString("en-US", {
      maximumFractionDigits: field.rule.scale ?? 0,
    });
    if (!field.unit) return text;
    return field.unit.startsWith(":") ? `${text}${field.unit}` : `${text} ${field.unit}`;
  }
  return String(value);
}
