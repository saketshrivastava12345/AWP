import { describe, expect, it } from "vitest";
import { orderRelated, powerBand, type RelatedCandidate } from "./related";

const car = (variant_id: string, power_hp: number | null): RelatedCandidate => ({
  variant_id,
  power_hp,
});

describe("powerBand", () => {
  it("is ±15% of the car's power", () => {
    expect(powerBand(500)).toEqual([425, 575]);
    expect(powerBand(null)).toBeNull();
    expect(powerBand(0)).toBeNull();
  });
});

describe("orderRelated", () => {
  it("orders siblings, then same category by power proximity, then similar power", () => {
    const result = orderRelated({
      selfId: "self",
      selfPowerHp: 500,
      siblings: [car("s-low", 385), car("s-high", 650), car("self", 500)],
      sameCategory: [car("c-far", 900), car("c-near", 520), car("c-none", null)],
      similarPower: [
        car("p-near", 495),
        car("p-far", 570),
        car("p-out", 700),
        car("c-near", 520),
      ],
      limit: 10,
    });
    expect(result.map((entry) => entry.variant_id)).toEqual([
      "s-high",
      "s-low",
      "c-near",
      "c-far",
      "c-none",
      "p-near",
      "p-far",
    ]);
  });

  it("never includes the car itself and respects the limit", () => {
    const result = orderRelated({
      selfId: "self",
      selfPowerHp: 500,
      siblings: [car("self", 500), car("a", 400)],
      sameCategory: [car("b", 480), car("c", 510)],
      similarPower: [car("d", 505)],
      limit: 2,
    });
    expect(result.map((entry) => entry.variant_id)).toEqual(["a", "c"]);
  });

  it("uses the variant id as a stable tiebreaker", () => {
    const result = orderRelated({
      selfId: "self",
      selfPowerHp: 500,
      siblings: [],
      sameCategory: [car("z", 450), car("a", 550), car("m", 450)],
      similarPower: [],
      limit: 10,
    });
    expect(result.map((entry) => entry.variant_id)).toEqual(["a", "m", "z"]);
  });

  it("skips the power pool entirely when the car's power is unknown", () => {
    const result = orderRelated({
      selfId: "self",
      selfPowerHp: null,
      siblings: [],
      sameCategory: [car("b", 300), car("a", 200)],
      similarPower: [car("p", 300)],
      limit: 10,
    });
    expect(result.map((entry) => entry.variant_id)).toEqual(["a", "b"]);
  });
});
