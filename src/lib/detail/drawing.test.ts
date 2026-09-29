import { describe, expect, it } from "vitest";
import { drawingGeometry, pathFrom, type DrawingInput } from "./drawing";

const gt3: DrawingInput = {
  bodyType: "coupe",
  powertrain: "combustion",
  enginePosition: "rear",
  lengthMm: 4573,
  widthMm: 1852,
  heightMm: 1279,
  wheelbaseMm: 2457,
  groundClearanceMm: null,
};

const xs = (points: readonly (readonly [number, number])[]) => points.map((p) => p[0]);
const ys = (points: readonly (readonly [number, number])[]) => points.map((p) => p[1]);

describe("drawingGeometry", () => {
  it("draws the side elevation at the published length and height", () => {
    const geometry = drawingGeometry(gt3);
    expect(Math.min(...xs(geometry.side.body))).toBeCloseTo(0, 5);
    expect(Math.max(...xs(geometry.side.body))).toBeCloseTo(4573, 5);
    expect(Math.max(...ys(geometry.side.body))).toBeCloseTo(1279, 0);
    expect(Math.min(...ys(geometry.side.body))).toBeGreaterThan(0);
  });

  it("puts the axles exactly one published wheelbase apart, wheels on the ground", () => {
    const { side } = drawingGeometry(gt3);
    expect(side.frontAxleX - side.rearAxleX).toBeCloseTo(2457, 6);
    const [rear, front] = side.wheels;
    expect(rear?.cx).toBeCloseTo(side.rearAxleX, 6);
    expect(front?.cx).toBeCloseTo(side.frontAxleX, 6);
    // The tyre stands on the ground line (y = 0) within its 4% inset.
    expect(front!.cy - front!.r).toBeGreaterThanOrEqual(0);
    expect(front!.cy - front!.r).toBeLessThan(front!.cy * 0.05);
  });

  it("draws the plan view at the published width", () => {
    const { plan } = drawingGeometry(gt3);
    expect(Math.max(...ys(plan.outline))).toBeCloseTo(1852 / 2, 3);
    expect(Math.min(...ys(plan.outline))).toBeCloseTo(-1852 / 2, 3);
    expect(Math.max(...xs(plan.outline))).toBeCloseTo(4573, 5);
    expect(plan.wheels).toHaveLength(4);
    expect(plan.cabin.length).toBeGreaterThan(0);
  });

  it("records every published dimension it used", () => {
    expect(drawingGeometry(gt3).published).toEqual({
      length: true,
      width: true,
      height: true,
      wheelbase: true,
      groundClearance: false,
    });
  });

  it("uses a published ground clearance for the underbody", () => {
    const geometry = drawingGeometry({ ...gt3, groundClearanceMm: 110 });
    expect(geometry.published.groundClearance).toBe(true);
    expect(geometry.groundClearance).toBe(110);
    // Between the axles the underside sits at the clearance.
    const midX = (geometry.side.rearAxleX + geometry.side.frontAxleX) / 2;
    const underside = geometry.side.body
      .filter(([x, y]) => Math.abs(x - midX) < 150 && y < 500)
      .map(([, y]) => y);
    expect(Math.min(...underside)).toBeCloseTo(110, 0);
  });

  it("falls back to the body style's typical proportions, and says so", () => {
    const geometry = drawingGeometry({
      ...gt3,
      lengthMm: null,
      heightMm: null,
      widthMm: null,
      wheelbaseMm: null,
    });
    expect(geometry.published).toEqual({
      length: false,
      width: false,
      height: false,
      wheelbase: false,
      groundClearance: false,
    });
    // FALLBACK_SIZE.coupe: 4.5 m × 1.9 m × 1.28 m.
    expect(geometry.length).toBe(4500);
    expect(geometry.width).toBe(1900);
    expect(geometry.height).toBe(1280);
  });

  it("refuses an implausible wheelbase rather than drawing it", () => {
    const geometry = drawingGeometry({ ...gt3, wheelbaseMm: 4500 });
    expect(geometry.published.wheelbase).toBe(false);
    expect(geometry.wheelbase).toBeLessThan(4573 * 0.72);
  });

  it("never lets the underside cross the top line", () => {
    for (const bodyType of ["coupe", "suv", "hatchback", "pickup", "off_road", "sedan"]) {
      const { side } = drawingGeometry({ ...gt3, bodyType, heightMm: 1100 });
      const half = side.body.length / 2;
      const upper = side.body.slice(0, half);
      const lower = side.body.slice(half).reverse();
      upper.forEach(([, top], index) => {
        expect(top).toBeGreaterThan(lower[index]![1]);
      });
    }
  });
});

describe("pathFrom", () => {
  it("writes a closed path through the transformed points", () => {
    expect(
      pathFrom(
        [
          [0, 0],
          [10, 5],
        ],
        ([x, y]) => [x * 2, -y],
      ),
    ).toBe("M0.0 0.0 L20.0 -5.0 Z");
    expect(pathFrom([], (p) => p)).toBe("");
  });
});
