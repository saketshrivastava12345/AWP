import { describe, expect, it } from "vitest";
import type { HistoryPoint } from "./engine";
import { dayNumber, nearestPointIndex, niceTicks, stepChart } from "./chart";

// Arbitrary test amounts, not prices.
function point(date: string, amount: number, until: string | null = null): HistoryPoint {
  return {
    id: date,
    date,
    until,
    amount,
    currency: "INR",
    source: "Test source",
    source_url: "https://example.com/test",
    last_verified_at: "2026-09-01",
  };
}

describe("dayNumber", () => {
  it("counts whole UTC days", () => {
    expect(dayNumber("2026-01-02") - dayNumber("2026-01-01")).toBe(1);
    expect(dayNumber("2026-03-01") - dayNumber("2026-02-01")).toBe(28);
  });
});

describe("niceTicks", () => {
  it("brackets the data with round steps", () => {
    const { lo, hi, ticks } = niceTicks(40_056_600, 41_464_600);
    expect(lo).toBeLessThanOrEqual(40_056_600);
    expect(hi).toBeGreaterThanOrEqual(41_464_600);
    expect(ticks).toEqual([40_000_000, 40_500_000, 41_000_000, 41_500_000]);
  });

  it("gives a flat series a band to sit in", () => {
    const { lo, hi, ticks } = niceTicks(1000, 1000);
    expect(lo).toBeLessThan(1000);
    expect(hi).toBeGreaterThan(1000);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });

  it("never leaks float noise into tick values", () => {
    const { ticks } = niceTicks(0.1, 0.7);
    for (const tick of ticks) expect(String(tick).length).toBeLessThan(6);
  });
});

describe("stepChart", () => {
  const history = [
    point("2026-01-10", 100),
    point("2026-05-01", 120),
    point("2026-08-15", 110),
  ];

  it("draws nothing for fewer than two observations", () => {
    expect(stepChart([], "2026-09-27")).toBeNull();
    expect(stepChart([point("2026-01-10", 100)], "2026-09-27")).toBeNull();
  });

  it("holds each price until the next one, then steps", () => {
    const chart = stepChart(history, null)!;
    const [a, b, c] = chart.points;
    expect(chart.path).toBe(`M${a!.x} ${a!.y} H${b!.x} V${b!.y} H${c!.x} V${c!.y}`);
    // Oldest first, spread across the plot.
    expect(a!.x).toBeLessThan(b!.x);
    expect(b!.x).toBeLessThan(c!.x);
    // Higher price, higher on screen (smaller y).
    expect(b!.y).toBeLessThan(a!.y);
  });

  it("extends the latest figure to today, because it is still in force", () => {
    const chart = stepChart(history, "2026-09-27")!;
    const last = chart.points[2]!;
    expect(chart.end).toMatchObject({ date: "2026-09-27", isToday: true });
    expect(chart.path.endsWith(`H${chart.end.x}`)).toBe(true);
    expect(last.x).toBeLessThan(chart.end.x);
  });

  it("sorts input and records each point's previous amount", () => {
    const chart = stepChart([...history].reverse(), null)!;
    expect(chart.points.map((p) => p.date)).toEqual([
      "2026-01-10",
      "2026-05-01",
      "2026-08-15",
    ]);
    expect(chart.points.map((p) => p.previous)).toEqual([null, 100, 120]);
  });

  it("breaks the line where the source ended a price before the next began", () => {
    const gapped = [point("2026-01-01", 100, "2026-02-28"), point("2026-05-01", 120)];
    const chart = stepChart(gapped, null)!;
    expect(chart.path).toMatch(/H[\d.]+ M/);
    // No gap when the next price starts the day after the end date.
    const joined = [point("2026-01-01", 100, "2026-04-30"), point("2026-05-01", 120)];
    expect(stepChart(joined, null)!.path).not.toMatch(/ M/);
  });

  it("stops at an end date in the past rather than running to today", () => {
    const ended = [point("2026-01-01", 100), point("2026-05-01", 120, "2026-06-30")];
    const chart = stepChart(ended, "2026-09-27")!;
    expect(chart.end).toMatchObject({ date: "2026-06-30", isToday: false });
  });

  it("keeps every coordinate inside the plot box", () => {
    const chart = stepChart(history, "2026-09-27")!;
    for (const p of chart.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });
});

describe("nearestPointIndex", () => {
  it("snaps to the closest x", () => {
    const points = [{ x: 3 }, { x: 40 }, { x: 90 }];
    expect(nearestPointIndex(points, 0)).toBe(0);
    expect(nearestPointIndex(points, 50)).toBe(1);
    expect(nearestPointIndex(points, 99)).toBe(2);
  });
});
