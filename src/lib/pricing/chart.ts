import type { HistoryPoint } from "./engine";

/**
 * Geometry for the price-history step chart. Pure, so the scales and the
 * shape of the line are tested without a DOM.
 *
 * A price is in force from its effective date until the next one replaces
 * it, so the honest shape is a STEP (hold the value, then jump), not a
 * sloped line that would imply the price drifted between observations. Where
 * a source gave a figure an end date and nothing followed straight away, the
 * line stops there instead of implying the old price still applied.
 *
 * Coordinates are percentages of the plot box (y grows downwards), so the SVG
 * can stretch to any width while the HTML labels and markers stay crisp.
 */

const DAY_MS = 86_400_000;

/** Whole UTC days since the epoch for a YYYY-MM-DD date. */
export function dayNumber(date: string): number {
  return Math.round(
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
    ) / DAY_MS,
  );
}

function niceNumber(value: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  let nice: number;
  if (round) nice = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10;
  else nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/**
 * Round-number ticks that bracket [min, max]: e.g. 40,056,600–41,464,600
 * gives 40,000,000 / 40,500,000 / 41,000,000 / 41,500,000.
 */
export function niceTicks(
  min: number,
  max: number,
  target = 4,
): { lo: number; hi: number; ticks: number[] } {
  let low = Math.min(min, max);
  let high = Math.max(min, max);
  if (high === low) {
    // A flat history still needs a band to sit in.
    const pad = Math.abs(high) * 0.02 || 1;
    low -= pad;
    high += pad;
  }
  const step = niceNumber(niceNumber(high - low, false) / Math.max(1, target - 1), true);
  const lo = Math.floor(low / step) * step;
  const hi = Math.ceil(high / step) * step;
  const ticks: number[] = [];
  // Rounded to the step's precision so float noise never reaches a label.
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  for (let value = lo; value <= hi + step / 2; value += step) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return { lo, hi, ticks };
}

export type PlottedPoint = HistoryPoint & {
  /** 0–100, left to right. */
  x: number;
  /** 0–100, top to bottom. */
  y: number;
  /** The previous observation's amount, for the change readout. */
  previous: number | null;
};

export type StepChart = {
  points: PlottedPoint[];
  /** SVG path data in the 0–100 box. */
  path: string;
  ticks: { value: number; y: number }[];
  /** The right-hand end of the time axis. */
  end: { date: string; isToday: boolean; x: number };
  start: { date: string; x: number };
};

/** Horizontal inset so the first and last markers are not cut by the edge. */
const X_MIN = 3;
const X_MAX = 97;
/** Vertical inset inside the tick band. */
const Y_TOP = 6;
const Y_BOTTOM = 94;

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Lays out a step chart. `today` ("YYYY-MM-DD", or null when unknown) extends
 * the last step to the present, because the latest figure is still in force.
 * Returns null for fewer than two points: one observation is not a history.
 */
export function stepChart(
  history: readonly HistoryPoint[],
  today: string | null,
): StepChart | null {
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  const lastEnd = last.until && last.until < (today ?? last.date) ? last.until : null;
  const endDate = lastEnd ?? (today && today > last.date ? today : last.date);
  const isToday = lastEnd === null && today !== null && today > last.date;

  const t0 = dayNumber(first.date);
  const t1 = Math.max(dayNumber(endDate), t0 + 1);
  const xOf = (date: string) =>
    round2(X_MIN + ((dayNumber(date) - t0) / (t1 - t0)) * (X_MAX - X_MIN));

  const amounts = sorted.map((point) => point.amount);
  const { lo, hi, ticks } = niceTicks(Math.min(...amounts), Math.max(...amounts));
  const yOf = (value: number) =>
    round2(Y_BOTTOM - ((value - lo) / (hi - lo)) * (Y_BOTTOM - Y_TOP));

  const points: PlottedPoint[] = sorted.map((point, index) => ({
    ...point,
    x: xOf(point.date),
    y: yOf(point.amount),
    previous: index > 0 ? sorted[index - 1]!.amount : null,
  }));

  const commands: string[] = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    if (index === 0) commands.push(`M${point.x} ${point.y}`);

    if (!next) {
      const endX = lastEnd ? xOf(lastEnd) : xOf(endDate);
      if (endX > point.x) commands.push(`H${endX}`);
      return;
    }

    // A gap: the source ended this figure more than a day before the next
    // one began. Stop the line at the end date and resume at the next point.
    const gap = point.until !== null && dayNumber(next.date) - dayNumber(point.until) > 1;
    if (gap) {
      commands.push(`H${xOf(point.until!)}`, `M${next.x} ${next.y}`);
    } else {
      commands.push(`H${next.x}`, `V${next.y}`);
    }
  });

  return {
    points,
    path: commands.join(" "),
    ticks: ticks.map((value) => ({ value, y: yOf(value) })),
    end: { date: endDate, isToday, x: xOf(endDate) },
    start: { date: first.date, x: xOf(first.date) },
  };
}

/** Index of the point whose x is nearest `x` (0–100). */
export function nearestPointIndex(points: readonly { x: number }[], x: number): number {
  let best = 0;
  let bestDistance = Infinity;
  points.forEach((point, index) => {
    const distance = Math.abs(point.x - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
