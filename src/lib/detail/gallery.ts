import type { CarMedia, MediaShot } from "@/types/domain";
import { safeExternalUrl } from "./provenance";

/**
 * The photograph gallery, as data.
 *
 * Photographs come from `car_media` (type 'image'): the variant's own first,
 * then any registered once for the whole model. They are grouped by the shot
 * the editor recorded, and every one carries its credit — CC BY and CC BY-SA
 * require attribution, so a photograph without a visible credit is not an
 * option. Nothing here ever supplies a photograph that is not in the table.
 */

export type GalleryGroupId = "exterior" | "interior" | "engine" | "wheels" | "details";

export const GALLERY_GROUPS: readonly { id: GalleryGroupId; label: string }[] = [
  { id: "exterior", label: "Exterior" },
  { id: "interior", label: "Interior" },
  { id: "engine", label: "Engine" },
  { id: "wheels", label: "Wheels" },
  { id: "details", label: "Details" },
];

const SHOT_GROUP: Record<MediaShot, GalleryGroupId> = {
  hero: "exterior",
  front: "exterior",
  rear: "exterior",
  side: "exterior",
  three_quarter: "exterior",
  gallery: "exterior",
  interior: "interior",
  dashboard: "interior",
  engine: "engine",
  wheel: "wheels",
  detail: "details",
};

const SHOT_LABEL: Record<MediaShot, string> = {
  hero: "Exterior",
  front: "Front",
  rear: "Rear",
  side: "Side profile",
  three_quarter: "Three-quarter",
  gallery: "Exterior",
  interior: "Interior",
  dashboard: "Dashboard",
  engine: "Engine",
  wheel: "Wheel",
  detail: "Detail",
};

/** A photograph with no recorded shot is an exterior view: that is what the catalogue holds. */
export function galleryGroupOf(shot: MediaShot | null): GalleryGroupId {
  return shot ? SHOT_GROUP[shot] : "exterior";
}

export function shotLabel(shot: MediaShot | null): string {
  return shot ? SHOT_LABEL[shot] : "Exterior";
}

// ---------------------------------------------------------------------------
// Credits
// ---------------------------------------------------------------------------

export type GalleryCredit = {
  author: string | null;
  license: string | null;
  licenseUrl: string | null;
  /** Where the photograph was published, e.g. "Wikimedia Commons". */
  sourceName: string | null;
  sourceUrl: string | null;
  /** The legacy free-text credit, shown verbatim when it could not be read. */
  text: string | null;
};

/**
 * Deed URL for a Creative Commons licence name ("CC BY-SA 4.0", "CC0"), so
 * the credit can link to the licence as the licences themselves ask. Returns
 * null for anything else rather than guessing.
 */
export function licenseUrl(license: string | null | undefined): string | null {
  if (!license) return null;
  const name = license.trim().toUpperCase().replace(/\s+/g, " ");
  if (/^CC0( 1\.0)?$/.test(name) || name === "CC ZERO") {
    return "https://creativecommons.org/publicdomain/zero/1.0/";
  }
  if (name === "PUBLIC DOMAIN" || name === "PDM" || name === "PD") {
    return "https://creativecommons.org/publicdomain/mark/1.0/";
  }
  const match = /^CC[ -]?(BY(?:-NC)?(?:-SA|-ND)?)[ -]?(\d\.\d)$/.exec(name);
  if (!match) return null;
  const [, terms, version] = match;
  if (!terms || !version) return null;
  return `https://creativecommons.org/licenses/${terms.toLowerCase()}/${version}/`;
}

/**
 * The legacy `credit` column holds strings written by scripts/fetch-images.mjs
 * in one fixed shape: "Photo: <author> / <source> (<licence>)". Reading it
 * back lets old rows link their licence too. Any other text is left alone.
 */
export function parseLegacyCredit(
  text: string | null | undefined,
): { author: string; sourceName: string; license: string | null } | null {
  if (!text) return null;
  const match = /^Photo:\s*(.+?)\s*\/\s*(.+?)\s*(?:\(([^()]+)\))?\s*$/.exec(text.trim());
  if (!match) return null;
  const [, author, sourceName, license] = match;
  if (!author || !sourceName) return null;
  return { author, sourceName, license: license?.trim() || null };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * The credit for one photograph. The structured columns (author, license,
 * source, source_url) win; the legacy free text fills in only what they lack.
 * Null only when nothing at all is recorded.
 */
export function mediaCredit(
  media: Pick<CarMedia, "author" | "license" | "source" | "source_url" | "credit">,
): GalleryCredit | null {
  const legacy = parseLegacyCredit(media.credit);
  const author = clean(media.author) ?? legacy?.author ?? null;
  const license = clean(media.license) ?? legacy?.license ?? null;
  const sourceUrl = safeExternalUrl(media.source_url);
  const sourceName =
    clean(media.source) ??
    legacy?.sourceName ??
    (sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, "") : null);

  // The free text is only needed when it could not be read into fields.
  const text = legacy ? null : clean(media.credit);

  if (!author && !license && !sourceName && !sourceUrl && !text) return null;
  return {
    author,
    license,
    licenseUrl: licenseUrl(license),
    sourceName,
    sourceUrl,
    text,
  };
}

/** One line of plain text, for alt-adjacent captions and aria labels. */
export function creditLine(credit: GalleryCredit | null): string | null {
  if (!credit) return null;
  if (credit.text && !credit.author && !credit.license) return credit.text;
  const parts = [
    credit.author ? `Photo: ${credit.author}` : null,
    credit.sourceName,
    credit.license,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : credit.text;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
  group: GalleryGroupId;
  shot: string;
  /** Registered for this variant, or once for the whole model. */
  scope: "variant" | "model";
  credit: GalleryCredit | null;
};

/** A photograph as handed to the client gallery: plus whether next/image may optimise it. */
export type GalleryItem = GalleryImage & { optimize: boolean };

export type GalleryData = {
  images: GalleryImage[];
  /** Only groups that have at least one photograph, in display order. */
  groups: { id: GalleryGroupId; label: string; count: number }[];
};

/**
 * Photographs for the gallery: the variant's own in their display order, then
 * the model's, de-duplicated by URL and grouped by shot. `carName` is used for
 * alt text only when a row has none of its own.
 */
export function buildGallery(
  media: readonly CarMedia[],
  modelMedia: readonly CarMedia[],
  carName: string,
): GalleryData {
  const seen = new Set<string>();
  const collected: GalleryImage[] = [];

  const take = (rows: readonly CarMedia[], scope: GalleryImage["scope"]) => {
    for (const row of rows) {
      if (row.type !== "image") continue;
      const url = row.url.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const label = shotLabel(row.shot);
      collected.push({
        id: row.id,
        url,
        alt: clean(row.alt) ?? `${carName} — ${label.toLowerCase()} photograph`,
        width: row.width,
        height: row.height,
        group: galleryGroupOf(row.shot),
        shot: label,
        scope,
        credit: mediaCredit(row),
      });
    }
  };
  take(media, "variant");
  take(modelMedia, "model");

  // Group order is fixed (exterior first); order within a group is preserved.
  const images = GALLERY_GROUPS.flatMap((group) =>
    collected.filter((image) => image.group === group.id),
  );
  const groups = GALLERY_GROUPS.map((group) => ({
    ...group,
    count: images.filter((image) => image.group === group.id).length,
  })).filter((group) => group.count > 0);

  return { images, groups };
}

/**
 * Whether next/image may optimise a URL: local files, and the configured
 * Supabase project's public storage (the only remote pattern next.config.ts
 * allows). Anything else is shown as-is rather than crashing the page.
 */
export function isOptimizableImage(
  url: string,
  supabaseUrl: string | null | undefined,
): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  if (!supabaseUrl) return false;
  try {
    const base = new URL(supabaseUrl);
    const target = new URL(url);
    return (
      target.origin === base.origin &&
      target.pathname.startsWith("/storage/v1/object/public/")
    );
  } catch {
    return false;
  }
}
