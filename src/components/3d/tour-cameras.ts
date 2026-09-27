import * as THREE from "three";
import type { TourStop, TourStopId } from "@/lib/anatomy-tour";
import type { ViewerGroup } from "@/types/domain";
import { explodeDirections, type GroupExtent } from "@/lib/viewer-explode";
import type { CarLayout } from "./car-layout";

/**
 * Camera shots for the anatomy tour, one per stop plus the opening shot.
 *
 * Every shot is framed from this car's own layout — where its engine, battery
 * and front suspension actually are — so the "engine" beat of a 911 looks in
 * behind the rear axle while the same beat on a saloon looks under the bonnet.
 */

export type Shot = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** How far to ghost the bodywork for this shot. */
  ghost: number;
  /** Subsystem to tint, if any. */
  highlight: ViewerGroup | null;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function tourShots(layout: CarLayout, stops: Pick<TourStop, "id">[]): Shot[] {
  const { spec } = layout;
  const k = spec.length / 4.5;
  const opening: Shot = {
    position: v(4.7 * k, 0.9 + spec.height * 0.12, 5.5 * k),
    target: v(0, spec.height * 0.36, 0.1 * k),
    ghost: 0,
    highlight: null,
  };
  return [opening, ...stops.map(({ id }) => shotFor(layout, id))];
}

/** The framing for one tour stop. */
export function shotFor(layout: CarLayout, id: TourStopId): Shot {
  const { spec, anchors, cabin } = layout;
  const k = spec.length / 4.5;
  const H = spec.height;
  const L = spec.length;
  const endOf = (point: THREE.Vector3) => (point.z >= 0 ? 1 : -1);

  switch (id) {
    case "design":
      return {
        position: v(2.6 * k, 1.05 + H * 0.2, L / 2 + 2.4 * k),
        target: v(0, H * 0.4, L * 0.2),
        ghost: 0,
        highlight: null,
      };
    case "engine": {
      const at = anchors.engine;
      return {
        position: v(at.x + 2.0 * k, at.y + 1.45, at.z + endOf(at) * 2.0 * k),
        target: at.clone(),
        ghost: 1,
        highlight: "engine",
      };
    }
    case "electric": {
      const at = anchors.motor;
      return {
        position: v(at.x + 2.1 * k, at.y + 1.35, at.z + endOf(at) * 1.9 * k),
        target: at.clone(),
        ghost: 1,
        highlight: "battery",
      };
    }
    case "battery": {
      const at = anchors.battery;
      return {
        position: v(2.5 * k, 2.5 + H * 0.3, at.z + 1.5 * k),
        target: at.clone(),
        ghost: 1,
        highlight: "battery",
      };
    }
    case "drivetrain": {
      const at = layout.gearbox ? anchors.gearbox : anchors.motor;
      return {
        position: v(2.7 * k, 0.9 + H * 0.12, at.z - endOf(at) * 1.5 * k),
        target: at.clone(),
        ghost: 1,
        highlight: "transmission",
      };
    }
    case "chassis": {
      const at = anchors.frontSuspension;
      return {
        position: v(0.35, 1.1 + H * 0.2, spec.frontAxleZ + 2.3 * k),
        target: at.clone(),
        ghost: 1,
        highlight: "suspension",
      };
    }
    case "brakes": {
      const at = anchors.frontWheel;
      return {
        position: v(at.x + 1.85 * k, at.y + 0.42, at.z + 1.25 * k),
        target: v(at.x - 0.12, at.y + 0.02, at.z),
        ghost: 0,
        highlight: "brakes",
      };
    }
    case "interior":
      return {
        position: v(cabin.driverX * 0.9 + 0.6, H + 1.05, (cabin.seatRows[0] ?? 0) - 1.55),
        target: v(0, cabin.floorY + 0.35, ((cabin.seatRows[0] ?? 0) + cabin.dashZ) / 2),
        ghost: 0.85,
        highlight: "interior",
      };
    case "performance":
      return {
        position: v(L * 1.75, 0.7, -0.2 * k),
        target: v(0, H * 0.4, 0.45 * k),
        ghost: 0,
        highlight: null,
      };
  }
}

/** The same shot from further away along its line of sight. */
function pullBack(shot: Shot, factor: number): Shot {
  const position = shot.position
    .clone()
    .sub(shot.target)
    .multiplyScalar(factor)
    .add(shot.target);
  return { ...shot, position };
}

/** The beats of the home page story, in the order it tells them. */
export type StoryShotId = "front" | "engine" | "interior" | "brakes" | "rear" | "whole";

/**
 * Shots for the home page story. The subsystem beats share the tour's framing;
 * the rear mirrors the front, and the finale pulls back far enough to hold the
 * car fully exploded.
 */
export function storyShots(layout: CarLayout, ids: readonly StoryShotId[]): Shot[] {
  const { spec } = layout;
  const k = spec.length / 4.5;
  const H = spec.height;
  const L = spec.length;

  return ids.map((id): Shot => {
    switch (id) {
      // The story opens here, so the whole car has to read, not just its nose.
      case "front":
        return {
          position: v(3.3 * k, 1.1 + H * 0.15, L / 2 + 3.3 * k),
          target: v(0, H * 0.38, L * 0.1),
          ghost: 0,
          highlight: null,
        };
      case "engine":
        return shotFor(layout, layout.engine ? "engine" : "electric");
      // The tour's cabin shot sits beside a card; full-bleed it is too close.
      case "interior":
        return pullBack(shotFor(layout, "interior"), 1.6);
      case "brakes":
        return shotFor(layout, "brakes");
      case "rear":
        return {
          position: v(-2.6 * k, 1.05 + H * 0.2, -(L / 2 + 2.4 * k)),
          target: v(0, H * 0.4, -L * 0.2),
          ghost: 0,
          highlight: null,
        };
      // Far enough back to hold the car fully exploded, and aimed a little
      // forward so the engine, which travels furthest, stays clear of the
      // caption column.
      case "whole":
        return {
          position: v(8.3 * k, 3.3 + H * 0.35, 11.2 * k),
          target: v(0, 0.85, 0.9 * k),
          ghost: 0,
          highlight: null,
        };
    }
  });
}

/**
 * Where a group sits in the assembled car, roughly: enough to aim a camera
 * at, not to place a part. (The car measures itself for the real explode.)
 */
function groupCentre(layout: CarLayout, group: ViewerGroup): THREE.Vector3 {
  const { spec, anchors } = layout;
  const R = spec.wheelRadius;
  switch (group) {
    case "body":
      return v(0, spec.height * 0.55, 0);
    case "wheels":
    case "brakes":
      return v(0, R, (spec.frontAxleZ + spec.rearAxleZ) / 2);
    case "suspension":
      return v(0, R + 0.1, (spec.frontAxleZ + spec.rearAxleZ) / 2);
    case "engine":
      return layout.engine?.center.clone() ?? anchors.engine.clone();
    case "battery":
      return layout.battery?.center.clone() ?? anchors.motor.clone();
    case "transmission":
      return layout.gearbox?.center.clone() ?? anchors.gearbox.clone();
    case "exhaust":
      return v(0, spec.groundClearance + 0.15, spec.tailZ + 0.6);
    case "interior":
      return v(0, layout.cabin.floorY + 0.35, layout.cabin.seatRows[0] ?? 0);
    case "electronics":
      return v(0, spec.height * 0.45, layout.cabin.dashZ);
  }
}

/** Where a group ends up when the car is exploded, roughly (see groupCentre). */
export function explodedCentre(layout: CarLayout, group: ViewerGroup): THREE.Vector3 {
  const { build, spec } = layout;
  const groups: ViewerGroup[] = [group];
  // The engine's and gearbox's paths depend on each other (a mid-engined
  // gearbox travels past the engine), so both are always considered.
  if (group === "engine" || group === "transmission")
    groups.push(group === "engine" ? "transmission" : "engine");
  const extents: GroupExtent[] = groups.map((name) => ({
    group: name,
    minY: 0.1,
    centerZ: groupCentre(layout, name).z,
  }));
  const direction = explodeDirections({
    groups: extents,
    powertrain: build.powertrain,
    enginePosition: layout.engine ? build.enginePosition : null,
    length: spec.length,
  })[group] ?? [0, 0, 0];
  return groupCentre(layout, group).add(v(...direction));
}

/**
 * Shots for the blueprint (the anatomy tour taken apart): the opening shot,
 * the drawing with its dimensions, one shot per group as it comes off, and the
 * whole car exploded.
 *
 * The camera stays high and three-quarter on, as an exploded drawing is, and
 * backs away as more of the car is separated; for each group it leans toward
 * where that group is going, so the part in motion is the centre of the frame.
 */
export function blueprintShots(layout: CarLayout, groups: readonly ViewerGroup[]): Shot[] {
  const { spec } = layout;
  const k = spec.length / 4.5;
  const H = spec.height;
  const opening = tourShots(layout, [])[0];
  const deg = THREE.MathUtils.degToRad;

  /** A shot on a sphere around `target`: azimuth from +z toward +x, elevation above level. */
  const orbit = (
    target: THREE.Vector3,
    radius: number,
    azimuth: number,
    elevation: number,
  ): THREE.Vector3 =>
    new THREE.Vector3(
      Math.sin(deg(azimuth)) * Math.cos(deg(elevation)),
      Math.sin(deg(elevation)),
      Math.cos(deg(azimuth)) * Math.cos(deg(elevation)),
    )
      .multiplyScalar(radius)
      .add(target);

  const drawingTarget = v(0, H * 0.4, 0);
  const drawing: Shot = {
    position: orbit(drawingTarget, 7.4 * k, 58, 20),
    target: drawingTarget,
    ghost: 1,
    highlight: null,
  };

  const count = Math.max(1, groups.length);
  const perGroup = groups.map((group, index): Shot => {
    const progress = (index + 1) / count;
    const whole = v(0, H * 0.45 + 0.55 * k * progress, 0.1 * k);
    const target = whole.lerp(explodedCentre(layout, group), 0.35);
    target.y = Math.max(0.35, target.y);
    return {
      position: orbit(
        target,
        (8.4 + 3.2 * progress) * k,
        60 - 10 * progress,
        22 + 4 * progress,
      ),
      target,
      ghost: 1,
      highlight: group,
    };
  });

  const finaleTarget = v(0, 0.95 * k, 0.1 * k);
  const finale: Shot = {
    position: orbit(finaleTarget, 12.2 * k, 50, 25),
    target: finaleTarget,
    ghost: 1,
    highlight: null,
  };

  return [...(opening ? [opening] : []), drawing, ...perGroup, finale];
}

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();

function toSpherical(shot: Shot) {
  offset.subVectors(shot.position, shot.target);
  spherical.setFromVector3(offset);
  return { radius: spherical.radius, phi: spherical.phi, theta: spherical.theta };
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/**
 * The camera at scroll position `beat` (0 = opening shot, 1 = first stop…).
 *
 * The camera holds at each stop for part of the scroll so the card beside it
 * can be read, then travels. It orbits between shots — interpolating around
 * the target rather than in a straight line — so it swings around the car
 * instead of cutting through it.
 */
export function cameraAt(
  shots: Shot[],
  beat: number,
  reducedMotion: boolean,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  const last = shots.length - 1;
  const clamped = Math.min(last, Math.max(0, beat));
  const index = Math.min(last - 1, Math.floor(clamped));
  const from = shots[Math.max(0, index)];
  const to = shots[Math.min(last, index + 1)];
  if (!from || !to) return;

  const raw = clamped - index;
  // Reduced motion: cut between shots instead of flying.
  const t = reducedMotion ? (raw < 0.5 ? 0 : 1) : smoothstep((raw - 0.2) / 0.6);

  outTarget.lerpVectors(from.target, to.target, t);
  const a = toSpherical(from);
  const b = toSpherical(to);
  let dTheta = b.theta - a.theta;
  if (dTheta > Math.PI) dTheta -= Math.PI * 2;
  if (dTheta < -Math.PI) dTheta += Math.PI * 2;
  spherical.set(
    a.radius + (b.radius - a.radius) * t,
    a.phi + (b.phi - a.phi) * t,
    a.theta + dTheta * t,
  );
  outPosition.setFromSpherical(spherical).add(outTarget);
  // Never below the showroom floor.
  outPosition.y = Math.max(0.18, outPosition.y);
}
