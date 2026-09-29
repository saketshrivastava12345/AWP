/**
 * Pure formatting for CountUp. The number a CountUp shows at rest is always
 * the caller's own string (or the number formatted here, deterministically —
 * no Intl, so server and browser can never disagree). While counting, the
 * intermediate values are formatted in the same shape: same prefix and
 * suffix, same decimals, same digit grouping.
 */

export type Grouping = "none" | "western" | "indian";

export type CountSpec = {
  /** The real value, the number the animation ends on. */
  target: number;
  decimals: number;
  grouping: Grouping;
  /** Text before the digits ("₹ ", "−", "~"). */
  prefix: string;
  /** Text after the digits (" hp", "+", "%"). */
  suffix: string;
  /** The exact string shown at rest. */
  final: string;
};

function groupDigits(digits: string, grouping: Grouping): string {
  if (grouping === "none" || digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let head = digits.slice(0, -3);
  const size = grouping === "indian" ? 2 : 3;
  const parts: string[] = [];
  while (head.length > size) {
    parts.unshift(head.slice(-size));
    head = head.slice(0, -size);
  }
  if (head) parts.unshift(head);
  return [...parts, last3].join(",");
}

/** Formats `n` with fixed decimals and the given digit grouping. */
export function formatCount(n: number, decimals: number, grouping: Grouping): string {
  const negative = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int = "0", frac] = fixed.split(".");
  const body = groupDigits(int, grouping) + (frac ? `.${frac}` : "");
  return negative ? `-${body}` : body;
}

const NUMBER_IN_TEXT = /^([^\d]*?)(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d+))?(.*)$/s;

/**
 * Reads a CountUp value. A string is parsed for its first number, keeping
 * everything around it; a number is formatted with `decimals` (default: as
 * many as it has, up to 2) and western grouping from 10,000. Returns null
 * when there is nothing to count (no digits) — the caller then shows the
 * string as is.
 */
export function parseCount(value: number | string, decimals?: number): CountSpec | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const places = decimals ?? Math.min(2, (String(value).split(".")[1] ?? "").length);
    const grouping: Grouping = Math.abs(value) >= 10000 ? "western" : "none";
    return {
      target: value,
      decimals: places,
      grouping,
      prefix: "",
      suffix: "",
      final: formatCount(value, places, grouping),
    };
  }

  const match = NUMBER_IN_TEXT.exec(value);
  if (!match) return null;
  const [, prefix = "", intPart = "", fracPart, suffix = ""] = match;
  let grouping: Grouping = "none";
  if (intPart.includes(",")) {
    const groups = intPart.split(",").slice(1, -1);
    grouping = groups.some((g) => g.length === 2) ? "indian" : "western";
  }
  const places = fracPart ? fracPart.length : 0;
  const target = Number(intPart.replaceAll(",", "") + (fracPart ? `.${fracPart}` : ""));
  if (!Number.isFinite(target)) return null;
  return { target, decimals: places, grouping, prefix, suffix, final: value };
}
