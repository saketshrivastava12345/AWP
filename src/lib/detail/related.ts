import { toFinite } from "./figures";

/**
 * Ordering for "related vehicles", kept pure so it can be tested without a
 * database. getRelatedCars (lib/queries/related.ts) fetches the candidate
 * pools and hands them here.
 *
 *   1. other variants of the same model, most powerful first
 *   2. cars in the same category from other makers, nearest in power first
 *   3. any car within ±15% of this one's power, nearest first
 *
 * De-duplicated across the pools, never including the car itself, and with a
 * stable tiebreaker (variant id) so the list does not reshuffle between renders.
 */

export const POWER_BAND = 0.15;

export type RelatedCandidate = {
  variant_id: string | null;
  power_hp: number | null;
};

export type RelatedPools<T extends RelatedCandidate> = {
  selfId: string;
  selfPowerHp: number | null;
  siblings: readonly T[];
  sameCategory: readonly T[];
  similarPower: readonly T[];
  limit: number;
};

/** [min, max] horsepower for the "similar power" pool, or null without a figure. */
export function powerBand(powerHp: number | null | undefined): [number, number] | null {
  const power = toFinite(powerHp);
  if (power === null || power <= 0) return null;
  return [power * (1 - POWER_BAND), power * (1 + POWER_BAND)];
}

const byId = (a: RelatedCandidate, b: RelatedCandidate) =>
  (a.variant_id ?? "").localeCompare(b.variant_id ?? "");

export function orderRelated<T extends RelatedCandidate>(pools: RelatedPools<T>): T[] {
  const power = toFinite(pools.selfPowerHp);
  const distance = (car: RelatedCandidate) => {
    const other = toFinite(car.power_hp);
    return power === null || other === null
      ? Number.POSITIVE_INFINITY
      : Math.abs(other - power);
  };
  const nearest = (a: T, b: T) => distance(a) - distance(b) || byId(a, b);
  const strongest = (a: T, b: T) =>
    (toFinite(b.power_hp) ?? -1) - (toFinite(a.power_hp) ?? -1) || byId(a, b);

  const band = powerBand(power);
  const inBand = (car: RelatedCandidate) => {
    const other = toFinite(car.power_hp);
    return band !== null && other !== null && other >= band[0] && other <= band[1];
  };

  const ordered = [
    ...[...pools.siblings].sort(strongest),
    ...[...pools.sameCategory].sort(nearest),
    ...[...pools.similarPower].filter(inBand).sort(nearest),
  ];

  const seen = new Set<string>([pools.selfId]);
  const result: T[] = [];
  for (const car of ordered) {
    if (result.length >= pools.limit) break;
    if (!car.variant_id || seen.has(car.variant_id)) continue;
    seen.add(car.variant_id);
    result.push(car);
  }
  return result;
}
