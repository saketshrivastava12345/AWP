import { describe, expect, it } from "vitest";
import { publishedMeasurements } from "./viewer-dimensions";

describe("publishedMeasurements", () => {
  it("draws only the dimensions that are published", () => {
    expect(
      publishedMeasurements({
        length_mm: 4573,
        width_mm: 1852,
        height_mm: null,
        wheelbase_mm: 2457,
        ground_clearance_mm: 0,
      }),
    ).toEqual([
      { id: "length", mm: 4573 },
      { id: "width", mm: 1852 },
      { id: "wheelbase", mm: 2457 },
    ]);
  });

  it("draws nothing without dimensions", () => {
    expect(publishedMeasurements(null)).toEqual([]);
  });
});
