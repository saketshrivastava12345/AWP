import { DRIVE_LABELS, FUEL_LABELS, VEHICLE_STATUS_LABELS } from "./labels";
import { SECTION_SCHEMAS, formatFieldValue, type SectionKey } from "./sections";

/**
 * Provenance: for every populated figure, where it came from and when it was
 * last checked. Sources are recorded per section (a row of performance_specs
 * has one source for all its figures), so each field inherits its section's
 * provenance.
 *
 *   Verified         a source AND a verification date
 *   Source recorded  a source, never re-checked
 *   Unsourced        no source at all
 *
 * Pure and client-safe.
 */

export type ProvenanceStatus = "verified" | "sourced" | "unsourced";

export type ProvenanceSection = "variant" | SectionKey;

export type ProvenanceRecord = {
  source?: string | null;
  source_url?: string | null;
  last_verified_at?: string | null;
  [field: string]: unknown;
};

export type ProvenanceInput = Partial<Record<ProvenanceSection, ProvenanceRecord | null>>;

export type ProvenanceRow = {
  section: ProvenanceSection;
  sectionTitle: string;
  field: string;
  label: string;
  value: string;
  source: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
  status: ProvenanceStatus;
};

export const STATUS_LABELS: Record<ProvenanceStatus, string> = {
  verified: "Verified",
  sourced: "Source recorded",
  unsourced: "Unsourced",
};

export function provenanceStatus(
  source: string | null | undefined,
  lastVerified: string | null | undefined,
): ProvenanceStatus {
  if (!source || !source.trim()) return "unsourced";
  return lastVerified ? "verified" : "sourced";
}

const SECTION_ORDER: ProvenanceSection[] = [
  "variant",
  "performance",
  "dimensions",
  "engine",
  "transmission",
  "fuel",
  "ev",
];

type VariantField = {
  name: string;
  label: string;
  format: (row: ProvenanceRecord) => string | null;
};

const label = (map: Record<string, string>, value: unknown) =>
  typeof value === "string" ? (map[value] ?? value) : null;

const VARIANT_FIELDS: VariantField[] = [
  {
    name: "years",
    label: "Model years",
    format: (row) =>
      typeof row.year_start === "number"
        ? row.year_end === null || row.year_end === undefined
          ? `${row.year_start} – present`
          : row.year_end === row.year_start
            ? String(row.year_start)
            : `${row.year_start} – ${String(row.year_end)}`
        : null,
  },
  {
    name: "fuel_type",
    label: "Fuel type",
    format: (row) => label(FUEL_LABELS, row.fuel_type),
  },
  {
    name: "drive_type",
    label: "Drive",
    format: (row) => label(DRIVE_LABELS, row.drive_type),
  },
  {
    name: "status",
    label: "Status",
    format: (row) => label(VEHICLE_STATUS_LABELS, row.status),
  },
  {
    name: "base_price",
    label: "Base price",
    format: (row) =>
      row.base_price !== null && row.base_price !== undefined && row.price_currency
        ? `${String(row.price_currency)} ${Number(row.base_price).toLocaleString("en-US")}`
        : null,
  },
];

const SECTION_TITLES: Record<ProvenanceSection, string> = {
  variant: "Vehicle",
  performance: SECTION_SCHEMAS.performance.title,
  dimensions: SECTION_SCHEMAS.dimensions.title,
  engine: SECTION_SCHEMAS.engine.title,
  transmission: SECTION_SCHEMAS.transmission.title,
  fuel: SECTION_SCHEMAS.fuel.title,
  ev: SECTION_SCHEMAS.ev.title,
};

/** One row per populated figure, in editor order. Notes are not figures. */
export function buildProvenanceRows(input: ProvenanceInput): ProvenanceRow[] {
  const rows: ProvenanceRow[] = [];
  for (const section of SECTION_ORDER) {
    const record = input[section];
    if (!record) continue;
    const base = {
      section,
      sectionTitle: SECTION_TITLES[section],
      source: record.source?.trim() || null,
      sourceUrl: record.source_url ?? null,
      lastVerified: record.last_verified_at ?? null,
      status: provenanceStatus(record.source, record.last_verified_at),
    };
    if (section === "variant") {
      for (const field of VARIANT_FIELDS) {
        const value = field.format(record);
        if (value !== null)
          rows.push({ ...base, field: field.name, label: field.label, value });
      }
      continue;
    }
    for (const field of SECTION_SCHEMAS[section].fields) {
      if (field.name === "notes") continue;
      const value = formatFieldValue(field, record[field.name]);
      if (value !== null)
        rows.push({ ...base, field: field.name, label: field.label, value });
    }
  }
  return rows;
}

export type ProvenanceSummary = Record<ProvenanceStatus, number> & {
  total: number;
  /** Share of populated figures that are verified, 0–1 (null when none). */
  verifiedShare: number | null;
};

export function summarizeProvenance(rows: readonly ProvenanceRow[]): ProvenanceSummary {
  const summary = { verified: 0, sourced: 0, unsourced: 0, total: rows.length };
  for (const row of rows) summary[row.status] += 1;
  return {
    ...summary,
    verifiedShare: rows.length ? summary.verified / rows.length : null,
  };
}

/** The editor route for a section of a vehicle. */
export function sectionHref(variantId: string, section: ProvenanceSection): string {
  return section === "variant"
    ? `/admin/vehicles/${variantId}`
    : `/admin/vehicles/${variantId}/${section}`;
}
