import * as THREE from "three";
import type { DimensionId, PublishedDimensions } from "@/lib/viewer-dimensions";
import type { CarLayout } from "./car-layout";

/**
 * Where each measurement line runs, in the car's own space (metres, +Z the
 * nose, +X the car's left, which faces the default camera).
 *
 * The lines take their LENGTH from the published figure, not from the model:
 * the label and the line say the same thing. They are placed like a
 * dimensioned drawing — length and height on the near side, width across the
 * nose, wheelbase at hub height, ground clearance under the sill.
 */

export type DimensionLine = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** Extension lines from the car out to each end of the dimension line. */
  extA: [THREE.Vector3, THREE.Vector3] | null;
  extB: [THREE.Vector3, THREE.Vector3] | null;
};

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function dimensionLines(
  layout: CarLayout,
  dimensions: PublishedDimensions,
): Partial<Record<DimensionId, DimensionLine>> {
  const { spec, shape } = layout;
  const halfWidth = spec.width / 2;
  const offset = halfWidth + 0.45;
  const floor = 0.02;
  const lines: Partial<Record<DimensionId, DimensionLine>> = {};

  if (dimensions.length_mm) {
    const length = dimensions.length_mm / 1000;
    const nose = spec.noseZ;
    const tail = nose - length;
    lines.length = {
      a: v(offset, floor, tail),
      b: v(offset, floor, nose),
      extA: [v(halfWidth * 0.8, floor, tail), v(offset + 0.08, floor, tail)],
      extB: [v(halfWidth * 0.8, floor, nose), v(offset + 0.08, floor, nose)],
    };
  }

  if (dimensions.width_mm) {
    const width = dimensions.width_mm / 1000;
    const z = spec.noseZ + 0.5;
    lines.width = {
      a: v(-width / 2, floor, z),
      b: v(width / 2, floor, z),
      extA: [v(-width / 2, floor, spec.frontAxleZ), v(-width / 2, floor, z + 0.08)],
      extB: [v(width / 2, floor, spec.frontAxleZ), v(width / 2, floor, z + 0.08)],
    };
  }

  if (dimensions.height_mm) {
    const height = dimensions.height_mm / 1000;
    // Measured at the highest point of the roof.
    let peakU = 0.5;
    let peak = -Infinity;
    for (let u = 0.1; u <= 0.9; u += 0.01) {
      const s = shape.station(u);
      const top = s.belt + s.glass + s.crown;
      if (top > peak) {
        peak = top;
        peakU = u;
      }
    }
    const z = shape.zOf(peakU);
    lines.height = {
      a: v(offset, 0, z),
      b: v(offset, height, z),
      extA: null,
      extB: [v(shape.station(peakU).edge * 0.5, height, z), v(offset + 0.08, height, z)],
    };
  }

  if (dimensions.wheelbase_mm) {
    const wheelbase = dimensions.wheelbase_mm / 1000;
    const y = spec.wheelRadius;
    const face = spec.track / 2 + spec.tyreWidth / 2;
    const x = face + 0.22;
    const front = spec.frontAxleZ;
    const rear = front - wheelbase;
    lines.wheelbase = {
      a: v(x, y, rear),
      b: v(x, y, front),
      extA: [v(face, y, rear), v(x + 0.06, y, rear)],
      extB: [v(face, y, front), v(x + 0.06, y, front)],
    };
  }

  if (dimensions.ground_clearance_mm) {
    const clearance = dimensions.ground_clearance_mm / 1000;
    const z = (spec.frontAxleZ + spec.rearAxleZ) / 2;
    const x = halfWidth * 0.9;
    lines.groundClearance = {
      a: v(x, 0, z),
      b: v(x, clearance, z),
      extA: null,
      extB: null,
    };
  }

  return lines;
}
