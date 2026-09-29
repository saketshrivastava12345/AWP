import type { EnginePosition, PowertrainKind, ViewerGroup } from "@/types/domain";

/**
 * The exploded view: where each subsystem travels, worked out from the car's
 * own layout.
 *
 * Two rules the old fixed vectors broke:
 *   1. The engine leaves toward ITS end of the car. A 911's engine flying
 *      forward would pass through the cabin; it goes out behind the tail.
 *   2. Nothing may end below the floor. Parts that travel downward (battery,
 *      suspension, exhaust) would sink into an opaque floor and vanish, so
 *      the whole assembly is lifted by exactly the shortfall. The battery of
 *      an EV then ends resting on the floor with the car rising off it,
 *      which is the picture an exploded drawing wants anyway.
 *
 * Pure numbers in and out (no three.js), so it is unit-tested.
 */

export type Vec3 = [number, number, number];

export type GroupExtent = {
  group: ViewerGroup;
  /** Lowest point of the assembled group, metres above the floor. */
  minY: number;
  /** Centre of the group along the car, metres (+ toward the nose). */
  centerZ: number;
};

export type ExplodeInput = {
  /** The groups actually drawn, measured assembled. */
  groups: GroupExtent[];
  powertrain: PowertrainKind;
  /** Where the engine sits; null when no engine is drawn. */
  enginePosition: EnginePosition | null;
  /** Overall length, metres. Travel is authored for a 4.5 m car. */
  length: number;
  /** Nothing may end lower than this, metres. */
  floor?: number;
};

export type ExplodePlan = {
  /** Offset of each group at full separation, lift included. */
  offsets: Partial<Record<ViewerGroup, Vec3>>;
  /** How far the whole assembly is raised to keep every part above the floor. */
  lift: number;
  /** Outward travel of each wheel and brake corner along its own side, metres. */
  spread: { wheels: number; brakes: number };
};

/** A hair above the floor, so nothing z-fights with it. */
export const EXPLODE_FLOOR = 0.015;

/** Authored length the travel distances are written for. */
const REFERENCE_LENGTH = 4.5;

/**
 * Direction and distance of each group before the floor is considered, in
 * metres for this car. Exported for tests and for the camera framing.
 */
export function explodeDirections(
  input: Omit<ExplodeInput, "floor">,
): Partial<Record<ViewerGroup, Vec3>> {
  const k = Math.max(0.5, input.length / REFERENCE_LENGTH);
  const extent = (group: ViewerGroup) =>
    input.groups.find((entry) => entry.group === group);
  const engine = extent("engine");
  const gearbox = extent("transmission");

  // +1: the engine is in the nose and leaves forward. -1: it sits behind the
  // cabin (mid or rear) and leaves backward. 0: no engine drawn.
  const end =
    engine && input.enginePosition ? (input.enginePosition === "front" ? 1 : -1) : 0;

  // A mid-engined car carries its gearbox outboard of the engine, at the very
  // end of the car. There the gearbox has to travel further than the engine,
  // and the engine rises higher to pass over it, or they would cross.
  const gearboxOutboard =
    end !== 0 &&
    engine !== undefined &&
    gearbox !== undefined &&
    end * (gearbox.centerZ - engine.centerZ) > 0.05;

  const base: Record<ViewerGroup, Vec3> = {
    body: [0, 1.55, 0],
    // The cabin lifts and steps away from the engine.
    interior: [0, 0.85, end === 0 ? -0.2 : -end * 0.35],
    engine: gearboxOutboard ? [0, 0.8, end * 1.25] : [0, 0.5, end * 1.75],
    transmission:
      end === 0
        ? [0, -0.1, 0]
        : gearboxOutboard
          ? [0, 0.1, end * 2.3]
          : [0, 0.05, end * 0.45],
    suspension: [0, -0.3, 0],
    // Wheels and brakes also spread outward along their own side (see
    // `spread`), so these only drop them slightly.
    brakes: [0, -0.1, 0],
    wheels: [0, -0.05, 0],
    electronics: [-1.7, 0.4, -0.25],
    battery: input.powertrain === "electric" ? [0, -0.45, 0] : [0, -0.35, 0],
    // Behind a mid or rear engine the exhaust would meet the gearbox on its
    // way out of the tail, so there it steps out sideways instead.
    exhaust: end === -1 ? [1.2, -0.25, -0.5] : [0, -0.3, -1.0],
  };

  const out: Partial<Record<ViewerGroup, Vec3>> = {};
  for (const { group } of input.groups) {
    const [x, y, z] = base[group];
    out[group] = [x * k, y * k, z * k];
  }
  return out;
}

/** Full separation for a car: offsets per group, with the floor respected. */
export function planExplode(input: ExplodeInput): ExplodePlan {
  const floor = input.floor ?? EXPLODE_FLOOR;
  const directions = explodeDirections(input);
  const k = Math.max(0.5, input.length / REFERENCE_LENGTH);

  let lowest = Infinity;
  for (const { group, minY } of input.groups) {
    const vector = directions[group];
    if (vector) lowest = Math.min(lowest, minY + vector[1]);
  }
  const lift = Number.isFinite(lowest) ? Math.max(0, floor - lowest) : 0;

  const offsets: Partial<Record<ViewerGroup, Vec3>> = {};
  for (const [group, vector] of Object.entries(directions) as [ViewerGroup, Vec3][]) {
    offsets[group] = [vector[0], vector[1] + lift, vector[2]];
  }

  return { offsets, lift, spread: { wheels: 1.25 * k, brakes: 0.7 * k } };
}

/** An offset scaled by explode progress (0 = assembled, 1 = fully apart). */
export function offsetAt(plan: ExplodePlan, group: ViewerGroup, amount: number): Vec3 {
  const vector = plan.offsets[group];
  if (!vector) return [0, 0, 0];
  const t = Math.min(1, Math.max(0, amount));
  return [vector[0] * t, vector[1] * t, vector[2] * t];
}
