import type { CarMedia, Part, VariantDetail, ViewerGroup } from "@/types/domain";
import type { Car3DViewerModel } from "@/components/3d/Car3DViewer";
import type { HudEntry } from "@/components/3d/TechnicalHud";
import type { PublishedDimensions } from "@/lib/viewer-dimensions";
import type { TourStop } from "@/lib/anatomy-tour";
import { formatEnumLabel } from "@/lib/format";
import { formatFigure, formatNatural, toFinite } from "./figures";
import { safeExternalUrl } from "./provenance";

/**
 * The interactive viewer's props, derived from one variant's own rows.
 *
 * Pure and server-side: the page computes these once and hands plain data to
 * the client viewer. Every figure is a published one — a missing value is
 * left out of a note or the HUD, never estimated — and a 3D file is described
 * exactly as its car_media row records it.
 */

// ---------------------------------------------------------------------------
// The registered 3D model
// ---------------------------------------------------------------------------

function isGlb(row: CarMedia): boolean {
  return row.type === "glb" && row.url.trim().length > 0;
}

function modelFormat(row: CarMedia): Car3DViewerModel["format"] {
  const recorded = row.model_format?.trim().toLowerCase();
  if (recorded === "gltf") return "gltf";
  if (recorded === "glb") return "glb";
  return /\.gltf(?:$|[?#])/i.test(row.url.trim()) ? "gltf" : "glb";
}

/**
 * The GLB to load: the variant's own first, else one registered for the whole
 * model. `isExact` is the recorded answer to "is this the exact vehicle?" — and
 * only for a file registered against this variant: a model-level file stands in
 * for every variant of the model, so it is never claimed as this exact car.
 */
export function viewerModelFor(
  detail: Pick<VariantDetail, "media" | "modelMedia">,
): Car3DViewerModel | null {
  const own = detail.media.find(isGlb);
  const row = own ?? detail.modelMedia.find(isGlb);
  if (!row) return null;
  const clean = (value: string | null) => value?.trim() || null;
  return {
    url: row.url.trim(),
    isExact: own !== undefined && row.is_exact_model === true,
    format: modelFormat(row),
    compression: row.compression.filter((entry) => entry.trim().length > 0),
    credit: clean(row.credit),
    license: clean(row.license),
    author: clean(row.author),
    sourceUrl: safeExternalUrl(row.source_url),
    posterUrl: clean(row.poster_url),
  };
}

/** The first catalogued photograph — the variant's primary, else the model's. */
export function primaryPhoto(
  detail: Pick<VariantDetail, "media" | "modelMedia">,
): CarMedia | null {
  const isPhoto = (row: CarMedia) => row.type === "image" && row.url.trim().length > 0;
  return detail.media.find(isPhoto) ?? detail.modelMedia.find(isPhoto) ?? null;
}

// ---------------------------------------------------------------------------
// Parts by subsystem
// ---------------------------------------------------------------------------

/**
 * The variant's catalogued parts by viewer group, followed by the general
 * components the anatomy tour names for this layout (chosen by the same rules,
 * so a turbocharger only appears on a boosted engine). Without the second list
 * most panels would be empty simply because little is catalogued per variant.
 */
export function partsByGroupFor(
  detail: Pick<VariantDetail, "parts">,
  tour: readonly TourStop[],
  allParts: readonly Part[],
): Partial<Record<ViewerGroup, Part[]>> {
  const groups: Partial<Record<ViewerGroup, Part[]>> = {};
  const add = (part: Part) => {
    if (!part.viewer_group) return;
    const list = (groups[part.viewer_group] ??= []);
    if (!list.some((entry) => entry.slug === part.slug)) list.push(part);
  };
  for (const { part } of detail.parts) add(part);
  const bySlug = new Map(allParts.map((part) => [part.slug, part]));
  for (const { slug } of tour.flatMap((stop) => stop.components)) {
    const part = bySlug.get(slug);
    if (part) add(part);
  }
  return groups;
}

/** The general components the tour names, in tour order, without repeats. */
export function tourParts(tour: readonly TourStop[], allParts: readonly Part[]): Part[] {
  const bySlug = new Map(allParts.map((part) => [part.slug, part]));
  const seen = new Set<string>();
  const parts: Part[] = [];
  for (const { slug } of tour.flatMap((stop) => stop.components)) {
    const part = bySlug.get(slug);
    if (!part || seen.has(slug)) continue;
    seen.add(slug);
    parts.push(part);
  }
  return parts;
}

/** Part slug → the note catalogued for this variant. */
export function partDetailsFor(detail: Pick<VariantDetail, "parts">): Record<string, string> {
  const notes: Record<string, string> = {};
  for (const { part, detail: note } of detail.parts) {
    if (note?.trim()) notes[part.slug] = note.trim();
  }
  return notes;
}

// ---------------------------------------------------------------------------
// Notes, HUD, dimensions
// ---------------------------------------------------------------------------

const join = (parts: (string | null | undefined | false)[]) =>
  parts.filter((part): part is string => Boolean(part)).join(" · ");

/** "3,996 cc"; at the published precision unless `decimals` is given. */
const withUnit = (
  value: number | string | null | undefined,
  unit: string,
  decimals?: number,
) => {
  const number = toFinite(value);
  if (number === null) return null;
  const text = decimals === undefined ? formatNatural(number) : formatFigure(number, decimals);
  return `${text} ${unit}`;
};

/**
 * One factual line per subsystem, from the variant's specifications. A group
 * with nothing published gets no note at all.
 */
export function groupNotesFor(
  detail: Pick<
    VariantDetail,
    "engine" | "ev" | "transmission" | "dimensions" | "performance" | "variant"
  >,
): Partial<Record<ViewerGroup, string>> {
  const notes: Partial<Record<ViewerGroup, string>> = {};
  const put = (group: ViewerGroup, line: string) => {
    if (line) notes[group] = line;
  };
  const { engine, ev, transmission, dimensions, performance, variant } = detail;

  if (engine) {
    put(
      "engine",
      join([
        engine.name?.trim(),
        engine.configuration?.trim(),
        withUnit(engine.displacement_cc, "cc"),
        formatEnumLabel(engine.aspiration, ""),
        withUnit(engine.redline_rpm, "rpm redline"),
      ]),
    );
  }
  if (ev) {
    const motors = toFinite(ev.motor_count);
    put(
      "battery",
      join([
        withUnit(ev.battery_kwh, "kWh battery"),
        motors === null ? null : `${motors} motor${motors === 1 ? "" : "s"}`,
        ev.range_km && ev.range_standard
          ? `${withUnit(ev.range_km, "km")} (${ev.range_standard.toUpperCase()})`
          : null,
      ]),
    );
  }
  if (transmission) {
    put(
      "transmission",
      join([
        transmission.name?.trim(),
        transmission.gears ? `${transmission.gears} gears` : null,
        formatEnumLabel(variant.drive_type, ""),
      ]),
    );
  }
  if (dimensions) {
    put(
      "body",
      join([
        withUnit(dimensions.length_mm, "mm long"),
        withUnit(dimensions.width_mm, "mm wide"),
        withUnit(dimensions.height_mm, "mm tall"),
        withUnit(dimensions.kerb_weight_kg, "kg kerb weight"),
      ]),
    );
  }
  const braking = toFinite(performance?.braking_100_0_m);
  if (braking !== null) put("brakes", `100–0 km/h in ${formatNatural(braking)} m`);
  return notes;
}

/** The technical read-out: headline figures that are published, in order. */
export function hudFor(detail: Pick<VariantDetail, "performance" | "ev">): HudEntry[] {
  const p = detail.performance;
  const entries: (HudEntry | null)[] = [
    entryOf("Power", withUnit(p?.power_hp, "hp")),
    entryOf("Torque", withUnit(p?.torque_nm, "Nm")),
    entryOf("0–100", withUnit(p?.zero_to_100_s, "s", 1)),
    entryOf("Top speed", withUnit(p?.top_speed_kmh, "km/h")),
    entryOf("Range", withUnit(detail.ev?.range_km, "km")),
  ];
  return entries.filter((entry): entry is HudEntry => entry !== null);
}

function entryOf(label: string, value: string | null): HudEntry | null {
  return value ? { label, value } : null;
}

/** Only the published measurements the viewer can draw; null without a row. */
export function viewerDimensionsFor(
  detail: Pick<VariantDetail, "dimensions">,
): PublishedDimensions | null {
  const d = detail.dimensions;
  if (!d) return null;
  return {
    length_mm: toFinite(d.length_mm),
    width_mm: toFinite(d.width_mm),
    height_mm: toFinite(d.height_mm),
    wheelbase_mm: toFinite(d.wheelbase_mm),
    ground_clearance_mm: toFinite(d.ground_clearance_mm),
  };
}

const CARBON_CERAMIC = /carbon[\s-]*ceramic/i;
const OPTIONAL = /\boption(al)?\b/i;

/**
 * Carbon-ceramic brakes, only when this variant catalogues them — as the
 * carbon-ceramic disc part or the carbon-ceramic brakes feature — and the
 * note does not describe them as an option.
 */
export function hasCarbonCeramicBrakes(
  detail: Pick<VariantDetail, "parts" | "features">,
): boolean {
  const standard = (note: string | null) => !note || !OPTIONAL.test(note);
  const part = detail.parts.some(
    ({ part, detail: note }) =>
      (part.slug === "carbon-ceramic-disc" || CARBON_CERAMIC.test(part.name)) &&
      standard(note),
  );
  if (part) return true;
  return detail.features.some(
    ({ feature, detail: note }) =>
      (feature.slug === "carbon-ceramic-brakes" || CARBON_CERAMIC.test(feature.name)) &&
      standard(note),
  );
}
