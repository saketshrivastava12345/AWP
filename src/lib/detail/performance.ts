import { percentileRank } from "@/lib/dna";
import { formatFigure, toFinite } from "./figures";

/**
 * Where one car stands within the AURIX catalogue on one published figure.
 *
 * Everything here is a fact about the dataset, computed from it: a rank among
 * the cars that publish the same figure, the percentile (the same "share at or
 * below" definition Car DNA uses, so the two never disagree), and the spread of
 * the catalogue. Nothing is scored, weighted or invented.
 *
 * A figure the manufacturer does not publish produces no standing at all — the
 * caller omits the bar rather than drawing it at zero, which would claim the
 * car is the slowest in the catalogue.
 */

export type ScaleDirection = "higher-is-better" | "lower-is-better";

export type CatalogueStanding = {
  value: number;
  /** Cars in the catalogue that publish this figure. */
  count: number;
  /** 1 is best. Equal values share a rank. */
  rank: number;
  /** 0–100: share of those cars this one meets or beats. */
  percentile: number;
  /** The catalogue's spread on this figure (this car included). */
  min: number;
  max: number;
  /** 0–1 along a scale drawn with "better" to the right. */
  position: number;
  /** Every catalogued value on the same 0–1 scale, for the distribution strip. */
  distribution: number[];
  direction: ScaleDirection;
};

/** Fewer than this many cars publishing a figure is not a comparison. */
export const MIN_COMPARISON_COUNT = 2;

/**
 * Rank `value` within `population`.
 *
 * Returns null when the car's own figure is missing, or when fewer than
 * `minimumCount` cars publish it: being "first of one" is not a standing, the
 * same reason the compare table never crowns a lone car "best".
 */
export function catalogueStanding(
  value: number | null | undefined,
  population: readonly (number | null | undefined)[],
  direction: ScaleDirection = "higher-is-better",
  minimumCount = MIN_COMPARISON_COUNT,
): CatalogueStanding | null {
  const own = toFinite(value);
  if (own === null) return null;

  const values = population
    .map((entry) => toFinite(entry))
    .filter((entry): entry is number => entry !== null);
  if (values.length < minimumCount) return null;

  const lowerIsBetter = direction === "lower-is-better";
  const better = (entry: number) => (lowerIsBetter ? entry < own : entry > own);

  // The population normally contains this car already; the domain includes it
  // regardless, so a stale cached population can never push the marker off
  // the end of its own scale.
  const min = Math.min(own, ...values);
  const max = Math.max(own, ...values);
  const span = max - min;
  const place = (entry: number) => {
    if (span === 0) return 1;
    const t = (entry - min) / span;
    return lowerIsBetter ? 1 - t : t;
  };

  return {
    value: own,
    count: values.length,
    rank: 1 + values.filter(better).length,
    percentile: percentileRank(own, values, lowerIsBetter) ?? 0,
    min,
    max,
    position: place(own),
    distribution: values.map(place),
    direction,
  };
}

// ---------------------------------------------------------------------------
// The catalogue population for the performance panel
// ---------------------------------------------------------------------------

/** One catalogue row, as selected by getCatalogueFigures(). */
export type PerformancePopulationRow = {
  power_hp: number | null;
  torque_nm: number | null;
  zero_to_100_s: number | null;
  top_speed_kmh: number | null;
  kerb_weight_kg: number | null;
};

/** Every published value of each figure across the catalogue. */
export type PerformancePopulation = {
  powerHp: number[];
  torqueNm: number[];
  zeroTo100s: number[];
  topSpeedKmh: number[];
  /** hp per tonne, only for cars publishing both power and kerb weight. */
  powerToWeight: number[];
};

export const EMPTY_PERFORMANCE_POPULATION: PerformancePopulation = {
  powerHp: [],
  torqueNm: [],
  zeroTo100s: [],
  topSpeedKmh: [],
  powerToWeight: [],
};

/** hp per tonne. Null unless both figures are published (and weight is positive). */
export function powerToWeight(
  powerHp: number | null | undefined,
  kerbWeightKg: number | null | undefined,
): number | null {
  const power = toFinite(powerHp);
  const weight = toFinite(kerbWeightKg);
  if (power === null || weight === null || weight <= 0) return null;
  return (power * 1000) / weight;
}

export function buildPerformancePopulation(
  rows: readonly PerformancePopulationRow[],
): PerformancePopulation {
  const population: PerformancePopulation = {
    powerHp: [],
    torqueNm: [],
    zeroTo100s: [],
    topSpeedKmh: [],
    powerToWeight: [],
  };
  const push = (list: number[], value: number | null | undefined) => {
    const number = toFinite(value);
    if (number !== null && number > 0) list.push(number);
  };

  for (const row of rows) {
    push(population.powerHp, row.power_hp);
    push(population.torqueNm, row.torque_nm);
    push(population.zeroTo100s, row.zero_to_100_s);
    push(population.topSpeedKmh, row.top_speed_kmh);
    push(population.powerToWeight, powerToWeight(row.power_hp, row.kerb_weight_kg));
  }
  return population;
}

// ---------------------------------------------------------------------------
// The panel's metrics
// ---------------------------------------------------------------------------

export type PerformanceMetricId =
  "power" | "torque" | "acceleration" | "topSpeed" | "powerToWeight";

export type PerformanceMetric = {
  id: PerformanceMetricId;
  label: string;
  value: number;
  /** Decimal places the figure is shown with. */
  decimals: number;
  unit: string;
  /** Null when too few cars publish the figure to compare against. */
  standing: CatalogueStanding | null;
  /** Plain-language reading of the direction, e.g. "Quicker". */
  better: string;
  /** How the figure is defined, for the tooltip. */
  definition: string;
};

export type PerformanceInputs = {
  powerHp: number | null;
  torqueNm: number | null;
  zeroTo100s: number | null;
  topSpeedKmh: number | null;
  kerbWeightKg: number | null;
};

/**
 * The comparable figures this car publishes, each with its catalogue standing.
 * A figure the car does not publish is left out entirely.
 */
export function buildPerformanceMetrics(
  inputs: PerformanceInputs,
  population: PerformancePopulation,
): PerformanceMetric[] {
  const metrics: PerformanceMetric[] = [];
  const add = (
    id: PerformanceMetricId,
    label: string,
    raw: number | null,
    values: number[],
    options: {
      unit: string;
      decimals: number;
      direction?: ScaleDirection;
      better: string;
      definition: string;
    },
  ) => {
    const value = toFinite(raw);
    if (value === null) return;
    metrics.push({
      id,
      label,
      value,
      decimals: options.decimals,
      unit: options.unit,
      standing: catalogueStanding(value, values, options.direction),
      better: options.better,
      definition: options.definition,
    });
  };

  add("power", "Power", inputs.powerHp, population.powerHp, {
    unit: "hp",
    decimals: 0,
    better: "More powerful",
    definition:
      "Peak power as published. European makers quote metric PS, US and Japanese makers SAE net hp; the two differ by about 1.4%.",
  });
  add("torque", "Torque", inputs.torqueNm, population.torqueNm, {
    unit: "Nm",
    decimals: 0,
    better: "More torque",
    definition: "Peak torque as published by the manufacturer.",
  });
  add("acceleration", "0–100 km/h", inputs.zeroTo100s, population.zeroTo100s, {
    unit: "s",
    decimals: 1,
    direction: "lower-is-better",
    better: "Quicker",
    definition:
      "Published 0–100 km/h time. Lower is better, so the scale runs from slowest (left) to quickest (right).",
  });
  add("topSpeed", "Top speed", inputs.topSpeedKmh, population.topSpeedKmh, {
    unit: "km/h",
    decimals: 0,
    better: "Faster",
    definition: "Published maximum speed.",
  });
  add(
    "powerToWeight",
    "Power-to-weight",
    powerToWeight(inputs.powerHp, inputs.kerbWeightKg),
    population.powerToWeight,
    {
      unit: "hp/t",
      decimals: 1,
      better: "More hp per tonne",
      definition:
        "Power divided by kerb weight, in hp per tonne. Absent where the maker publishes only a dry weight.",
    },
  );

  return metrics;
}

/** "510 hp", "3.4 s" — a metric's own figure with its unit. */
export function metricDisplay(
  metric: Pick<PerformanceMetric, "value" | "decimals" | "unit">,
): string {
  return `${formatFigure(metric.value, metric.decimals)} ${metric.unit}`;
}

/** The two ends of a standing's scale, worst first (left) and best last (right). */
export function scaleEnds(standing: CatalogueStanding): { left: number; right: number } {
  return standing.direction === "lower-is-better"
    ? { left: standing.max, right: standing.min }
    : { left: standing.min, right: standing.max };
}
