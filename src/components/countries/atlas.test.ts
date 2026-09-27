import { describe, expect, it } from "vitest";
import {
  CELL,
  MAP_HEIGHT,
  MAP_WIDTH,
  decodeLandRuns,
  formatCoordinates,
  hoverCardPlacement,
  landPath,
  markerRadius,
  placeMarkers,
  project,
} from "./atlas";
import { COUNTRY_MARKERS, LAND_GRID, LAND_RUNS } from "./map-data";

describe("project", () => {
  it("maps the corners of the cropped grid onto the viewBox", () => {
    expect(project(-180, LAND_GRID.top)).toEqual({ x: 0, y: 0 });
    const corner = project(180, LAND_GRID.bottom);
    expect(corner.x).toBeCloseTo(MAP_WIDTH);
    expect(corner.y).toBeCloseTo(MAP_HEIGHT);
  });

  it("keeps square cells, so dots are round", () => {
    const rows = (LAND_GRID.top - LAND_GRID.bottom) / LAND_GRID.step;
    expect(MAP_HEIGHT / rows).toBeCloseTo(CELL);
  });

  it("puts every bundled marker inside the map", () => {
    for (const marker of COUNTRY_MARKERS) {
      const { x, y } = project(marker.lon, marker.lat);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(MAP_WIDTH);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(MAP_HEIGHT);
    }
  });
});

describe("decodeLandRuns", () => {
  it("decodes base-36 runs row by row", () => {
    expect(decodeLandRuns("0.2,a.1|z.10")).toEqual([
      { row: 0, start: 0, length: 2 },
      { row: 0, start: 10, length: 1 },
      { row: 1, start: 35, length: 36 },
    ]);
  });

  it("skips empty rows and malformed tokens instead of throwing", () => {
    expect(decodeLandRuns("|x|1.0,2.1")).toEqual([{ row: 2, start: 2, length: 1 }]);
  });

  it("decodes the bundled mask to runs that fit the grid", () => {
    const runs = decodeLandRuns(LAND_RUNS);
    const columns = 360 / LAND_GRID.step;
    const rows = (LAND_GRID.top - LAND_GRID.bottom) / LAND_GRID.step;
    expect(runs.length).toBeGreaterThan(100);
    for (const run of runs) {
      expect(run.start + run.length).toBeLessThanOrEqual(columns);
      expect(run.row).toBeLessThan(rows);
    }
  });

  it("marks well-known land as land and open ocean as sea", () => {
    const runs = decodeLandRuns(LAND_RUNS);
    const isLand = (lon: number, lat: number) => {
      const column = Math.floor((lon + 180) / LAND_GRID.step);
      const row = Math.floor((LAND_GRID.top - lat) / LAND_GRID.step);
      return runs.some(
        (run) =>
          run.row === row && column >= run.start && column < run.start + run.length,
      );
    };
    expect(isLand(10.4, 51.2)).toBe(true); // Germany
    expect(isLand(79, 22)).toBe(true); // India
    expect(isLand(-98.6, 39.8)).toBe(true); // United States
    expect(isLand(-30, 0)).toBe(false); // mid-Atlantic
    expect(isLand(-150, -20)).toBe(false); // South Pacific
  });
});

describe("landPath", () => {
  it("draws one closed rectangle per run", () => {
    const path = landPath("0.2|1.1");
    expect(path.match(/z/g)).toHaveLength(2);
    expect(path.startsWith("M0 0h")).toBe(true);
  });
});

describe("markerRadius", () => {
  it("grows with the car count and is capped", () => {
    expect(markerRadius(1)).toBeLessThan(markerRadius(9));
    expect(markerRadius(10_000)).toBe(9);
    expect(markerRadius(0)).toBeGreaterThan(0);
    expect(markerRadius(Number.NaN)).toBe(markerRadius(0));
  });
});

describe("placeMarkers", () => {
  it("returns countries without coordinates separately instead of dropping them", () => {
    const { placed, unplaced } = placeMarkers([
      { slug: "germany", name: "Germany" },
      { slug: "atlantis", name: "Atlantis" },
    ]);
    expect(placed.map((marker) => marker.slug)).toEqual(["germany"]);
    expect(placed[0]?.label).toBe("right");
    expect(unplaced).toEqual([{ slug: "atlantis", name: "Atlantis" }]);
  });
});

describe("hoverCardPlacement", () => {
  it("flips away from the right and top edges", () => {
    expect(hoverCardPlacement(900, 300)).toMatchObject({
      alignRight: true,
      below: false,
    });
    expect(hoverCardPlacement(100, 20)).toMatchObject({ alignRight: false, below: true });
  });
});

describe("formatCoordinates", () => {
  it("labels hemispheres", () => {
    expect(formatCoordinates(51.2, 10.4)).toBe("51.2°N 10.4°E");
    expect(formatCoordinates(-33.9, -70.7)).toBe("33.9°S 70.7°W");
  });
});
