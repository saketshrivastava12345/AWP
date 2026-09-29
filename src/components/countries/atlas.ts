import { COUNTRY_MARKERS, LAND_GRID, LAND_RUNS, type LabelSide } from "./map-data";

/**
 * Geometry for the world map, kept free of React so it can be unit-tested and
 * shared by the interactive map and the static locator on a country page.
 *
 * The projection is equirectangular: longitude and latitude map linearly onto
 * x and y. It is the only projection in which a rasterised land grid and the
 * markers line up with no maths beyond a scale and an offset, and it is
 * accurate enough for placing a dozen markers.
 */

export const MAP_WIDTH = 1000;

/** Degrees of latitude shown; the map is cropped to where the land is. */
const LAT_SPAN = LAND_GRID.top - LAND_GRID.bottom;

export const MAP_HEIGHT = (LAT_SPAN / 360) * MAP_WIDTH;

/** Width of one land cell in viewBox units (cells are square). */
export const CELL = (LAND_GRID.step / 360) * MAP_WIDTH;

/** Longitude/latitude to viewBox coordinates. */
export function project(lon: number, lat: number): { x: number; y: number } {
  return {
    x: ((lon + 180) / 360) * MAP_WIDTH,
    y: ((LAND_GRID.top - lat) / LAT_SPAN) * MAP_HEIGHT,
  };
}

export type LandRun = { row: number; start: number; length: number };

/** Decodes the "start.length" base-36 runs in map-data.ts. Malformed runs are skipped. */
export function decodeLandRuns(encoded: string): LandRun[] {
  const runs: LandRun[] = [];
  encoded.split("|").forEach((line, row) => {
    for (const token of line.split(",")) {
      const [start, length] = token.split(".").map((part) => parseInt(part, 36));
      if (
        start === undefined ||
        length === undefined ||
        !Number.isFinite(start) ||
        !Number.isFinite(length) ||
        length <= 0
      ) {
        continue;
      }
      runs.push({ row, start, length });
    }
  });
  return runs;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The land mask as one SVG path of rectangles, in viewBox units. Used as a
 * clip path over a dot pattern whose cells line up with the grid, so every
 * land cell shows exactly one whole dot.
 */
export function landPath(encoded: string = LAND_RUNS): string {
  return decodeLandRuns(encoded)
    .map(({ row, start, length }) => {
      const x = round(start * CELL);
      const y = round(row * CELL);
      const w = round(length * CELL);
      return `M${x} ${y}h${w}v${round(CELL)}h${-w}z`;
    })
    .join("");
}

/**
 * Marker radius in viewBox units. Grows with the square root of the car count
 * (so area, not radius, tracks the number) and is capped, because Europe's
 * five markers sit within a few degrees of each other.
 */
export function markerRadius(carCount: number): number {
  const count = Math.max(0, Number.isFinite(carCount) ? carCount : 0);
  return Math.min(9, 3.5 + Math.sqrt(count) * 1.35);
}

export type PlacedMarker<T> = {
  slug: string;
  x: number;
  y: number;
  label: LabelSide;
  country: T;
};

/**
 * Pairs catalogued countries with their coordinates. Countries without an
 * entry in map-data.ts are returned separately so the page can say so rather
 * than silently dropping them.
 */
export function placeMarkers<T extends { slug: string }>(
  countries: readonly T[],
): { placed: PlacedMarker<T>[]; unplaced: T[] } {
  const bySlug = new Map(COUNTRY_MARKERS.map((marker) => [marker.slug, marker]));
  const placed: PlacedMarker<T>[] = [];
  const unplaced: T[] = [];
  for (const country of countries) {
    const marker = bySlug.get(country.slug);
    if (!marker) {
      unplaced.push(country);
      continue;
    }
    const { x, y } = project(marker.lon, marker.lat);
    placed.push({ slug: country.slug, x, y, label: marker.label ?? "right", country });
  }
  return { placed, unplaced };
}

/**
 * Where the hover card opens relative to a marker, as fractions of the map.
 * It opens up and to the right, flipping away from whichever edges are close.
 */
export function hoverCardPlacement(x: number, y: number) {
  return {
    left: x / MAP_WIDTH,
    top: y / MAP_HEIGHT,
    alignRight: x / MAP_WIDTH > 0.68,
    below: y / MAP_HEIGHT < 0.32,
  };
}

/** Degrees as a compact coordinate label: 51.2, 10.4 -> "51.2°N 10.4°E". */
export function formatCoordinates(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${ns} ${Math.abs(lon).toFixed(1)}°${ew}`;
}

export function markerFor(slug: string) {
  return COUNTRY_MARKERS.find((marker) => marker.slug === slug) ?? null;
}
