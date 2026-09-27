import { describe, expect, it } from "vitest";
import { buildRangeSamples, compareRange, type RangeSample } from "./ev";

const samples: RangeSample[] = [
  { rangeKm: 600, standard: "wltp", kind: "electric" },
  { rangeKm: 450, standard: "wltp", kind: "electric" },
  { rangeKm: 300, standard: "wltp", kind: "electric" },
  { rangeKm: 800, standard: "cltc", kind: "electric" },
  { rangeKm: 520, standard: "epa", kind: "electric" },
  { rangeKm: 25, standard: "wltp", kind: "hybrid" },
  { rangeKm: 60, standard: "wltp", kind: "hybrid" },
];

describe("compareRange", () => {
  it("ranks only against the same test standard and powertrain", () => {
    const result = compareRange(600, "wltp", "electric", samples);
    expect(result.status).toBe("ranked");
    if (result.status !== "ranked") return;
    // The CLTC 800 km and EPA 520 km figures are not in the contest.
    expect(result.standing.count).toBe(3);
    expect(result.standing.rank).toBe(1);
    expect(result.standing.max).toBe(600);
    expect(result.standard).toBe("wltp");
  });

  it("keeps plug-in hybrids apart from battery-electric cars", () => {
    const result = compareRange(25, "wltp", "hybrid", samples);
    expect(result.status).toBe("ranked");
    if (result.status !== "ranked") return;
    expect(result.standing.count).toBe(2);
    expect(result.standing.max).toBe(60);
    expect(result.peers).toBe("hybrid");
  });

  it("does not rank a range whose standard is not recorded", () => {
    expect(compareRange(600, null, "electric", samples)).toEqual({
      status: "unranked",
      reason: "no-standard",
      peerCount: 0,
    });
  });

  it("does not rank when too few cars share the standard", () => {
    expect(compareRange(520, "epa", "electric", samples)).toEqual({
      status: "unranked",
      reason: "too-few-peers",
      peerCount: 1,
    });
  });

  it("has nothing to say about a car without a range or a combustion car", () => {
    expect(compareRange(null, "wltp", "electric", samples).status).toBe("unranked");
    expect(compareRange(500, "wltp", "combustion", samples)).toMatchObject({
      reason: "no-range",
    });
  });
});

describe("buildRangeSamples", () => {
  it("keeps positive ranges with their standard and powertrain kind", () => {
    expect(
      buildRangeSamples([
        { range_km: 600, range_standard: "wltp", fuel_type: "electric" },
        { range_km: 25, range_standard: "wltp", fuel_type: "phev" },
        { range_km: null, range_standard: "wltp", fuel_type: "electric" },
        { range_km: 0, range_standard: null, fuel_type: "electric" },
      ]),
    ).toEqual([
      { rangeKm: 600, standard: "wltp", kind: "electric" },
      { rangeKm: 25, standard: "wltp", kind: "hybrid" },
    ]);
  });
});
