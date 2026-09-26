/**
 * Marker coordinates for the countries in the catalogue.
 *
 * Bundled locally on purpose — the brief rules out fetching map data from a
 * third-party URL at runtime. These are approximate centroids, which is all an
 * equirectangular marker map needs; no country outlines are drawn, so no
 * boundary data (and no boundary politics) is involved.
 */
export type CountryMarker = {
  slug: string;
  lat: number;
  lon: number;
};

export const COUNTRY_MARKERS: CountryMarker[] = [
  { slug: "india", lat: 22.0, lon: 79.0 },
  { slug: "germany", lat: 51.2, lon: 10.4 },
  { slug: "italy", lat: 42.8, lon: 12.6 },
  { slug: "japan", lat: 36.2, lon: 138.3 },
  { slug: "united-states", lat: 39.8, lon: -98.6 },
  { slug: "united-kingdom", lat: 54.0, lon: -2.0 },
  { slug: "france", lat: 46.6, lon: 2.4 },
  { slug: "south-korea", lat: 36.5, lon: 127.9 },
  { slug: "sweden", lat: 60.1, lon: 15.0 },
  { slug: "china", lat: 35.9, lon: 104.2 },
];
