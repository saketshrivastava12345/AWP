import type { VariantDetail } from "@/types/domain";

/**
 * How well-sourced each block of a car's data is.
 *
 * Every specification table carries `source`, `source_url` and
 * `last_verified_at`. The status is read straight off those columns:
 *
 *   verified         a source AND a verification date are recorded
 *   source-recorded  a source is recorded, but nobody has dated a check of it
 *   unsourced        no source at all
 *
 * A source URL on its own counts as a source (its host is shown as the name).
 * A verification date without any source is still "unsourced": a date on its
 * own says when, not against what.
 */

export type ProvenanceStatus = "verified" | "source-recorded" | "unsourced";

export type ProvenanceColumns = {
  source: string | null;
  source_url: string | null;
  last_verified_at: string | null;
};

export type ProvenanceSectionId =
  | "vehicle"
  | "performance"
  | "dimensions"
  | "engine"
  | "transmission"
  | "fuel"
  | "electric";

export type ProvenanceSection = {
  id: ProvenanceSectionId;
  label: string;
  /** The table the row lives in, shown as a technical reference. */
  table: string;
  status: ProvenanceStatus;
  /** Display name of the source, or null. */
  source: string | null;
  /** Only http(s) URLs survive; anything else is dropped rather than linked. */
  sourceUrl: string | null;
  verifiedAt: string | null;
};

export const PROVENANCE_LABELS: Record<ProvenanceStatus, string> = {
  verified: "Verified",
  "source-recorded": "Source recorded",
  unsourced: "Unsourced",
};

export const PROVENANCE_DESCRIPTIONS: Record<ProvenanceStatus, string> = {
  verified:
    "A source is recorded and the figures were checked against it on the date shown.",
  "source-recorded":
    "A source is recorded, but no verification date has been logged yet.",
  unsourced: "No source is recorded for these figures yet.",
};

/** Returns the URL only if it is a well-formed http(s) URL. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** "https://www.porsche.com/x" -> "porsche.com". */
export function hostLabel(value: string | null | undefined): string | null {
  const url = safeExternalUrl(value);
  if (!url) return null;
  return new URL(url).hostname.replace(/^www\./, "");
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function provenanceStatus(columns: ProvenanceColumns): ProvenanceStatus {
  const hasSource =
    clean(columns.source) !== null || safeExternalUrl(columns.source_url) !== null;
  if (!hasSource) return "unsourced";
  return clean(columns.last_verified_at) ? "verified" : "source-recorded";
}

function section(
  id: ProvenanceSectionId,
  label: string,
  table: string,
  columns: ProvenanceColumns,
): ProvenanceSection {
  const sourceUrl = safeExternalUrl(columns.source_url);
  return {
    id,
    label,
    table,
    status: provenanceStatus(columns),
    source: clean(columns.source) ?? hostLabel(sourceUrl),
    sourceUrl,
    verifiedAt: clean(columns.last_verified_at),
  };
}

/**
 * One entry per block of data this car actually has. A table with no row for
 * the car (an EV has no fuel_specs, a petrol car no ev_specs) is left out: it
 * is not missing provenance, it is not there.
 */
export function buildProvenance(detail: VariantDetail): ProvenanceSection[] {
  const sections: ProvenanceSection[] = [
    section("vehicle", "Vehicle", "car_variants", detail.variant),
  ];
  if (detail.performance)
    sections.push(
      section("performance", "Performance", "performance_specs", detail.performance),
    );
  if (detail.dimensions)
    sections.push(section("dimensions", "Dimensions", "dimensions", detail.dimensions));
  if (detail.engine) sections.push(section("engine", "Engine", "engines", detail.engine));
  if (detail.transmission)
    sections.push(
      section("transmission", "Transmission", "transmissions", detail.transmission),
    );
  if (detail.fuel) sections.push(section("fuel", "Fuel", "fuel_specs", detail.fuel));
  if (detail.ev) sections.push(section("electric", "Electric", "ev_specs", detail.ev));
  return sections;
}

export function summarizeProvenance(sections: readonly ProvenanceSection[]): {
  total: number;
  verified: number;
  sourced: number;
  unsourced: number;
} {
  const count = (status: ProvenanceStatus) =>
    sections.filter((entry) => entry.status === status).length;
  const verified = count("verified");
  return {
    total: sections.length,
    verified,
    // Verified sections are sourced too.
    sourced: verified + count("source-recorded"),
    unsourced: count("unsourced"),
  };
}
