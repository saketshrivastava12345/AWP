import { describe, expect, it } from "vitest";
import { ZONE_NOTES, locationFigure, type ZoneShape } from "./part-location";
import type { ViewerGroup } from "@/types/domain";

const ALL_GROUPS = Object.keys(ZONE_NOTES) as ViewerGroup[];

function bounds(shape: ZoneShape): [number, number, number, number] | null {
  switch (shape.type) {
    case "rect":
      return [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height];
    case "circle":
      return [
        shape.cx - shape.r,
        shape.cy - shape.r,
        shape.cx + shape.r,
        shape.cy + shape.r,
      ];
    case "line": {
      const numbers = shape.d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
      const xs = numbers.filter((_, index) => index % 2 === 0);
      const ys = numbers.filter((_, index) => index % 2 === 1);
      return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    case "outline":
      return null;
  }
}

describe("locationFigure", () => {
  it("has a note and at least one shape for every viewer group", () => {
    for (const group of ALL_GROUPS) {
      const figure = locationFigure([group]);
      expect(figure.zones).toHaveLength(1);
      const zone = figure.zones[0];
      expect(zone?.group).toBe(group);
      expect((zone?.inside.length ?? 0) + (zone?.over.length ?? 0)).toBeGreaterThan(0);
      expect(ZONE_NOTES[group].length).toBeGreaterThan(10);
    }
  });

  it("keeps every shape inside the drawing", () => {
    for (const group of ALL_GROUPS) {
      const figure = locationFigure([group]);
      for (const shape of figure.zones.flatMap((zone) => [
        ...zone.inside,
        ...zone.over,
      ])) {
        const box = bounds(shape);
        if (!box) continue;
        const [x0, y0, x1, y1] = box;
        expect(x0).toBeGreaterThanOrEqual(-0.5);
        expect(y0).toBeGreaterThanOrEqual(-0.5);
        expect(x1).toBeLessThanOrEqual(figure.width + 0.5);
        expect(y1).toBeLessThanOrEqual(figure.height + 0.5);
        expect(x1).toBeGreaterThan(x0);
      }
    }
  });

  it("puts the front axle ahead of the rear one (the nose is on the right)", () => {
    const figure = locationFigure(["wheels"]);
    expect(figure.frontAxleX).toBeGreaterThan(figure.rearAxleX);
  });

  it("puts the engine zone ahead of the cabin and the battery between the axles", () => {
    const engine = locationFigure(["engine"]).zones[0]?.inside[0];
    const interior = locationFigure(["interior"]).zones[0]?.inside[0];
    const battery = locationFigure(["battery"]);
    const slab = battery.zones[0]?.inside[0];
    expect(engine?.type).toBe("rect");
    expect(interior?.type).toBe("rect");
    if (engine?.type === "rect" && interior?.type === "rect") {
      expect(engine.x).toBeGreaterThanOrEqual(interior.x + interior.width - 0.5);
    }
    if (slab?.type === "rect") {
      expect(slab.x).toBeGreaterThan(battery.rearAxleX);
      expect(slab.x + slab.width).toBeLessThan(battery.frontAxleX);
    }
  });

  it("merges several systems into one figure without repeats", () => {
    const figure = locationFigure(["engine", "exhaust", "engine"]);
    expect(figure.zones.map((zone) => zone.group)).toEqual(["engine", "exhaust"]);
  });
});
