import { describe, expect, it } from "vitest";
import type { CarBuild } from "@/lib/car-build";
import { availablePresets, PRESET_IDS, presetAvailability } from "@/lib/viewer-presets";
import { computeLayout } from "./car-layout";
import { carBuildKey, getCarLayout } from "./layout-cache";
import {
  cameraPresets,
  drawnGroups,
  framePreset,
  groupsForPowertrain,
} from "./viewer-config";

const BASE: CarBuild = {
  bodyType: "coupe",
  powertrain: "combustion",
  enginePosition: "front",
  length_mm: null,
  width_mm: null,
  height_mm: null,
  wheelbase_mm: null,
  ground_clearance_mm: null,
  engineLayout: null,
  cylinders: null,
  displacementCc: null,
  aspiration: null,
  transmission: null,
  gears: null,
  drive: null,
  motors: null,
  seats: null,
  rightHandDrive: false,
  rearWing: false,
  plugIn: false,
};

/** Published 911 GT3 (992) figures: rear-engined flat-six, rear-wheel drive. */
const REAR_ENGINED: CarBuild = {
  ...BASE,
  enginePosition: "rear",
  length_mm: 4573,
  width_mm: 1852,
  height_mm: 1279,
  wheelbase_mm: 2457,
  engineLayout: "flat",
  cylinders: 6,
  drive: "rwd",
  rearWing: true,
};

const TRI_MOTOR_EV: CarBuild = {
  ...BASE,
  bodyType: "sedan",
  powertrain: "electric",
  enginePosition: null,
  drive: "awd",
  motors: 3,
  plugIn: true,
};

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(
    (a[0] ?? 0) - (b[0] ?? 0),
    (a[1] ?? 0) - (b[1] ?? 0),
    (a[2] ?? 0) - (b[2] ?? 0),
  );

describe("groupsForPowertrain / drawnGroups", () => {
  it("gives an EV a battery and no engine or exhaust", () => {
    const groups = groupsForPowertrain("electric");
    expect(groups).toContain("battery");
    expect(groups).not.toContain("engine");
    expect(groups).not.toContain("exhaust");
  });

  it("gives a hybrid both an engine and a battery", () => {
    const groups = groupsForPowertrain("hybrid");
    expect(groups).toEqual(expect.arrayContaining(["engine", "battery", "exhaust"]));
  });

  it("never lists an engine whose position is not recorded", () => {
    expect(drawnGroups({ powertrain: "combustion", enginePosition: null })).not.toContain(
      "engine",
    );
    expect(drawnGroups({ powertrain: "combustion", enginePosition: "rear" })).toContain(
      "engine",
    );
  });
});

describe("computeLayout", () => {
  it("puts four wheels on the ground, fronts ahead of rears", () => {
    const layout = computeLayout(REAR_ENGINED);
    expect(layout.wheels).toHaveLength(4);
    for (const wheel of layout.wheels) {
      expect(wheel.position.y).toBeGreaterThan(0);
    }
    const front = layout.wheels.find((wheel) => wheel.front);
    const rear = layout.wheels.find((wheel) => !wheel.front);
    expect(front && rear && front.position.z > rear.position.z).toBe(true);
  });

  it("puts a rear-engined car's engine behind the rear axle", () => {
    const layout = computeLayout(REAR_ENGINED);
    expect(layout.engine).not.toBeNull();
    expect(layout.engine?.center.z).toBeLessThan(layout.spec.rearAxleZ);
    // Rear-wheel drive: only the rear axle is driven.
    expect(layout.driven).toEqual({ front: false, rear: true });
  });

  it("draws no engine when its position is unknown", () => {
    expect(computeLayout({ ...REAR_ENGINED, enginePosition: null }).engine).toBeNull();
  });

  it("gives a tri-motor EV three motors, a battery and no engine", () => {
    const layout = computeLayout(TRI_MOTOR_EV);
    expect(layout.engine).toBeNull();
    expect(layout.motors).toHaveLength(3);
    expect(layout.battery).not.toBeNull();
    expect(layout.gearbox).toBeNull();
  });

  it("models a car with published dimensions at its real length", () => {
    const layout = computeLayout(REAR_ENGINED);
    expect(layout.spec.length).toBeCloseTo(4.573, 2);
  });
});

describe("layout cache", () => {
  it("returns the same layout for an equal build, a new one for a different build", () => {
    const first = getCarLayout(REAR_ENGINED);
    expect(getCarLayout({ ...REAR_ENGINED })).toBe(first);
    expect(getCarLayout({ ...REAR_ENGINED, rearWing: false })).not.toBe(first);
    expect(carBuildKey(REAR_ENGINED)).toBe(carBuildKey({ ...REAR_ENGINED }));
  });
});

describe("cameraPresets", () => {
  it("keeps every camera above the floor", () => {
    for (const build of [BASE, REAR_ENGINED, TRI_MOTOR_EV]) {
      const presets = cameraPresets(computeLayout(build));
      for (const id of PRESET_IDS) {
        expect(presets[id].position[1]).toBeGreaterThan(0.1);
      }
    }
  });

  it("approaches a rear engine from behind and a front engine from ahead", () => {
    const rear = cameraPresets(computeLayout(REAR_ENGINED)).engine;
    expect(rear.position[2]).toBeLessThan(rear.target[2]);
    const front = cameraPresets(
      computeLayout({ ...BASE, engineLayout: "vee", cylinders: 8 }),
    ).engine;
    expect(front.position[2]).toBeGreaterThan(front.target[2]);
  });

  it("only offers presets the car can show", () => {
    const ev = availablePresets(presetAvailability(TRI_MOTOR_EV));
    expect(ev).toContain("battery");
    expect(ev).not.toContain("engine");
    const petrol = availablePresets(presetAvailability(REAR_ENGINED));
    expect(petrol).toContain("engine");
    expect(petrol).not.toContain("battery");
  });
});

describe("framePreset", () => {
  const front = cameraPresets(computeLayout(REAR_ENGINED)).front34;
  const length = 4.573;

  it("leaves a wide stage at the preset's own framing", () => {
    const framed = framePreset(front, { aspect: 2, exploded: false, length });
    expect(framed.position).toEqual(front.position);
    expect(framed.target).toEqual(front.target);
  });

  it("pulls back on a narrow stage so the car is not cropped", () => {
    const wide = framePreset(front, { aspect: 2, exploded: false, length });
    const narrow = framePreset(front, { aspect: 0.6, exploded: false, length });
    expect(distance(narrow.position, narrow.target)).toBeGreaterThan(
      distance(wide.position, wide.target),
    );
  });

  it("pulls back and aims higher when exploded", () => {
    const assembled = framePreset(front, { aspect: 2, exploded: false, length });
    const exploded = framePreset(front, { aspect: 2, exploded: true, length });
    expect(exploded.target[1]).toBeGreaterThan(assembled.target[1]);
    expect(distance(exploded.position, exploded.target)).toBeGreaterThan(
      distance(assembled.position, assembled.target),
    );
  });

  it("does not move interior views", () => {
    const interior = cameraPresets(computeLayout(REAR_ENGINED)).interior;
    const framed = framePreset(interior, { aspect: 0.5, exploded: true, length });
    expect(framed.position).toEqual(interior.position);
  });
});
