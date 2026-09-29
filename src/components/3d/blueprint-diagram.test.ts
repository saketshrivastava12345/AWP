import { describe, expect, it } from "vitest";
import { GENERIC_BUILD } from "@/lib/car-build";
import { blueprintGroups } from "@/lib/blueprint";
import { blueprintDiagram } from "./blueprint-diagram";
import { drawnGroups } from "./viewer-config";

describe("blueprint diagram (the still exploded drawing)", () => {
  it("draws every group the blueprint takes apart, in order", () => {
    const groups = blueprintGroups(drawnGroups(GENERIC_BUILD));
    const data = blueprintDiagram(GENERIC_BUILD, groups);
    expect(data.groups.map((entry) => entry.group)).toEqual(groups);
    for (const entry of data.groups) expect(entry.shapes.length).toBeGreaterThan(0);
  });

  it("has finite bounds that include the floor", () => {
    const groups = blueprintGroups(drawnGroups(GENERIC_BUILD));
    const { bounds } = blueprintDiagram(GENERIC_BUILD, groups);
    expect(Number.isFinite(bounds.minX + bounds.maxX + bounds.minY + bounds.maxY)).toBe(
      true,
    );
    expect(bounds.minY).toBeLessThanOrEqual(0);
    expect(bounds.maxX).toBeGreaterThan(bounds.minX);
  });

  it("an EV has a battery and no engine or exhaust in the drawing", () => {
    const ev = {
      ...GENERIC_BUILD,
      powertrain: "electric" as const,
      enginePosition: null,
      motors: 2,
    };
    const groups = blueprintGroups(drawnGroups(ev));
    const drawn = blueprintDiagram(ev, groups).groups.map((entry) => entry.group);
    expect(drawn).toContain("battery");
    expect(drawn).not.toContain("engine");
    expect(drawn).not.toContain("exhaust");
  });

  it("lifts the shell clear above everything else", () => {
    const groups = blueprintGroups(drawnGroups(GENERIC_BUILD));
    const data = blueprintDiagram(GENERIC_BUILD, groups);
    const body = data.groups.find((entry) => entry.group === "body");
    const interior = data.groups.find((entry) => entry.group === "interior");
    expect(body!.anchor[1]).toBeGreaterThan(interior!.anchor[1]);
  });
});
