import {
  powertrainKind,
  type FuelType,
  type PowertrainKind,
  type RangeStandard,
} from "@/types/domain";
import {
  catalogueStanding,
  MIN_COMPARISON_COUNT,
  type CatalogueStanding,
} from "./performance";
import { toFinite } from "./figures";

/**
 * Electric range, compared honestly.
 *
 * WLTP, EPA, ARAI, NEDC and CLTC are different test cycles and produce
 * different figures for the same car — EPA is typically the most conservative,
 * NEDC and CLTC the most generous. Ranking a WLTP figure against EPA figures
 * would be comparing different measurements, so a range is only ever ranked
 * against ranges measured to the SAME standard, and only against the same
 * kind of powertrain (a plug-in hybrid's electric-only range is not in the
 * same contest as a battery-electric car's).
 */

/** One catalogued range, from getCatalogueFigures(). */
export type RangeSampleRow = {
  range_km: number | null;
  range_standard: RangeStandard | null;
  fuel_type: FuelType | null;
};

export type RangeSample = {
  rangeKm: number;
  standard: RangeStandard | null;
  kind: PowertrainKind;
};

export function buildRangeSamples(rows: readonly RangeSampleRow[]): RangeSample[] {
  const samples: RangeSample[] = [];
  for (const row of rows) {
    const range = toFinite(row.range_km);
    if (range === null || range <= 0) continue;
    samples.push({
      rangeKm: range,
      standard: row.range_standard,
      kind: powertrainKind(row.fuel_type),
    });
  }
  return samples;
}

export type RangeComparison =
  | {
      status: "ranked";
      standing: CatalogueStanding;
      standard: RangeStandard;
      peers: Exclude<PowertrainKind, "combustion">;
    }
  | {
      status: "unranked";
      /** Why no bar is drawn, so the panel can say so plainly. */
      reason: "no-range" | "no-standard" | "too-few-peers";
      /** Cars sharing the standard and powertrain (including this one). */
      peerCount: number;
    };

export function compareRange(
  rangeKm: number | null | undefined,
  standard: RangeStandard | null | undefined,
  kind: PowertrainKind,
  samples: readonly RangeSample[],
): RangeComparison {
  const range = toFinite(rangeKm);
  if (range === null || range <= 0 || kind === "combustion") {
    return { status: "unranked", reason: "no-range", peerCount: 0 };
  }
  if (!standard) return { status: "unranked", reason: "no-standard", peerCount: 0 };

  const peers = samples
    .filter((sample) => sample.standard === standard && sample.kind === kind)
    .map((sample) => sample.rangeKm);

  const standing = catalogueStanding(
    range,
    peers,
    "higher-is-better",
    MIN_COMPARISON_COUNT,
  );
  if (!standing) {
    return { status: "unranked", reason: "too-few-peers", peerCount: peers.length };
  }
  return { status: "ranked", standing, standard, peers: kind };
}

/** What each standard is, in a sentence — shown beside the range. */
export const RANGE_STANDARD_NOTES: Record<RangeStandard, string> = {
  wltp: "WLTP — the EU/UK Worldwide Harmonised Light Vehicles Test Procedure.",
  epa: "EPA — the US Environmental Protection Agency rating; usually the most conservative.",
  arai: "ARAI — the Indian certification (MIDC cycle); usually more generous than WLTP.",
  nedc: "NEDC — the older European cycle, replaced by WLTP; notably generous.",
  cltc: "CLTC — the China Light-Duty Vehicle Test Cycle; usually more generous than WLTP.",
};
