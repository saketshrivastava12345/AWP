/**
 * Number formatting shared by the detail page's server panels and the one
 * client island that animates a figure (CountUp).
 *
 * Both sides must print exactly the same string: the server renders the final
 * value into the HTML, and the client only animates towards it. Keeping the
 * formatter in one dependency-free module is what guarantees that.
 */

const formatters = new Map<number, Intl.NumberFormat>();

/**
 * 1020 -> "1,020", (3.4, 1) -> "3.4". Grouping follows `formatNumber` in
 * lib/format.ts (en-IN), which is identical to en-US below one lakh — every
 * figure on a car page is well below that.
 */
export function formatFigure(value: number, decimals = 0): string {
  let formatter = formatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(decimals, formatter);
  }
  return formatter.format(value);
}

const natural = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/**
 * A figure at the precision it was published with, up to two decimals and no
 * padding: 7.45 -> "7.45", 100 -> "100". For quantities like battery capacity,
 * where rounding 7.45 kWh to "7.5" would restate the source.
 */
export function formatNatural(value: number): string {
  return natural.format(value);
}

/** 1 -> "1st", 22 -> "22nd", 13 -> "13th". */
export function ordinal(value: number): string {
  const n = Math.round(value);
  const lastTwo = Math.abs(n) % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (Math.abs(n) % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * PostgREST returns `numeric` columns as JSON numbers, but a numeric string
 * is legal too. Anything that is not a finite number is treated as absent.
 */
export function toFinite(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
