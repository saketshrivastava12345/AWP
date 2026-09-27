import { describe, expect, it } from "vitest";
import {
  footprintLabel,
  hasCompleteDimensions,
  mostRecorded,
  pickHeroCandidate,
  stripOrder,
  type DimensionRow,
} from "./home-data";

const full = (id: string): DimensionRow => ({
  variant_id: id,
  length_mm: 4500,
  width_mm: 1900,
  height_mm: 1300,
  wheelbase_mm: 2600,
});

describe("hasCompleteDimensions", () => {
  it("needs all four published, positive figures", () => {
    expect(hasCompleteDimensions(full("a"))).toBe(true);
    expect(hasCompleteDimensions({ ...full("a"), wheelbase_mm: null })).toBe(false);
    expect(hasCompleteDimensions({ ...full("a"), height_mm: 0 })).toBe(false);
    expect(hasCompleteDimensions(undefined)).toBe(false);
  });
});

describe("pickHeroCandidate", () => {
  const featured = [{ variant_id: "a" }, { variant_id: "b" }, { variant_id: "c" }];

  it("takes the first featured car with complete dimensions", () => {
    const dims = [{ ...full("a"), width_mm: null }, full("b"), full("c")];
    expect(pickHeroCandidate(featured, dims)).toEqual({
      car: { variant_id: "b" },
      complete: true,
    });
  });

  it("falls back to the first featured car and says it is incomplete", () => {
    expect(pickHeroCandidate(featured, [])).toEqual({
      car: { variant_id: "a" },
      complete: false,
    });
  });

  it("skips rows without an id and returns null with nothing to choose", () => {
    expect(pickHeroCandidate([{ variant_id: null }], [])).toBeNull();
    expect(pickHeroCandidate([], [])).toBeNull();
  });
});

describe("stripOrder", () => {
  it("drops makers without published cars and ranks by count, then name", () => {
    const makers = [
      { name: "Zeta", variant_count: 2 },
      { name: "alpha", variant_count: 2 },
      { name: "Empty", variant_count: 0 },
      { name: "Big", variant_count: 5 },
    ];
    expect(stripOrder(makers).map((maker) => maker.name)).toEqual([
      "Big",
      "alpha",
      "Zeta",
    ]);
  });
});

describe("mostRecorded", () => {
  it("never lists a part no published car records", () => {
    const parts = [
      { name: "Disc", usageCount: 4 },
      { name: "Pad", usageCount: 0 },
      { name: "Caliper", usageCount: 4 },
      { name: "Turbo", usageCount: 9 },
    ];
    expect(mostRecorded(parts, 3).map((part) => part.name)).toEqual([
      "Turbo",
      "Caliper",
      "Disc",
    ]);
    expect(mostRecorded(parts, 10)).toHaveLength(3);
  });
});

describe("footprintLabel", () => {
  it("prints L × W × H only when all three are published", () => {
    const format = (value: number) => String(value);
    expect(footprintLabel(full("a"), format)).toBe("4500 × 1900 × 1300 mm");
    expect(footprintLabel({ ...full("a"), width_mm: null }, format)).toBeNull();
  });
});
