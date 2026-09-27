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
  amount: number | string | Nullish,
  currency: string | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  const value = toAmount(amount);
  if (value === null || !currency) return placeholder;
  try {
    return new Intl.NumberFormat(localeForCurrency(currency), {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    // An unrecognised ISO code should degrade, not crash the page.
    return `${currency} ${numberFormatter.format(value)}`;
  }
}

/**
 * Digit grouping follows the currency's own convention: rupees group in lakhs
 * ("₹2,80,00,000"), everything else in thousands ("$161,100"). Grouping a
 * dollar figure the Indian way reads as a different number.
 */
function localeForCurrency(currency: string): string {
  return currency.toUpperCase() === "INR" ? "en-IN" : "en-US";
}

/** PostgREST returns numeric columns as numbers or numeric strings. */
function toAmount(amount: number | string | Nullish): number | null {
  if (amount === null || amount === undefined) return null;
  const value = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(value) ? value : null;
}

/**
 * Short form for cards and chips: "₹2.80 Cr", "₹45.60 L", "$161K". Rupee
 * amounts use lakh and crore, the way car prices are quoted in India.
 */
export function formatPriceCompact(
  amount: number | string | Nullish,
  currency: string | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  const value = toAmount(amount);
  if (value === null || !currency) return placeholder;
  if (currency.toUpperCase() === "INR") {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
    return formatPrice(value, currency, placeholder);
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: value >= 1e5 ? "compact" : "standard",
      maximumFractionDigits: value >= 1e5 ? 1 : 0,
    }).format(value);
  } catch {
    return formatPrice(value, currency, placeholder);
  }
}

/** "2026-09-12" (or an ISO timestamp) -> "12 Sep 2026". Dates are shown in UTC. */
export function formatDate(
  value: string | Nullish,
  placeholder: string = NOT_AVAILABLE,
): string {
  if (!value) return placeholder;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return placeholder;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
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
