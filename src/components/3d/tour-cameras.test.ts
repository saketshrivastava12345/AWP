import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { TourStopId } from "@/lib/anatomy-tour";
import { GENERIC_BUILD } from "@/lib/car-build";
import { computeLayout } from "./car-layout";
import { blueprintGroups } from "@/lib/blueprint";
import {
  blueprintShots,
  cameraAt,
  explodedCentre,
  shotFor,
  storyShots,
  tourShots,
} from "./tour-cameras";
import { drawnGroups } from "./viewer-config";

const STOPS: TourStopId[] = [
  "design",
  "engine",
  "drivetrain",
  "chassis",
  "brakes",
  "interior",
  "performance",
];

describe("tour cameras", () => {
  const layout = computeLayout(GENERIC_BUILD);

  it("opens with a shot ahead of the stops", () => {
    const shots = tourShots(
      layout,
      STOPS.map((id) => ({ id })),
    );
    expect(shots).toHaveLength(STOPS.length + 1);
  });

  it("frames a front engine from ahead and highlights it", () => {
    const shot = shotFor(layout, "engine");
    expect(shot.highlight).toBe("engine");
    expect(shot.position.z).toBeGreaterThan(shot.target.z);
  });

  it("never puts the camera under the floor, at or between shots", () => {
    const shots = tourShots(
      layout,
      STOPS.map((id) => ({ id })),
    );
    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    for (let beat = 0; beat <= shots.length - 1; beat += 0.05) {
      cameraAt(shots, beat, false, position, target);
      expect(position.y).toBeGreaterThanOrEqual(0.18);
      expect(Number.isFinite(position.x + position.z)).toBe(true);
    }
  });

  it("cuts instead of flying under reduced motion", () => {
    const shots = tourShots(layout, [{ id: "design" }]);
    const [opening, design] = shots;
    const position = new THREE.Vector3();
    const target = new THREE.Vector3();
    cameraAt(shots, 0.3, true, position, target);
    expect(target.distanceTo(opening!.target)).toBeLessThan(1e-9);
    cameraAt(shots, 0.7, true, position, target);
    expect(target.distanceTo(design!.target)).toBeLessThan(1e-9);
  });

  it("frames the motors instead of an engine on an EV story", () => {
    const ev = computeLayout({
      ...GENERIC_BUILD,
      powertrain: "electric",
      enginePosition: null,
      motors: 2,
    });
    const [engineBeat] = storyShots(ev, ["engine"]);
    expect(engineBeat?.highlight).not.toBe("engine");
  });

  describe("blueprint shots", () => {
    const groups = blueprintGroups(drawnGroups(GENERIC_BUILD));
    const shots = blueprintShots(layout, groups);

    it("has the opening, the drawing, one shot per group and the finale", () => {
      expect(shots).toHaveLength(groups.length + 3);
      expect(shots[2]?.highlight).toBe(groups[0]);
      expect(shots.at(-1)?.highlight).toBeNull();
    });

    it("backs away as more of the car comes apart", () => {
      const distance = (index: number) =>
        shots[index]!.position.distanceTo(shots[index]!.target);
      expect(distance(shots.length - 1)).toBeGreaterThan(distance(1));
      expect(distance(shots.length - 2)).toBeGreaterThan(distance(2));
    });

    it("stays above the floor and finite all the way through", () => {
      const position = new THREE.Vector3();
      const target = new THREE.Vector3();
      for (let beat = 0; beat <= shots.length - 1; beat += 0.05) {
        cameraAt(shots, beat, false, position, target);
        expect(position.y).toBeGreaterThanOrEqual(0.18);
        expect(Number.isFinite(position.x + position.y + position.z)).toBe(true);
      }
    });

    it("sends a rear engine out behind the tail and a front one ahead", () => {
      const rear = computeLayout({ ...GENERIC_BUILD, enginePosition: "rear" });
      const front = computeLayout({ ...GENERIC_BUILD, enginePosition: "front" });
      expect(explodedCentre(rear, "engine").z).toBeLessThan(rear.spec.tailZ + 1);
      expect(explodedCentre(front, "engine").z).toBeGreaterThan(front.spec.frontAxleZ);
    });
  });
});
