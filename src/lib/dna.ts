/**
 * Car DNA — a visual profile computed from the catalogue, never invented.
 *
 * Every bar is a **percentile rank within the dataset**: the share of cars that
 * this car meets or beats on that metric. So a Performance bar at 90 means
 * "better power-to-weight than 90% of the cars in AURIX" — a claim that is
 * true by construction and recomputes itself as the catalogue grows.
 *
 * A bar whose inputs are missing is not drawn at all. Substituting a zero would
 * assert that a car is the worst in the catalogue, when the truth is that
 * nobody published the figure.
 */

export type DnaMetricId = "performance" | "acceleration" | "efficiency" | "size";

export type DnaMetric = {
  id: DnaMetricId;
  label: string;
  /** 0–100 percentile, or null when the inputs are unavailable. */
  value: number | null;
  /** The underlying figure, shown alongside the bar. */
  display: string | null;
  /** Exact definition, surfaced as a tooltip. */
  formula: string;
};

/** Values for one metric across the whole catalogue, used as the population. */
export type DnaDistribution = {
  powerToWeight: number[];
  zeroTo100: number[];
  efficiency: number[];
  length: number[];
};

export type DnaInputs = {
  powerHp: number | null;
  kerbWeightKg: number | null;
  zeroTo100s: number | null;
  mileageKmpl: number | null;
  rangeKm: number | null;
  lengthMm: number | null;
  isElectric: boolean;
};

/**
 * Percentile rank of `value` within `population`, 0–100.
 *
 * Uses the "share at or below" definition, so the lowest value scores above 0
 * rather than exactly 0 — a car should not render an empty bar simply for being
 * last. `invert` flips the direction for metrics where lower is better.
 */
export function percentileRank(
  value: number,
  population: number[],
  invert = false,
): number | null {
  if (population.length === 0) return null;

  const atOrBelow = population.filter((entry) =>
    invert ? entry >= value : entry <= value,
  ).length;

  return Math.round((atOrBelow / population.length) * 100);
}

/** Collect the population for each metric from the catalogue. */
export function buildDistribution(
  cars: {
    power_hp: number | null;
    kerb_weight_kg: number | null;
    zero_to_100_s: number | null;
    mileage_kmpl: number | null;
    range_km: number | null;
    length_mm: number | null;
  }[],
): DnaDistribution {
  const powerToWeight: number[] = [];
  const zeroTo100: number[] = [];
  const efficiency: number[] = [];
  const length: number[] = [];

  for (const car of cars) {
    if (car.power_hp !== null && car.kerb_weight_kg !== null && car.kerb_weight_kg > 0) {
      powerToWeight.push((car.power_hp * 1000) / car.kerb_weight_kg);
    }
    if (car.zero_to_100_s !== null) zeroTo100.push(car.zero_to_100_s);
    if (car.length_mm !== null) length.push(car.length_mm);

    // Efficiency mixes two incompatible units on purpose — see the note in
    // buildDna. Each car contributes whichever one it has.
    const measure =
      car.mileage_kmpl ?? (car.range_km !== null ? car.range_km / 10 : null);
    if (measure !== null) efficiency.push(measure);
  }

  return { powerToWeight, zeroTo100, efficiency, length };
}

export function buildDna(inputs: DnaInputs, distribution: DnaDistribution): DnaMetric[] {
  const metrics: DnaMetric[] = [];

  // --- Performance: power-to-weight ---------------------------------------
  const powerToWeight =
    inputs.powerHp !== null && inputs.kerbWeightKg !== null && inputs.kerbWeightKg > 0
      ? (inputs.powerHp * 1000) / inputs.kerbWeightKg
      : null;

  metrics.push({
    id: "performance",
    label: "Performance",
    value:
      powerToWeight === null
        ? null
        : percentileRank(powerToWeight, distribution.powerToWeight),
    display: powerToWeight === null ? null : `${powerToWeight.toFixed(1)} hp/t`,
    formula:
      "Percentile rank of power-to-weight (hp per tonne) among all catalogued cars that publish both power and kerb weight.",
  });

  // --- Acceleration: 0–100, lower is better -------------------------------
  metrics.push({
    id: "acceleration",
    label: "Acceleration",
    value:
      inputs.zeroTo100s === null
        ? null
        : percentileRank(inputs.zeroTo100s, distribution.zeroTo100, true),
    display: inputs.zeroTo100s === null ? null : `${inputs.zeroTo100s.toFixed(1)} s`,
    formula:
      "Inverse percentile rank of the 0–100 km/h time — a quicker car ranks higher.",
  });

  // --- Efficiency ---------------------------------------------------------
  // Fuel economy and electric range are not the same quantity and cannot be
  // honestly unified. Range is divided by 10 purely to bring it into a similar
  // numeric span before ranking; the percentile is what is shown, and the
  // tooltip says plainly which measure was used.
  const efficiencyRaw =
    inputs.mileageKmpl ?? (inputs.rangeKm !== null ? inputs.rangeKm / 10 : null);

  metrics.push({
    id: "efficiency",
    label: "Efficiency",
    value:
      efficiencyRaw === null
        ? null
        : percentileRank(efficiencyRaw, distribution.efficiency),
    display:
      inputs.mileageKmpl !== null
        ? `${inputs.mileageKmpl} km/l`
        : inputs.rangeKm !== null
          ? `${inputs.rangeKm} km range`
          : null,
    formula: inputs.isElectric
      ? "Percentile rank of electric range. Range and fuel economy are different quantities and are ranked within one combined population, so this bar compares standing, not absolute efficiency."
      : "Percentile rank of fuel economy in km/l, ranked against both combustion economy and electric range.",
  });

  // --- Size ---------------------------------------------------------------
  metrics.push({
    id: "size",
    label: "Size",
    value:
      inputs.lengthMm === null
        ? null
        : percentileRank(inputs.lengthMm, distribution.length),
    display: inputs.lengthMm === null ? null : `${inputs.lengthMm} mm`,
    formula: "Percentile rank of overall length among all catalogued cars.",
  });

  // Only bars with a real value are shown.
  return metrics.filter((metric) => metric.value !== null);
}
