import { describe, expect, it } from "vitest";
import type { ViewerGroup } from "@/types/domain";
import {
  EXPLODE_FLOOR,
  explodeDirections,
  offsetAt,
  planExplode,
  type ExplodeInput,
  type GroupExtent,
} from "./viewer-explode";

/** Group extents roughly as the procedural car measures them (metres). */
function extents(
  overrides: Partial<Record<ViewerGroup, [number, number]>>,
): GroupExtent[] {
  const base: Partial<Record<ViewerGroup, [number, number]>> = {
    body: [0.1, 0],
    wheels: [0, 0],
    brakes: [0.12, 0],
    suspension: [0.2, 0],
    transmission: [0.2, 0],
    interior: [0.25, -0.2],
    electronics: [0.3, 0.8],
    ...overrides,
  };
  return Object.entries(base).map(([group, [minY, centerZ]]) => ({
    group: group as ViewerGroup,
    minY,
    centerZ,
  }));
}

const frontEngined: ExplodeInput = {
  groups: extents({
    engine: [0.18, 1.4],
    transmission: [0.2, 0.6],
    exhaust: [0.14, -0.5],
  }),
  powertrain: "combustion",
  enginePosition: "front",
  length: 4.5,
};

const rearEngined: ExplodeInput = {
  // 911: engine behind the rear axle, gearbox ahead of it.
  groups: extents({
    engine: [0.2, -1.7],
    transmission: [0.22, -1.1],
    exhaust: [0.15, -2.0],
  }),
  powertrain: "combustion",
  enginePosition: "rear",
  length: 4.57,
};

const midEngined: ExplodeInput = {
  // Supercar: engine behind the cabin, gearbox outboard of it at the tail.
  groups: extents({
    engine: [0.15, -0.6],
    transmission: [0.2, -1.35],
    exhaust: [0.14, -1.9],
  }),
  powertrain: "hybrid",
  enginePosition: "mid",
  length: 4.6,
};

const electric: ExplodeInput = {
  groups: extents({ battery: [0.11, 0] }),
  powertrain: "electric",
  enginePosition: null,
  length: 5.02,
};

describe("planExplode", () => {
  it("never leaves a part below the floor", () => {
    for (const input of [frontEngined, rearEngined, midEngined, electric]) {
      const plan = planExplode(input);
      for (const { group, minY } of input.groups) {
        const offset = plan.offsets[group];
        expect(offset, group).toBeDefined();
        expect(minY + (offset?.[1] ?? 0)).toBeGreaterThanOrEqual(EXPLODE_FLOOR - 1e-9);
      }
    }
  });

  it("sends the engine out of its own end of the car", () => {
    expect(planExplode(frontEngined).offsets.engine?.[2]).toBeGreaterThan(0);
    expect(planExplode(rearEngined).offsets.engine?.[2]).toBeLessThan(0);
    expect(planExplode(midEngined).offsets.engine?.[2]).toBeLessThan(0);
  });

  it("moves an outboard gearbox further than the engine, and lifts the engine over it", () => {
    const plan = planExplode(midEngined);
    const engine = plan.offsets.engine;
    const gearbox = plan.offsets.transmission;
    expect(Math.abs(gearbox?.[2] ?? 0)).toBeGreaterThan(Math.abs(engine?.[2] ?? 0));
    expect(engine?.[1] ?? 0).toBeGreaterThan(gearbox?.[1] ?? 0);
  });

  it("keeps an inboard gearbox between the engine and the cabin", () => {
    const plan = planExplode(rearEngined);
    expect(Math.abs(plan.offsets.transmission?.[2] ?? 0)).toBeLessThan(
      Math.abs(plan.offsets.engine?.[2] ?? 0),
    );
  });

  it("rests an EV's battery on the floor and lifts the rest off it", () => {
    const plan = planExplode(electric);
    const battery = electric.groups.find((entry) => entry.group === "battery");
    expect(plan.lift).toBeGreaterThan(0);
    expect((battery?.minY ?? 0) + (plan.offsets.battery?.[1] ?? 0)).toBeCloseTo(
      EXPLODE_FLOOR,
      6,
    );
    expect(plan.offsets.body?.[1] ?? 0).toBeGreaterThan(1.5);
  });

  it("does not lift an assembly that already clears the floor", () => {
    const high: ExplodeInput = {
      groups: [
        { group: "body", minY: 1, centerZ: 0 },
        { group: "interior", minY: 1, centerZ: 0 },
      ],
      powertrain: "electric",
      enginePosition: null,
      length: 4.5,
    };
    expect(planExplode(high).lift).toBe(0);
  });

  it("scales travel with the car's length", () => {
    const short = explodeDirections({ ...frontEngined, length: 4.5 });
    const long = explodeDirections({ ...frontEngined, length: 9 });
    expect(long.engine?.[2]).toBeCloseTo((short.engine?.[2] ?? 0) * 2, 6);
    expect(long.electronics?.[0]).toBeCloseTo((short.electronics?.[0] ?? 0) * 2, 6);
    expect(planExplode({ ...frontEngined, length: 9 }).spread.wheels).toBeCloseTo(2.5, 6);
  });

  it("only plans groups that are drawn and interpolates by amount", () => {
    const plan = planExplode(electric);
    expect(plan.offsets.engine).toBeUndefined();
    expect(offsetAt(plan, "engine", 1)).toEqual([0, 0, 0]);
    const half = offsetAt(plan, "body", 0.5);
    expect(half[1]).toBeCloseTo((plan.offsets.body?.[1] ?? 0) / 2, 6);
    expect(offsetAt(plan, "body", 2)).toEqual(plan.offsets.body);
  });
});
