/**
 * Compare URL state: which cars are in a comparison, and how that is written
 * in the address bar.
 *
 * A compare slug is a variant's full catalogue path, `manufacturer/model/variant`
 * (the same identifier as /cars/manufacturer/model/variant), and a comparison
 * is the repeatable `?car=` parameter:
 *
 *   /compare?car=porsche/911/gt3&car=bmw/m3/m3-competition
 *
 * Pure and client-safe — no server imports — so the picker, the detail page's
 * "Compare with" link and the server route all build and read the same URLs.
 *
 * Normalisation happens in two steps because one of the checks needs the
 * database:
 *
 *   1. prepareCompareSlugs  — shape only: malformed values and duplicates are
 *      dropped, and at most MAX_LOOKUPS candidates go on to be looked up.
 *   2. settleCompareSlugs   — after the lookup: cars that are not in the
 *      catalogue are dropped, then the list is capped at MAX_COMPARE.
 *
 * Capping AFTER the lookup means a stale slug early in a shared link does not
 * push a real car out of the comparison. Every dropped value is reported with
 * its reason so the page can say what it left out instead of silently
 * ignoring it.
 */

export const MAX_COMPARE = 4;
export const MIN_COMPARE = 2;

/** The query parameter a comparison lives in. */
export const COMPARE_PARAM = "car";
/** `?diff=1` opens the comparison with only the differing rows shown. */
export const DIFF_PARAM = "diff";

/**
 * How many candidates are looked up at most. Twice the limit leaves room for
 * a few stale entries without letting a hand-made URL trigger dozens of
 * queries.
 */
export const MAX_LOOKUPS = MAX_COMPARE * 2;

/** Raw values read from the URL at most; anything past this is noise. */
const MAX_RAW_VALUES = 24;

/** Longest raw value echoed back in a notice. */
const MAX_ECHO_LENGTH = 64;

/** Mirrors the `public.slug` domain in 0001_schema.sql. */
const SLUG_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type CompareSlugParts = {
  manufacturer: string;
  model: string;
  variant: string;
};

export type DropReason =
  "invalid" | "duplicate" | "not-found" | "unavailable" | "over-limit";

export type DroppedSlug = {
  /** The value as it appeared in the URL, trimmed and shortened for display. */
  value: string;
  reason: DropReason;
};

/** Plain-language reason, for the notice listing what was left out. */
export const DROP_REASON_LABELS: Record<DropReason, string> = {
  invalid: "not a car address (expected manufacturer/model/variant)",
  duplicate: "already in the comparison",
  "not-found": "not in the catalogue",
  unavailable: "could not be loaded just now",
  "over-limit": `over the ${MAX_COMPARE}-car limit`,
};

/**
 * Parse one value into its three slugs, or null when it is not a well-formed
 * car address.
 *
 * Forgiving about what a person might paste — surrounding slashes, a leading
 * `/cars/`, upper case — and strict about the result: each segment must be a
 * valid slug, so nothing that could not exist in the catalogue reaches the
 * database.
 */
export function parseCompareSlug(value: string): CompareSlugParts | null {
  let path = value.trim().toLowerCase();
  // A full detail-page URL pasted into the address bar: keep only the path.
  path = path.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/, "");
  path = path.replace(/[?#].*$/, "");
  const segments = path.split("/").filter(Boolean);
  if (segments[0] === "cars" && segments.length === 4) segments.shift();
  if (segments.length !== 3) return null;

  const [manufacturer, model, variant] = segments;
  if (!manufacturer || !model || !variant) return null;
  if (![manufacturer, model, variant].every((segment) => SLUG_SEGMENT.test(segment))) {
    return null;
  }
  return { manufacturer, model, variant };
}

/** The canonical `manufacturer/model/variant` form of parsed parts. */
export function formatCompareSlug(parts: CompareSlugParts): string {
  return `${parts.manufacturer}/${parts.model}/${parts.variant}`;
}

/** Compare slug of a catalogue row, or null when any part is missing. */
export function toCompareSlug(car: {
  manufacturer_slug: string | null;
  model_slug: string | null;
  variant_slug: string | null;
}): string | null {
  if (!car.manufacturer_slug || !car.model_slug || !car.variant_slug) return null;
  return `${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;
}

/**
 * Flatten the raw `?car=` value(s) Next hands a page. Accepts the repeated
 * form (`?car=a&car=b`) and, for hand-typed links, a comma-separated one.
 */
export function readCompareParam(raw: string | string[] | undefined | null): string[] {
  if (raw === undefined || raw === null) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Read the differences-only flag. Anything other than an explicit on is off. */
export function readDiffParam(raw: string | string[] | undefined | null): boolean {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "1" || value === "true" || value === "on";
}

function echo(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > MAX_ECHO_LENGTH
    ? `${trimmed.slice(0, MAX_ECHO_LENGTH - 1)}…`
    : trimmed;
}

/**
 * Step 1: shape. Returns the canonical slugs worth looking up, in URL order,
 * and everything dropped on the way.
 */
export function prepareCompareSlugs(values: readonly string[]): {
  candidates: string[];
  dropped: DroppedSlug[];
} {
  const candidates: string[] = [];
  const dropped: DroppedSlug[] = [];
  const seen = new Set<string>();

  values.slice(0, MAX_RAW_VALUES).forEach((value) => {
    const parts = parseCompareSlug(value);
    if (!parts) {
      dropped.push({ value: echo(value), reason: "invalid" });
      return;
    }
    const slug = formatCompareSlug(parts);
    if (seen.has(slug)) {
      dropped.push({ value: echo(value), reason: "duplicate" });
      return;
    }
    seen.add(slug);
    if (candidates.length >= MAX_LOOKUPS) {
      dropped.push({ value: echo(value), reason: "over-limit" });
      return;
    }
    candidates.push(slug);
  });

  if (values.length > MAX_RAW_VALUES) {
    const extra = values.length - MAX_RAW_VALUES;
    dropped.push({
      value: `${extra} more ${extra === 1 ? "entry" : "entries"}`,
      reason: "over-limit",
    });
  }

  return { candidates, dropped };
}

/**
 * Step 2: after the lookup. `status` says what happened to each candidate;
 * a candidate it does not mention is treated as not found.
 */
export function settleCompareSlugs(
  candidates: readonly string[],
  status: (slug: string) => "found" | "not-found" | "unavailable",
): { selected: string[]; dropped: DroppedSlug[] } {
  const selected: string[] = [];
  const dropped: DroppedSlug[] = [];

  for (const slug of candidates) {
    const result = status(slug);
    if (result !== "found") {
      dropped.push({ value: slug, reason: result });
    } else if (selected.length >= MAX_COMPARE) {
      dropped.push({ value: slug, reason: "over-limit" });
    } else {
      selected.push(slug);
    }
  }
  return { selected, dropped };
}

/**
 * The address of a comparison. Slashes inside a slug are left readable
 * (`?car=porsche/911/gt3`), which is valid in a query string; each segment is
 * still encoded, so nothing unexpected can break the URL.
 */
export function compareHref(
  slugs: readonly string[],
  options: { diff?: boolean } = {},
): string {
  const query = slugs
    .map((slug) => {
      const encoded = slug
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      return `${COMPARE_PARAM}=${encoded}`;
    })
    .concat(options.diff && slugs.length > 0 ? [`${DIFF_PARAM}=1`] : []);
  return query.length > 0 ? `/compare?${query.join("&")}` : "/compare";
}

/** The comparison with one car added (ignored when full or already present). */
export function withCar(
  slugs: readonly string[],
  slug: string,
  options: { diff?: boolean } = {},
): string {
  if (slugs.includes(slug) || slugs.length >= MAX_COMPARE) {
    return compareHref(slugs, options);
  }
  return compareHref([...slugs, slug], options);
}

/** The comparison with one car removed. */
export function withoutCar(
  slugs: readonly string[],
  slug: string,
  options: { diff?: boolean } = {},
): string {
  return compareHref(
    slugs.filter((entry) => entry !== slug),
    options,
  );
}

/**
 * Group dropped values by reason, in a stable order, for the notice. Values
 * are de-duplicated within a reason so `?car=x&car=x&car=x` is listed once.
 */
export function summariseDropped(
  dropped: readonly DroppedSlug[],
): { reason: DropReason; label: string; values: string[] }[] {
  const order: DropReason[] = [
    "not-found",
    "unavailable",
    "invalid",
    "duplicate",
    "over-limit",
  ];
  return order
    .map((reason) => ({
      reason,
      label: DROP_REASON_LABELS[reason],
      values: [
        ...new Set(
          dropped.filter((entry) => entry.reason === reason).map((e) => e.value),
        ),
      ],
    }))
    .filter((entry) => entry.values.length > 0);
}
