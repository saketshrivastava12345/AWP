/**
 * Pure helpers behind AutoScaleNumberInput: the raw ⇄ display conversions,
 * the caret bookkeeping and the currency affixes. No DOM, no React, so all
 * of it is unit-tested in vitest.
 *
 * Vocabulary
 * - raw:     the canonical numeric string the form submits — ASCII digits
 *            with at most one "." ("1250000", "1250.5", "0.", "").
 * - display: what the visible input shows — the raw value grouped and
 *            punctuated for a locale ("12,50,000" en-IN, "1.250.000,5" de-DE).
 *
 * Nothing here is ever rounded: the raw string is what the person typed,
 * capped in length, never converted to a float on the way through.
 */

export type Separators = {
  /** The digit-group separator ("," en-IN, "." de-DE, " " fr-FR). */
  group: string;
  /** The decimal separator ("." en-IN, "," de-DE). */
  decimal: string;
};

export type Affixes = {
  /** Text drawn before the digits ("₹", "$"). */
  prefix: string;
  /** Text drawn after the digits (" €"). */
  suffix: string;
};

export type SanitizeOptions = {
  /** Characters that read as a decimal point in the text being sanitised. */
  decimal: string;
  /** Maximum number of integer digits; extra digits are dropped. */
  maxDigits: number;
  /** Maximum number of fraction digits; 0 refuses the decimal point. */
  decimals: number;
};

const ASCII_DIGIT = /[0-9]/;

const separatorCache = new Map<string, Separators>();
const affixCache = new Map<string, Affixes>();

/** The group and decimal separators a locale uses (memoised per locale). */
export function localeSeparators(locale: string): Separators {
  const cached = separatorCache.get(locale);
  if (cached) return cached;
  let result: Separators = { group: ",", decimal: "." };
  try {
    const parts = new Intl.NumberFormat(locale).formatToParts(1234567.8);
    const group = parts.find((part) => part.type === "group")?.value;
    const decimal = parts.find((part) => part.type === "decimal")?.value;
    result = { group: group ?? "", decimal: decimal ?? "." };
  } catch {
    // An unknown locale keeps the ASCII defaults.
  }
  separatorCache.set(locale, result);
  return result;
}

/**
 * Where a locale puts the currency symbol: "₹" before the digits for en-IN,
 * " €" after them for de-DE. Empty on both sides without a currency or
 * when Intl cannot format the pair.
 */
export function currencyAffixes(currency: string | undefined, locale: string): Affixes {
  if (!currency) return { prefix: "", suffix: "" };
  const key = `${locale}|${currency}`;
  const cached = affixCache.get(key);
  if (cached) return cached;
  let result: Affixes = { prefix: "", suffix: "" };
  try {
    let parts: Intl.NumberFormatPart[];
    try {
      parts = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(0);
    } catch {
      parts = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
      }).formatToParts(0);
    }
    const first = parts.findIndex((part) => part.type === "integer");
    const isNumberPart = (part: Intl.NumberFormatPart) =>
      part.type === "integer" ||
      part.type === "group" ||
      part.type === "decimal" ||
      part.type === "fraction";
    let last = -1;
    parts.forEach((part, index) => {
      if (isNumberPart(part)) last = index;
    });
    if (first !== -1 && last !== -1) {
      result = {
        prefix: parts
          .slice(0, first)
          .map((part) => part.value)
          .join(""),
        suffix: parts
          .slice(last + 1)
          .map((part) => part.value)
          .join(""),
      };
    }
  } catch {
    // Unknown currency or locale: no affix rather than a wrong one.
  }
  affixCache.set(key, result);
  return result;
}

/**
 * Reduces any typed or pasted text to a raw numeric string.
 *
 * - Every character that is not an ASCII digit or the locale's decimal
 *   separator is dropped (group separators, currency symbols, spaces,
 *   letters). Unicode digits are not translated, they are dropped too.
 * - Only the first decimal separator counts; with `decimals: 0` the text
 *   is cut at it, so pasting "12,50,000.00" into a whole-number field gives
 *   1250000, not 125000000.
 * - Leading zeros go ("007" → "7"), except the one that precedes a decimal
 *   point ("0.5"); a bare "." becomes "0.".
 * - The integer part is capped at `maxDigits` and the fraction at `decimals`.
 */
export function sanitizeRaw(text: string, options: SanitizeOptions): string {
  const { decimal, maxDigits, decimals } = options;
  let integer = "";
  let fraction = "";
  let seenDecimal = false;
  for (const ch of text) {
    if (ASCII_DIGIT.test(ch)) {
      if (seenDecimal) fraction += ch;
      else integer += ch;
    } else if (isDecimalChar(ch, decimal)) {
      if (decimals === 0) break;
      if (!seenDecimal) seenDecimal = true;
    }
  }
  integer = integer.replace(/^0+(?=\d)/, "");
  if (integer.length > maxDigits) integer = integer.slice(0, maxDigits);
  if (fraction.length > decimals) fraction = fraction.slice(0, decimals);
  if (!seenDecimal) return integer;
  if (integer === "") integer = "0";
  return `${integer}.${fraction}`;
}

/**
 * The locale's own decimal separator always reads as a decimal point. So
 * does "." — every keyboard's decimal key produces it — unless the locale
 * writes decimals with a comma, where "." is the group separator instead
 * ("1.250.000,50" in de-DE).
 */
export function isDecimalChar(ch: string, decimal: string): boolean {
  if (ch === decimal) return true;
  return ch === "." && decimal !== ",";
}

/**
 * Formats a raw numeric string for display: integer digits grouped the
 * locale's way (en-IN: 12,50,000; en-US: 1,250,000; de-DE: 1.250.000), the
 * fraction appended exactly as typed after the locale's decimal separator.
 * A trailing decimal point survives ("1,250." while the person is typing).
 */
export function formatRaw(raw: string, locale: string): string {
  if (raw === "") return "";
  const { decimal } = localeSeparators(locale);
  const [integerPart = "", fractionPart] = raw.split(".");
  const grouped = groupInteger(integerPart, locale);
  if (fractionPart === undefined) return grouped;
  return `${grouped}${decimal}${fractionPart}`;
}

function groupInteger(digits: string, locale: string): string {
  if (digits === "") return "";
  try {
    const formatter = new Intl.NumberFormat(locale, {
      useGrouping: true,
      maximumFractionDigits: 0,
    });
    // BigInt keeps every digit exact well past Number's 15–16 significant
    // digits; a locale that cannot format a BigInt falls through to Number.
    try {
      return formatter.format(BigInt(digits));
    } catch {
      return formatter.format(Number(digits));
    }
  } catch {
    return digits;
  }
}

/**
 * The number of "significant" characters — digits, plus the decimal
 * separator when decimals are allowed — in `text` before `index`. Group
 * separators and affixes are not significant: they come and go as the
 * value is reformatted, which is exactly why the caret cannot be tracked
 * by string index.
 */
export function countSignificant(
  text: string,
  index: number,
  decimal: string,
  decimals: number,
): number {
  let count = 0;
  const limit = Math.min(index, text.length);
  for (let i = 0; i < limit; i += 1) {
    const ch = text.charAt(i);
    if (ASCII_DIGIT.test(ch) || (decimals > 0 && isDecimalChar(ch, decimal))) {
      count += 1;
    }
  }
  return count;
}

/**
 * Maps a caret from the text the person just edited to the reformatted
 * text: the caret stays after the same number of significant characters, so
 * typing "3" into "12|,50,000" yields "1,23|,50,000" and not a caret thrown
 * to the end by React's value update.
 */
export function mapCaret(
  oldText: string,
  oldCaret: number,
  newText: string,
  decimal: string,
  decimals: number,
): number {
  const wanted = countSignificant(oldText, oldCaret, decimal, decimals);
  if (wanted === 0) return 0;
  let seen = 0;
  for (let i = 0; i < newText.length; i += 1) {
    const ch = newText.charAt(i);
    if (ASCII_DIGIT.test(ch) || (decimals > 0 && ch === decimal)) {
      seen += 1;
      if (seen === wanted) return i + 1;
    }
  }
  return newText.length;
}

/** The raw string as a number, or null when it is empty ("0." reads as 0). */
export function rawToNumber(raw: string): number | null {
  if (raw === "") return null;
  const value = Number(raw.endsWith(".") ? raw.slice(0, -1) : raw);
  return Number.isFinite(value) ? value : null;
}

/** Integer digits in a raw string ("1250.5" → 4). */
export function integerDigits(raw: string): number {
  const dot = raw.indexOf(".");
  return dot === -1 ? raw.length : dot;
}
