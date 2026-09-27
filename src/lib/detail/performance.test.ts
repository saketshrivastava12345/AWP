import { describe, expect, it } from "vitest";
import {
  buildPerformanceMetrics,
  buildPerformancePopulation,
  catalogueStanding,
  metricDisplay,
  powerToWeight,
  scaleEnds,
  EMPTY_PERFORMANCE_POPULATION,
} from "./performance";
import { formatFigure, ordinal, toFinite } from "./figures";

describe("catalogueStanding", () => {
  const population = [100, 200, 300, 400, 500];

  it("ranks, places and describes a higher-is-better figure", () => {
    const standing = catalogueStanding(400, population)!;
    expect(standing.rank).toBe(2);
    expect(standing.count).toBe(5);
    expect(standing.percentile).toBe(80); // meets or beats 4 of 5
    expect(standing.min).toBe(100);
    expect(standing.max).toBe(500);
    expect(standing.position).toBeCloseTo(0.75);
    expect(standing.distribution).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("flips the scale when lower is better, so 'better' is always to the right", () => {
    const times = [2.1, 3.4, 5.9, 9.8];
    const quickest = catalogueStanding(2.1, times, "lower-is-better")!;
    expect(quickest.rank).toBe(1);
    expect(quickest.percentile).toBe(100);
    expect(quickest.position).toBe(1);

    const slowest = catalogueStanding(9.8, times, "lower-is-better")!;
    expect(slowest.rank).toBe(4);
    expect(slowest.position).toBe(0);
    expect(scaleEnds(slowest)).toEqual({ left: 9.8, right: 2.1 });
  });

  it("gives tied values the same rank", () => {
    expect(catalogueStanding(300, [300, 300, 500, 100])!.rank).toBe(2);
    expect(catalogueStanding(500, [500, 500, 100])!.rank).toBe(1);
  });

  it("returns null when this car does not publish the figure", () => {
    expect(catalogueStanding(null, population)).toBeNull();
    expect(catalogueStanding(undefined, population)).toBeNull();
    expect(catalogueStanding(Number.NaN, population)).toBeNull();
  });

  it("returns null when too few cars publish it to compare against", () => {
    expect(catalogueStanding(510, [510])).toBeNull();
    expect(catalogueStanding(510, [])).toBeNull();
    expect(catalogueStanding(510, [510, 400])).not.toBeNull();
  });

  it("ignores missing values in the population rather than counting them as zero", () => {
    const standing = catalogueStanding(300, [null, 100, undefined, 500, 300])!;
    expect(standing.count).toBe(3);
    expect(standing.min).toBe(100);
  });

  it("keeps the car on its own scale even if the population is stale", () => {
    const standing = catalogueStanding(900, [100, 200, 300])!;
    expect(standing.max).toBe(900);
    expect(standing.position).toBe(1);
  });

  it("puts a car at the right end when every value is equal", () => {
    expect(catalogueStanding(300, [300, 300])!.position).toBe(1);
  });
});

describe("buildPerformancePopulation", () => {
  it("collects each published figure and derives power-to-weight only from both inputs", () => {
    const population = buildPerformancePopulation([
      {
        power_hp: 510,
        torque_nm: 470,
        zero_to_100_s: 3.4,
        top_speed_kmh: 320,
        kerb_weight_kg: 1418,
      },
      {
        power_hp: 1020,
        torque_nm: null,
        zero_to_100_s: 2.1,
        top_speed_kmh: 322,
        kerb_weight_kg: 2190,
      },
      {
        power_hp: 830,
        torque_nm: 740,
        zero_to_100_s: 2.9,
        top_speed_kmh: 330,
        kerb_weight_kg: null,
      },
      {
        power_hp: null,
        torque_nm: null,
        zero_to_100_s: null,
        top_speed_kmh: null,
        kerb_weight_kg: 1500,
      },
    ]);
    expect(population.powerHp).toEqual([510, 1020, 830]);
    expect(population.torqueNm).toEqual([470, 740]);
    expect(population.zeroTo100s).toEqual([3.4, 2.1, 2.9]);
    expect(population.topSpeedKmh).toEqual([320, 322, 330]);
    expect(population.powerToWeight).toHaveLength(2);
    expect(population.powerToWeight[0]).toBeCloseTo(359.66, 1);
  });

  it("accepts numeric strings, as PostgREST may return for numeric columns", () => {
    const population = buildPerformancePopulation([
      {
        power_hp: 300,
        torque_nm: null,
        zero_to_100_s: "4.50" as unknown as number,
        top_speed_kmh: null,
        kerb_weight_kg: null,
      },
    ]);
    expect(population.zeroTo100s).toEqual([4.5]);
  });
});

describe("powerToWeight", () => {
  it("is hp per tonne and needs both figures", () => {
    expect(powerToWeight(500, 1000)).toBe(500);
    expect(powerToWeight(500, null)).toBeNull();
    expect(powerToWeight(null, 1000)).toBeNull();
    expect(powerToWeight(500, 0)).toBeNull();
  });
});

describe("buildPerformanceMetrics", () => {
  const population = {
    powerHp: [510, 1020, 830, 300],
    torqueNm: [470, 740],
    zeroTo100s: [3.4, 2.1, 2.9, 7.5],
    topSpeedKmh: [320, 322, 330],
    powerToWeight: [359.7, 465.8],
  };

  it("includes only the figures the car publishes — a missing one gets no bar", () => {
    const metrics = buildPerformanceMetrics(
      {
        powerHp: 1020,
        torqueNm: null,
        zeroTo100s: 2.1,
        topSpeedKmh: 322,
        kerbWeightKg: 2190,
      },
      population,
    );
    expect(metrics.map((metric) => metric.id)).toEqual([
      "power",
      "acceleration",
      "topSpeed",
      "powerToWeight",
    ]);
  });

  it("ranks acceleration with lower as better", () => {
    const metrics = buildPerformanceMetrics(
      {
        powerHp: null,
        torqueNm: null,
        zeroTo100s: 2.1,
        topSpeedKmh: null,
        kerbWeightKg: null,
      },
      population,
    );
    expect(metrics[0]?.standing?.rank).toBe(1);
    expect(metrics[0]?.standing?.direction).toBe("lower-is-better");
  });

  it("keeps a metric but with no standing when the catalogue cannot compare it", () => {
    const metrics = buildPerformanceMetrics(
      {
        powerHp: 510,
        torqueNm: 470,
        zeroTo100s: null,
        topSpeedKmh: null,
        kerbWeightKg: null,
      },
      EMPTY_PERFORMANCE_POPULATION,
    );
    expect(metrics.map((metric) => metric.id)).toEqual(["power", "torque"]);
    expect(metrics.every((metric) => metric.standing === null)).toBe(true);
  });

  it("formats the figure with its unit", () => {
    const [power] = buildPerformanceMetrics(
      {
        powerHp: 1020,
        torqueNm: null,
        zeroTo100s: null,
        topSpeedKmh: null,
        kerbWeightKg: null,
      },
      population,
    );
    expect(metricDisplay(power!)).toBe("1,020 hp");
  });
});

describe("figures", () => {
  it("formats with fixed decimals and grouping", () => {
    expect(formatFigure(1020)).toBe("1,020");
    expect(formatFigure(3.4, 1)).toBe("3.4");
    expect(formatFigure(3, 1)).toBe("3.0");
    expect(formatFigure(359.66, 1)).toBe("359.7");
  });

  it("makes English ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 92, 100, 101, 111].map(ordinal)).toEqual([
      "1st",
      "2nd",
      "3rd",
      "4th",
      "11th",
      "12th",
      "13th",
      "21st",
      "22nd",
      "23rd",
      "92nd",
      "100th",
      "101st",
      "111th",
    ]);
  });

  it("treats non-finite values as absent", () => {
    expect(toFinite("3.40")).toBe(3.4);
    expect(toFinite("")).toBeNull();
    expect(toFinite("abc")).toBeNull();
    expect(toFinite(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toFinite(null)).toBeNull();
  });
});
