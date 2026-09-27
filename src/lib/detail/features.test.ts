import { describe, expect, it } from "vitest";
import { featureChapterOf, groupFeatures, type FeatureEntry } from "./features";

function feature(
  name: string,
  category: string | null,
  detail: string | null = null,
): FeatureEntry {
  return {
    feature: { id: name, name, slug: name, category, description: null },
    detail,
  };
}

describe("featureChapterOf", () => {
  it("maps every category in the catalogue to its chapter", () => {
    expect(featureChapterOf("Driver Assistance")).toBe("technology");
    expect(featureChapterOf("Lighting")).toBe("technology");
    expect(featureChapterOf("EV")).toBe("technology");
    expect(featureChapterOf("Interior")).toBe("interior");
    expect(featureChapterOf("Aerodynamics")).toBe("aerodynamics");
    expect(featureChapterOf("Chassis")).toBe("chassis");
    expect(featureChapterOf("Braking")).toBe("chassis");
    expect(featureChapterOf("Drivetrain")).toBe("chassis");
  });

  it("is forgiving about case and spacing", () => {
    expect(featureChapterOf("  driver   assistance ")).toBe("technology");
    expect(featureChapterOf("ev")).toBe("technology");
  });

  it("sends unknown or missing categories to 'other' instead of guessing", () => {
    expect(featureChapterOf("Infotainment")).toBe("other");
    expect(featureChapterOf(null)).toBe("other");
  });
});

describe("groupFeatures", () => {
  it("groups by chapter, ordered by category then name", () => {
    const groups = groupFeatures([
      feature("Torque Vectoring", "Drivetrain"),
      feature("Carbon-Ceramic Brakes", "Braking"),
      feature("Adaptive Dampers", "Chassis"),
      feature("Heat Pump", "EV"),
      feature("Matrix LED", "Lighting"),
      feature("Adaptive Cruise", "Driver Assistance"),
      feature("Active Aerodynamics", "Aerodynamics"),
      feature("Head-up Display", "Infotainment"),
    ]);
    const names = (id: keyof typeof groups) =>
      groups[id].map((entry) => entry.feature.name);
    expect(names("technology")).toEqual(["Adaptive Cruise", "Matrix LED", "Heat Pump"]);
    expect(names("chassis")).toEqual([
      "Adaptive Dampers",
      "Carbon-Ceramic Brakes",
      "Torque Vectoring",
    ]);
    expect(names("aerodynamics")).toEqual(["Active Aerodynamics"]);
    expect(names("interior")).toEqual([]);
    expect(names("other")).toEqual(["Head-up Display"]);
  });
});
