/**
 * Display formatting for specification values.
 *
 * The whole app is built around values that may legitimately be absent, so
 * every formatter here accepts `null | undefined` and returns a consistent
 * placeholder rather than throwing or printing "null".
 */

/** Shown in spec lists where a value is unknown. */
export const NOT_AVAILABLE = "Not available";

/** Shown in dense tables (compare) where the long form would be noise. */
export const EM_DASH = "—";

type Nullish = null | undefined;

function isPresent(value: number | Nullish): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

const numberFormatter = new Intl.NumberFormat("en-IN");

/** 1250 -> "1,250". Returns the placeholder when the value is absent. */
export function formatNumber(
  value: number | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  return isPresent(value) ? numberFormatter.format(value) : placeholder;
}

/** Appends a unit only when there is a value to attach it to. */
export function formatWithUnit(
  value: number | Nullish,
  unit: string,
  placeholder: string = NOT_AVAILABLE,
): string {
  return isPresent(value) ? `${numberFormatter.format(value)} ${unit}` : placeholder;
}

/** Seconds to one decimal place: 3.7 -> "3.7 s". */
export function formatSeconds(
  value: number | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  return isPresent(value) ? `${value.toFixed(1)} s` : placeholder;
}

/**
 * Prices are never converted between currencies — the seed stores each car's
 * price in the currency its maker published, and inventing exchange rates
 * would breach the data-honesty rule. Both parts must be present.
 */
export function formatPrice(
  amount: number | Nullish,
  currency: string | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  if (!isPresent(amount) || !currency) return placeholder;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unrecognised ISO code should degrade, not crash the page.
    return `${currency} ${numberFormatter.format(amount)}`;
  }
}

/** "2019 – 2024", "2019 – present", or just "2019". */
export function formatYearRange(start: number | Nullish, end: number | Nullish): string {
  if (!isPresent(start)) return NOT_AVAILABLE;
  if (!isPresent(end)) return `${start} – present`;
  return start === end ? String(start) : `${start} – ${end}`;
}

/** "twin_turbo" -> "Twin Turbo". For enum values shown as labels. */
export function humanizeEnum(
  value: string | Nullish,
  placeholder = NOT_AVAILABLE,
): string {
  if (!value) return placeholder;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Enum values that are acronyms and must not be title-cased. */
const UPPERCASE_ENUMS = new Set([
  "fwd",
  "rwd",
  "awd",
  "4wd",
  "dct",
  "amt",
  "cvt",
  "wltp",
  "epa",
  "arai",
  "nedc",
  "cltc",
  "ev",
  "suv",
  "mpv",
  "phev",
]);

/** Like humanizeEnum, but leaves acronyms such as "awd" or "wltp" uppercase. */
export function formatEnumLabel(
  value: string | Nullish,
  placeholder = NOT_AVAILABLE,
): string {
  if (!value) return placeholder;
  if (UPPERCASE_ENUMS.has(value)) return value.toUpperCase();
  return humanizeEnum(value, placeholder);
}
