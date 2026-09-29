import type { MarketGeography, MarketPrice } from "@/types/domain";
import type { MarketSelection } from "./engine";

/**
 * Market selection <-> a readable path ("india/maharashtra/mumbai"), used for
 * shareable URLs (?market=) and for remembering a visitor's market.
 *
 * Client-safe and pure. Unknown or partial paths degrade to the deepest level
 * that exists rather than failing, so an old link still lands somewhere.
 */

export const EMPTY_SELECTION: MarketSelection = {
  countryId: null,
  regionId: null,
  cityId: null,
};

type GeoCountry = MarketGeography["countries"][number];
type GeoRegion = GeoCountry["regions"][number];

export function findCountry(geo: MarketGeography, id: string | null): GeoCountry | null {
  return id ? (geo.countries.find((country) => country.id === id) ?? null) : null;
}

export function findRegion(
  country: GeoCountry | null,
  id: string | null,
): GeoRegion | null {
  return country && id
    ? (country.regions.find((region) => region.id === id) ?? null)
    : null;
}

export function selectionFromPath(
  geo: MarketGeography,
  path: string | null | undefined,
): MarketSelection {
  if (!path) return EMPTY_SELECTION;
  const [countrySlug, regionSlug, citySlug] = path
    .toLowerCase()
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const country = geo.countries.find((entry) => entry.slug === countrySlug);
  if (!country) return EMPTY_SELECTION;
  const region = country.regions.find((entry) => entry.slug === regionSlug);
  if (!region) return { countryId: country.id, regionId: null, cityId: null };
  const city = region.cities.find((entry) => entry.slug === citySlug);
  return { countryId: country.id, regionId: region.id, cityId: city?.id ?? null };
}

export function selectionToPath(
  geo: MarketGeography,
  selection: MarketSelection,
): string | null {
  const country = findCountry(geo, selection.countryId);
  if (!country) return null;
  const region = findRegion(country, selection.regionId);
  if (!region) return country.slug;
  const city = region.cities.find((entry) => entry.id === selection.cityId);
  return city
    ? `${country.slug}/${region.slug}/${city.slug}`
    : `${country.slug}/${region.slug}`;
}

/** "Mumbai, Maharashtra, India" — most specific first. */
export function selectionLabel(geo: MarketGeography, selection: MarketSelection): string {
  const country = findCountry(geo, selection.countryId);
  if (!country) return "No market selected";
  const region = findRegion(country, selection.regionId);
  const city = region?.cities.find((entry) => entry.id === selection.cityId);
  return [city?.name, region?.name, country.name].filter(Boolean).join(", ");
}

/**
 * Ids of every country, region and city that has at least one in-force price
 * for this variant, so the selector can mark where data exists.
 */
export function pricedMarketIds(current: readonly MarketPrice[]): Set<string> {
  const ids = new Set<string>();
  for (const price of current) {
    ids.add(price.country_id);
    if (price.region_id) ids.add(price.region_id);
    if (price.city_id) ids.add(price.city_id);
  }
  return ids;
}

/**
 * Where to start when the visitor has not chosen: the market of the most
 * recently verified in-force price, at the scope it was recorded for. With no
 * prices at all there is nothing sensible to preselect.
 */
export function defaultSelection(current: readonly MarketPrice[]): MarketSelection {
  const latest = [...current].sort(
    (a, b) =>
      Number(b.is_verified) - Number(a.is_verified) ||
      b.last_verified_at.localeCompare(a.last_verified_at),
  )[0];
  if (!latest) return EMPTY_SELECTION;
  return {
    countryId: latest.country_id,
    regionId: latest.region_id,
    cityId: latest.city_id,
  };
}
