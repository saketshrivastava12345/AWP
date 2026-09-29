import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CarLayout, EngineInfo } from "./car-layout";
import type { MaterialName } from "./car-materials";
import { rodBetween, springGeometry, tubeAlong } from "./car-parts";

/**
 * The car's mechanical systems as lists of parts.
 *
 * Each builder returns static geometry with its transform already baked in,
 * plus the material slot to draw it with. Nothing here moves on its own —
 * explode and highlight act on whole subsystems — so baking keeps every
 * part a single draw call with no per-frame matrix work.
 */

export type Part = { geometry: THREE.BufferGeometry; material: MaterialName };

type Transform = {
  position?: [number, number, number] | THREE.Vector3;
  rotation?: [number, number, number];
  scale?: number;
};

function place(
  geometry: THREE.BufferGeometry,
  transform: Transform = {},
): THREE.BufferGeometry {
  const matrix = new THREE.Matrix4();
  const position =
    transform.position instanceof THREE.Vector3
      ? transform.position
      : new THREE.Vector3(...(transform.position ?? [0, 0, 0]));
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...(transform.rotation ?? [0, 0, 0])),
  );
  const s = transform.scale ?? 1;
  matrix.compose(position, quaternion, new THREE.Vector3(s, s, s));
  geometry.applyMatrix4(matrix);
  return geometry;
}

const rbox = (w: number, h: number, d: number, r = 0.02, segments = 2) =>
  new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2, h / 2, d / 2) * 0.999);

/** Cylinder along the given axis. */
function cyl(
  radius: number,
  length: number,
  axis: "x" | "y" | "z",
  segments = 20,
  radiusBottom?: number,
) {
  const geometry = new THREE.CylinderGeometry(
    radius,
    radiusBottom ?? radius,
    length,
    segments,
  );
  if (axis === "x") geometry.rotateZ(Math.PI / 2);
  if (axis === "z") geometry.rotateX(Math.PI / 2);
  return geometry;
}

/** Apply a parent transform to every part in a list (a subassembly). */
function transformAll(parts: Part[], matrix: THREE.Matrix4): Part[] {
  for (const part of parts) part.geometry.applyMatrix4(matrix);
  return parts;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * One cylinder bank, built along +Z with its cylinders stacked up +Y from the
 * crank centre. Coil packs on top make the cylinder count legible.
 */
function bank(
  perBank: number,
  length: number,
  lowDetail: boolean,
  turbo: boolean,
  radial = 1,
): Part[] {
  const r = radial;
  const parts: Part[] = [
    {
      geometry: place(rbox(0.21, 0.3 * r, length, 0.03), { position: [0, 0.23 * r, 0] }),
      material: "alloy",
    },
    {
      geometry: place(rbox(0.235, 0.13 * r, length * 0.97, 0.03), {
        position: [0, 0.44 * r, 0],
      }),
      material: "alloy",
    },
    {
      geometry: place(rbox(0.2, 0.07, length * 0.9, 0.03), {
        position: [0, 0.54 * r, 0],
      }),
      material: "camCover",
    },
  ];
  const pitch = (length - 0.16) / perBank;
  for (let k = 0; k < perBank; k += 1) {
    const z = -length / 2 + 0.08 + pitch * (k + 0.5);
    parts.push({
      geometry: place(cyl(0.022, 0.07, "y", lowDetail ? 8 : 14), {
        position: [0, 0.54 * r + 0.06, z],
      }),
      material: "trim",
    });
    parts.push({
      geometry: place(cyl(0.012, 0.02, "y", 8), { position: [0, 0.54 * r + 0.1, z] }),
      material: "spring",
    });
    if (!lowDetail) {
      // Exhaust runner curving down and out from each port.
      parts.push({
        geometry: tubeAlong(
          [
            new THREE.Vector3(0.12, 0.4 * r, z),
            new THREE.Vector3(0.2, 0.36 * r, z),
            new THREE.Vector3(0.24, 0.24 * r, z * 0.7),
            new THREE.Vector3(0.25, 0.12 * r, z * 0.35),
          ],
          0.022,
          lowDetail,
        ),
        material: "castIron",
      });
    }
  }
  if (turbo) {
    parts.push(...turbocharger(new THREE.Vector3(0.27, 0.06, 0), lowDetail));
  }
  return parts;
}

function turbocharger(at: THREE.Vector3, lowDetail: boolean): Part[] {
  const hot = new THREE.TorusGeometry(
    0.058,
    0.034,
    lowDetail ? 8 : 14,
    lowDetail ? 16 : 28,
  );
  hot.rotateY(Math.PI / 2);
  return [
    { geometry: place(hot, { position: at }), material: "castIron" },
    {
      geometry: place(cyl(0.064, 0.08, "x", lowDetail ? 12 : 24), {
        position: [at.x + 0.07, at.y, at.z],
      }),
      material: "alloy",
    },
    {
      geometry: place(cyl(0.03, 0.12, "y", 12), {
        position: [at.x + 0.07, at.y + 0.1, at.z],
      }),
      material: "alloy",
    },
  ];
}

/** The engine in its own frame: crank along +Z through the origin, unscaled. */
export function engineParts(
  engine: Pick<
    EngineInfo,
    "kind" | "perBank" | "length" | "bankAngle" | "turbos" | "supercharged"
  >,
  lowDetail: boolean,
): Part[] {
  const { kind, perBank, length, bankAngle, turbos } = engine;
  const parts: Part[] = [];

  // Crankcase and sump.
  const caseWidth = kind === "flat" ? 0.34 : kind === "vee" ? 0.38 : 0.3;
  parts.push({
    geometry: place(rbox(caseWidth, 0.24, length, 0.03), { position: [0, 0, 0] }),
    material: "alloy",
  });
  parts.push({
    geometry: place(rbox(caseWidth * 0.86, 0.12, length * 0.84, 0.02), {
      position: [0, -0.16, 0],
    }),
    material: "castIron",
  });
  // Crank pulley and belt drive at the front.
  parts.push({
    geometry: place(cyl(0.085, 0.04, "z", 28), {
      position: [0, 0.02, length / 2 + 0.03],
    }),
    material: "steel",
  });

  if (kind === "block") {
    // Layout not recorded: a plain engine, no cylinders to count.
    parts.push({
      geometry: place(rbox(0.46, 0.36, length * 0.95, 0.05), { position: [0, 0.28, 0] }),
      material: "alloy",
    });
    parts.push({
      geometry: place(rbox(0.4, 0.06, length * 0.85, 0.03), { position: [0, 0.49, 0] }),
      material: "camCover",
    });
    return parts;
  }

  if (kind === "inline") {
    parts.push(...bank(perBank, length, lowDetail, turbos > 0));
    if (turbos > 1)
      parts.push(
        ...turbocharger(new THREE.Vector3(0.27, 0.06, length * 0.25), lowDetail),
      );
    // Intake plenum and runners on the cold side.
    parts.push({
      geometry: place(rbox(0.1, 0.12, length * 0.8, 0.04), {
        position: [-0.26, 0.36, 0],
      }),
      material: "carbon",
    });
    if (!lowDetail) {
      const pitch = (length - 0.16) / perBank;
      for (let k = 0; k < perBank; k += 1) {
        const z = -length / 2 + 0.08 + pitch * (k + 0.5);
        parts.push({
          geometry: rodBetween(
            new THREE.Vector3(-0.21, 0.37, z),
            new THREE.Vector3(-0.12, 0.42, z),
            0.022,
          ),
          material: "alloy",
        });
      }
    }
    return parts;
  }

  // Vee or flat: two banks either side of the crank. The left bank is the
  // right one turned 180° about the vertical rather than mirrored, because a
  // negative scale would turn its faces inside out.
  const half = bankAngle / 2;
  const radial = kind === "flat" ? 0.74 : 0.9;
  for (const side of [1, -1] as const) {
    const bankParts = bank(perBank, length, lowDetail, turbos > 0, radial);
    const matrix = new THREE.Matrix4().makeRotationZ(-side * half);
    if (side === -1) matrix.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    parts.push(...transformAll(bankParts, matrix));
  }

  if (kind === "vee") {
    // Intake plenum in the valley.
    const valleyY = 0.3 + Math.cos(half) * 0.1;
    parts.push({
      geometry: place(rbox(0.3, 0.12, length * 0.82, 0.05), {
        position: [0, valleyY, 0],
      }),
      material: "carbon",
    });
    parts.push({
      geometry: place(cyl(0.06, 0.12, "z", 20), {
        position: [0, valleyY, length * 0.46],
      }),
      material: "alloy",
    });
  } else {
    // Flat engine: induction on top, fan-and-shroud style cover.
    parts.push({
      geometry: place(rbox(0.36, 0.1, length * 0.9, 0.04), { position: [0, 0.2, 0] }),
      material: "carbon",
    });
  }

  if (engine.supercharged) {
    parts.push({
      geometry: place(rbox(0.26, 0.14, length * 0.6, 0.05), { position: [0, 0.56, 0] }),
      material: "alloy",
    });
    parts.push({
      geometry: place(cyl(0.05, 0.04, "z", 20), { position: [0, 0.56, length * 0.32] }),
      material: "steel",
    });
  }

  return parts;
}

export function buildEngine(layout: CarLayout, lowDetail: boolean): Part[] {
  const { engine, spec, shape } = layout;
  if (!engine) return [];

  const parts = engineParts(engine, lowDetail);
  const matrix = new THREE.Matrix4().compose(
    engine.center,
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, engine.longitudinal ? 0 : Math.PI / 2, 0),
    ),
    new THREE.Vector3(engine.scale, engine.scale, engine.scale),
  );
  transformAll(parts, matrix);

  // Radiator at the nose, where the air comes in. Mid- and rear-engined cars
  // mostly keep theirs up front too, piped back to the engine.
  const noseU = 1 - spec.def.capFront - 0.03;
  const s = shape.station(noseU);
  const height = (s.belt - s.bottom) * 0.62;
  parts.push({
    geometry: place(rbox(spec.width * 0.55, height, 0.05, 0.012), {
      position: [0, s.bottom + height / 2 + 0.03, s.z - 0.08],
      rotation: [-0.12, 0, 0],
    }),
    material: "alloy",
  });
  return parts;
}

// ---------------------------------------------------------------------------
// Transmission and driveline
// ---------------------------------------------------------------------------

export function buildTransmission(layout: CarLayout, lowDetail: boolean): Part[] {
  const { gearbox, propshaft, differentials, spec, motors } = layout;
  const parts: Part[] = [];
  const hubX = spec.track / 2 - spec.tyreWidth / 2 - 0.02;

  if (gearbox) {
    parts.push({
      geometry: place(rbox(gearbox.size.x, gearbox.size.y, gearbox.size.z, 0.05), {
        position: gearbox.center,
      }),
      material: "alloy",
    });
    // Ribbed casing.
    if (!lowDetail) {
      for (let k = -2; k <= 2; k += 1) {
        parts.push({
          geometry: place(
            rbox(gearbox.size.x + 0.02, gearbox.size.y * 0.8, 0.02, 0.008),
            {
              position: [
                gearbox.center.x,
                gearbox.center.y,
                gearbox.center.z + (k * gearbox.size.z) / 5.5,
              ],
            },
          ),
          material: "castIron",
        });
      }
    }
  }

  if (propshaft) {
    parts.push({
      geometry: rodBetween(propshaft[0], propshaft[1], 0.04, 14),
      material: "steel",
    });
    for (const end of propshaft) {
      parts.push({
        geometry: place(new THREE.SphereGeometry(0.05, 14, 10), { position: end }),
        material: "castIron",
      });
    }
  }

  // Differentials and half-shafts to each driven wheel.
  for (const diff of differentials) {
    parts.push({
      geometry: place(new THREE.SphereGeometry(0.13, 20, 14), { position: diff }),
      material: "castIron",
    });
    parts.push({
      geometry: place(cyl(0.1, 0.24, "x", 20), { position: diff }),
      material: "alloy",
    });
    for (const side of [1, -1]) {
      const from = new THREE.Vector3(side * 0.13, diff.y, diff.z);
      const to = new THREE.Vector3(side * hubX, diff.y, diff.z);
      parts.push({ geometry: rodBetween(from, to, 0.028, 12), material: "steel" });
      // Constant-velocity joint boots at both ends.
      for (const end of [from.clone().lerp(to, 0.08), from.clone().lerp(to, 0.92)]) {
        parts.push({
          geometry: place(cyl(0.045, 0.1, "x", 14, 0.03), { position: end }),
          material: "trim",
        });
      }
    }
  }

  // Battery-electric: reduction gear cases alongside each motor.
  for (const motor of motors) {
    if (gearbox) break;
    parts.push({
      geometry: place(rbox(0.16, 0.24, 0.3, 0.04), {
        position: [
          motor.position.x + motor.length / 2 + 0.1,
          motor.position.y,
          motor.position.z,
        ],
      }),
      material: "alloy",
    });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Suspension
// ---------------------------------------------------------------------------

export function buildSuspension(layout: CarLayout, lowDetail: boolean): Part[] {
  const { wheels, spec } = layout;
  const parts: Part[] = [];
  const R = spec.wheelRadius;

  for (const { position, side } of wheels) {
    const hubX = position.x - side * (spec.tyreWidth / 2 + 0.05);
    const innerX = position.x - side * 0.5;
    const z = position.z;

    // Upright.
    parts.push({
      geometry: place(rbox(0.05, 0.3, 0.1, 0.015), { position: [hubX, R, z] }),
      material: "castIron",
    });

    // Lower and upper wishbones, each an A-arm to two chassis pickups.
    for (const [yHub, yInner, spread, radius] of [
      [R - 0.12, R - 0.1, 0.2, 0.02],
      [R + 0.14, R + 0.17, 0.15, 0.016],
    ] as const) {
      const hub = new THREE.Vector3(hubX, yHub, z);
      for (const dz of [-spread, spread]) {
        parts.push({
          geometry: rodBetween(
            hub,
            new THREE.Vector3(innerX, yInner, z + dz),
            radius,
            10,
          ),
          material: "steel",
        });
      }
    }

    // Coil-over damper, leaning inboard.
    const bottom = new THREE.Vector3(hubX - side * 0.1, R - 0.08, z);
    const top = new THREE.Vector3(hubX - side * 0.22, R + 0.36, z);
    const axis = new THREE.Vector3().subVectors(top, bottom);
    const length = axis.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.clone().normalize(),
    );
    const middle = bottom.clone().add(top).multiplyScalar(0.5);
    const spring = springGeometry(0.05, length * 0.72, 7, 0.009, lowDetail);
    spring.applyQuaternion(quaternion);
    spring.translate(middle.x, middle.y, middle.z);
    parts.push({ geometry: spring, material: "spring" });
    parts.push({ geometry: rodBetween(bottom, top, 0.021, 12), material: "castIron" });
    parts.push({
      geometry: rodBetween(middle.clone().lerp(top, 0.2), top, 0.03, 12),
      material: "trim",
    });
  }

  // Anti-roll bars, one per axle.
  for (const axleZ of [spec.frontAxleZ, spec.rearAxleZ]) {
    const x = spec.track / 2 - spec.tyreWidth / 2 - 0.2;
    const z = axleZ - 0.16;
    parts.push({
      geometry: tubeAlong(
        [
          new THREE.Vector3(x, R - 0.06, axleZ - 0.02),
          new THREE.Vector3(x - 0.08, R - 0.04, z),
          new THREE.Vector3(0, R - 0.03, z),
          new THREE.Vector3(-x + 0.08, R - 0.04, z),
          new THREE.Vector3(-x, R - 0.06, axleZ - 0.02),
        ],
        0.014,
        lowDetail,
      ),
      material: "steel",
    });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Battery and electric drive
// ---------------------------------------------------------------------------

export function buildBattery(layout: CarLayout, lowDetail: boolean): Part[] {
  const { battery, motors } = layout;
  const parts: Part[] = [];

  if (battery) {
    const { center, size } = battery;
    parts.push({
      geometry: place(rbox(size.x, size.y, size.z, 0.03), { position: center }),
      material: "battery",
    });
    // Module grid across the top of the pack.
    const rows = Math.max(1, Math.round(size.z / 0.34));
    if (!lowDetail) {
      for (let k = 1; k < rows; k += 1) {
        const z = center.z - size.z / 2 + (k * size.z) / rows;
        parts.push({
          geometry: place(rbox(size.x * 0.96, 0.012, 0.02, 0.004), {
            position: [0, center.y + size.y / 2 + 0.004, z],
          }),
          material: "steel",
        });
      }
      parts.push({
        geometry: place(rbox(0.02, 0.012, size.z * 0.96, 0.004), {
          position: [0, center.y + size.y / 2 + 0.004, center.z],
        }),
        material: "steel",
      });
    }
    // Service disconnect, in high-voltage orange.
    parts.push({
      geometry: place(rbox(0.12, 0.05, 0.08, 0.01), {
        position: [0, center.y + size.y / 2 + 0.025, center.z + size.z * 0.3],
      }),
      material: "hv",
    });
  }

  for (const motor of motors) {
    const { position, length, radius } = motor;
    parts.push({
      geometry: place(cyl(radius, length, "x", lowDetail ? 16 : 32), { position }),
      material: "alloy",
    });
    parts.push({
      geometry: place(cyl(radius * 0.72, length + 0.03, "x", lowDetail ? 12 : 24), {
        position,
      }),
      material: "copper",
    });
    // Inverter on top of the drive unit.
    parts.push({
      geometry: place(rbox(length * 0.9, 0.08, radius * 1.6, 0.015), {
        position: [position.x, position.y + radius + 0.05, position.z],
      }),
      material: "pcb",
    });
    if (battery) {
      const start = new THREE.Vector3(
        position.x * 0.5,
        battery.center.y + battery.size.y / 2,
        THREE.MathUtils.clamp(
          position.z,
          battery.center.z - battery.size.z / 2,
          battery.center.z + battery.size.z / 2,
        ),
      );
      const end = new THREE.Vector3(position.x, position.y + radius + 0.06, position.z);
      const mid = start
        .clone()
        .lerp(end, 0.5)
        .add(new THREE.Vector3(0, 0.08, 0));
      parts.push({
        geometry: tubeAlong([start, mid, end], 0.016, lowDetail),
        material: "hv",
      });
    }
  }
  return parts;
}

// ---------------------------------------------------------------------------
// Interior
// ---------------------------------------------------------------------------

function seat(x: number, floorY: number, z: number, sporty: boolean): Part[] {
  const cushionY = floorY + (sporty ? 0.13 : 0.22);
  const parts: Part[] = [
    {
      geometry: place(rbox(0.48, 0.11, 0.5, 0.04), { position: [x, cushionY, z] }),
      material: "leather",
    },
    {
      geometry: place(rbox(0.48, 0.62, 0.11, 0.045), {
        position: [x, cushionY + 0.33, z - 0.27],
        rotation: [-0.2, 0, 0],
      }),
      material: "leather",
    },
    {
      geometry: place(rbox(0.26, 0.17, 0.1, 0.04), {
        position: [x, cushionY + 0.72, z - 0.35],
        rotation: [-0.2, 0, 0],
      }),
      material: "leather",
    },
    {
      geometry: place(rbox(0.02, 0.5, 0.012, 0.004), {
        position: [x, cushionY + 0.32, z - 0.21],
        rotation: [-0.2, 0, 0],
      }),
      material: "stitch",
    },
  ];
  if (sporty) {
    // Side bolsters.
    for (const dx of [-0.21, 0.21]) {
      parts.push({
        geometry: place(rbox(0.07, 0.5, 0.16, 0.03), {
          position: [x + dx, cushionY + 0.3, z - 0.23],
          rotation: [-0.2, 0, 0],
        }),
        material: "leather",
      });
    }
  }
  return parts;
}

export function buildInterior(layout: CarLayout, lowDetail: boolean): Part[] {
  const { cabin, spec } = layout;
  const parts: Part[] = [];
  const sporty =
    spec.style === "supercar" || spec.style === "sports-rear" || spec.style === "gt";

  cabin.seatRows.forEach((z, row) => {
    if (row === 0) {
      for (const side of [1, -1])
        parts.push(...seat(side * cabin.seatX, cabin.floorY, z, sporty));
    } else {
      const narrow = (layout.build.seats ?? 5) <= 4;
      if (narrow) {
        for (const side of [1, -1])
          parts.push(...seat(side * cabin.seatX, cabin.floorY + 0.03, z, false));
      } else {
        // Bench.
        const width = spec.width * 0.62;
        parts.push({
          geometry: place(rbox(width, 0.12, 0.48, 0.04), {
            position: [0, cabin.floorY + 0.23, z],
          }),
          material: "leather",
        });
        parts.push({
          geometry: place(rbox(width, 0.58, 0.12, 0.045), {
            position: [0, cabin.floorY + 0.55, z - 0.27],
            rotation: [-0.22, 0, 0],
          }),
          material: "leather",
        });
      }
    }
  });

  // Dashboard, instrument binnacle and central screen.
  const dashWidth = spec.width * 0.8;
  parts.push({
    geometry: place(rbox(dashWidth, 0.2, 0.36, 0.06), {
      position: [0, cabin.dashY - 0.06, cabin.dashZ],
    }),
    material: "leather",
  });
  parts.push({
    geometry: place(rbox(0.34, 0.09, 0.14, 0.03), {
      position: [cabin.driverX, cabin.dashY + 0.07, cabin.dashZ - 0.1],
    }),
    material: "trim",
  });
  parts.push({
    geometry: place(new THREE.PlaneGeometry(0.3, 0.07), {
      position: [cabin.driverX, cabin.dashY + 0.075, cabin.dashZ - 0.172],
      rotation: [0, Math.PI, 0],
    }),
    material: "screen",
  });
  parts.push({
    geometry: place(rbox(0.3, 0.19, 0.03, 0.012), {
      position: [0, cabin.dashY + 0.02, cabin.dashZ - 0.2],
      rotation: [0.2, 0, 0],
    }),
    material: "screen",
  });

  // Steering wheel on the home-market side.
  const wheelY = cabin.dashY + 0.02;
  const ring = new THREE.TorusGeometry(
    0.175,
    0.02,
    lowDetail ? 8 : 14,
    lowDetail ? 24 : 40,
  );
  parts.push({
    geometry: place(ring, {
      position: [cabin.driverX, wheelY, cabin.wheelZ],
      rotation: [-0.35, 0, 0],
    }),
    material: "leather",
  });
  for (const angle of [Math.PI / 2, -Math.PI / 6, Math.PI + Math.PI / 6]) {
    const end = new THREE.Vector3(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0);
    const spoke = rodBetween(new THREE.Vector3(0, 0, 0), end, 0.014, 8);
    place(spoke, {
      position: [cabin.driverX, wheelY, cabin.wheelZ],
      rotation: [-0.35, 0, 0],
    });
    parts.push({ geometry: spoke, material: "trim" });
  }
  parts.push({
    geometry: rodBetween(
      new THREE.Vector3(cabin.driverX, wheelY - 0.02, cabin.wheelZ + 0.03),
      new THREE.Vector3(cabin.driverX, cabin.dashY - 0.08, cabin.dashZ - 0.05),
      0.03,
      10,
    ),
    material: "trim",
  });

  // Centre console and selector.
  const front = cabin.seatRows[0] ?? cabin.dashZ - 0.9;
  const consoleLength = cabin.dashZ - front + 0.1;
  parts.push({
    geometry: place(rbox(0.22, 0.2, consoleLength, 0.04), {
      position: [0, cabin.floorY + 0.1, front + consoleLength / 2 - 0.15],
    }),
    material: "trim",
  });
  parts.push({
    geometry: place(new THREE.SphereGeometry(0.03, 12, 10), {
      position: [0, cabin.floorY + 0.23, front + 0.35],
    }),
    material: "chrome",
  });

  // Cabin floor.
  parts.push({
    geometry: place(
      rbox(
        spec.width * 0.78,
        0.03,
        cabin.dashZ - (cabin.seatRows.at(-1) ?? front) + 0.6,
        0.01,
      ),
      {
        position: [
          0,
          cabin.floorY - 0.02,
          (cabin.dashZ + (cabin.seatRows.at(-1) ?? front)) / 2 - 0.15,
        ],
      },
    ),
    material: "satin",
  });
  return parts;
}

// ---------------------------------------------------------------------------
// Electronics
// ---------------------------------------------------------------------------

export function buildElectronics(layout: CarLayout, lowDetail: boolean): Part[] {
  const { spec, cabin, shape } = layout;
  const parts: Part[] = [];
  const W = spec.width;

  // Engine / vehicle control unit behind the dashboard.
  parts.push({
    geometry: place(rbox(0.2, 0.05, 0.16, 0.012), {
      position: [-W * 0.28, cabin.dashY - 0.16, cabin.dashZ + 0.14],
    }),
    material: "pcb",
  });
  // 12-volt battery, in the front compartment.
  const frontZ = spec.frontAxleZ + 0.34;
  parts.push({
    geometry: place(rbox(0.24, 0.18, 0.18, 0.02), {
      position: [W * 0.26, spec.groundClearance + 0.34, frontZ],
    }),
    material: "battery",
  });
  parts.push({
    geometry: place(cyl(0.015, 0.03, "y", 8), {
      position: [W * 0.26 + 0.07, spec.groundClearance + 0.445, frontZ],
    }),
    material: "spring",
  });

  // Radar module behind the front bumper.
  const nose = shape.station(1 - spec.def.capFront - 0.02);
  parts.push({
    geometry: place(rbox(0.12, 0.09, 0.04, 0.01), {
      position: [0, (nose.bottom + nose.belt) / 2, nose.z - 0.06],
    }),
    material: "pcb",
  });

  // Main harness along both sills, with a branch up to the dash.
  for (const side of [1, -1]) {
    const x = side * (W / 2 - 0.2);
    const y = spec.groundClearance + 0.13;
    parts.push({
      geometry: tubeAlong(
        [
          new THREE.Vector3(x * 0.7, y + 0.2, frontZ),
          new THREE.Vector3(x, y, spec.frontAxleZ - 0.4),
          new THREE.Vector3(x, y, spec.rearAxleZ + 0.4),
          new THREE.Vector3(x * 0.8, y + 0.15, spec.rearAxleZ - 0.2),
        ],
        0.012,
        lowDetail,
      ),
      material: "trim",
    });
  }
  parts.push({
    geometry: tubeAlong(
      [
        new THREE.Vector3(-(W / 2 - 0.2), spec.groundClearance + 0.13, cabin.dashZ + 0.1),
        new THREE.Vector3(-W * 0.3, cabin.dashY - 0.3, cabin.dashZ + 0.15),
        new THREE.Vector3(-W * 0.28, cabin.dashY - 0.17, cabin.dashZ + 0.14),
      ],
      0.01,
      lowDetail,
    ),
    material: "trim",
  });
  return parts;
}

// ---------------------------------------------------------------------------
// Exhaust
// ---------------------------------------------------------------------------

/**
 * Downpipes, catalytic converter, silencer and tailpipes. The tailpipes sit at
 * the exits found on the real rear surface (body-geometry.ts). Where the
 * engine's position is not recorded only the rear section is drawn: routing
 * pipes from a guessed engine would be inventing the layout.
 */
export function buildExhaust(
  layout: CarLayout,
  lowDetail: boolean,
  tips: THREE.Vector3[],
): Part[] {
  const { engine, spec, build } = layout;
  if (build.powertrain === "electric") return [];
  const parts: Part[] = [];
  const gc = spec.groundClearance;
  const radial = lowDetail ? 12 : 20;
  const pipeRadius = 0.026;

  // Tailpipes: a polished tip with a sooted end inside it.
  for (const tip of tips) {
    const tube = new THREE.CylinderGeometry(0.043, 0.043, 0.16, radial, 1, true);
    tube.rotateX(Math.PI / 2);
    parts.push({ geometry: place(tube, { position: tip }), material: "chrome" });
    const soot = new THREE.CircleGeometry(0.041, radial);
    soot.rotateY(Math.PI);
    soot.translate(0, 0, 0.06);
    parts.push({ geometry: place(soot, { position: tip }), material: "under" });
  }

  const rearMounted = build.enginePosition === "mid" || build.enginePosition === "rear";
  const tipZ =
    tips.length > 0 ? Math.max(...tips.map((tip) => tip.z)) : spec.tailZ + 0.12;
  const tipY = tips[0]?.y ?? gc + 0.16;

  // Silencer, across the car just ahead of the tailpipes.
  const size = new THREE.Vector3(
    spec.width * (rearMounted ? 0.46 : 0.5),
    0.16,
    build.enginePosition === "rear" ? 0.16 : 0.26,
  );
  const silencer = new THREE.Vector3(
    0,
    Math.max(gc + 0.02 + size.y / 2, tipY + 0.02),
    tipZ + 0.1 + size.z / 2,
  );
  parts.push({
    geometry: place(rbox(size.x, size.y, size.z, 0.06), { position: silencer }),
    material: "steel",
  });
  for (const tip of tips) {
    const from = new THREE.Vector3(tip.x, tip.y, tip.z + 0.07);
    const to = new THREE.Vector3(tip.x * 0.8, silencer.y, silencer.z - size.z / 2 + 0.02);
    parts.push({
      geometry: tubeAlong([from, from.clone().lerp(to, 0.5), to], 0.03, lowDetail),
      material: "steel",
    });
  }

  if (!engine) return parts;

  const scale = engine.scale;
  const { center } = engine;
  const half = engine.footprint / 2;
  const banks: number[] = engine.banks === 2 ? [1, -1] : [1];
  const cat = (at: THREE.Vector3, length: number, radius: number) =>
    parts.push({
      geometry: place(cyl(radius, length, "z", radial), { position: at }),
      material: "alloy",
    });

  if (!rearMounted) {
    // Front engine: down from the manifolds, back along the tunnel, around the
    // final drive and into the silencer.
    const floorY = gc + 0.1;
    const catAt = new THREE.Vector3(0.14, floorY, center.z - half - 0.28);
    cat(catAt, 0.36, 0.075);
    for (const bank of banks) {
      const exit = engine.longitudinal
        ? new THREE.Vector3(bank * 0.3 * scale, center.y - 0.05, center.z)
        : new THREE.Vector3(0.05 * bank, center.y - 0.05, center.z + 0.22 * scale);
      parts.push({
        geometry: tubeAlong(
          [
            exit,
            new THREE.Vector3(bank * 0.2 * scale, floorY + 0.05, center.z - half * 0.6),
            new THREE.Vector3(catAt.x, catAt.y, catAt.z + 0.2),
          ],
          pipeRadius,
          lowDetail,
        ),
        material: "castIron",
      });
    }
    parts.push({
      geometry: tubeAlong(
        [
          new THREE.Vector3(catAt.x, catAt.y - 0.01, catAt.z - 0.2),
          new THREE.Vector3(0.2, floorY - 0.01, spec.rearAxleZ + 0.6),
          new THREE.Vector3(0.36, floorY + 0.04, spec.rearAxleZ),
          new THREE.Vector3(0.26, silencer.y, silencer.z + size.z / 2 - 0.02),
        ],
        pipeRadius,
        lowDetail,
      ),
      material: "steel",
    });
    return parts;
  }

  // Mid or rear engine: short runs from each bank, past the gearbox, into the
  // silencer at the tail.
  for (const bank of banks) {
    const exit = new THREE.Vector3(bank * 0.3 * scale, center.y - 0.08, center.z);
    const catAt = new THREE.Vector3(
      bank * 0.32,
      Math.max(gc + 0.12, center.y - 0.18),
      center.z - half * 0.55,
    );
    cat(catAt, 0.26, 0.06);
    parts.push({
      geometry: tubeAlong(
        [
          exit,
          exit
            .clone()
            .lerp(catAt, 0.5)
            .setY(catAt.y + 0.02),
          catAt.clone().setZ(catAt.z + 0.13),
        ],
        pipeRadius,
        lowDetail,
      ),
      material: "castIron",
    });
    parts.push({
      geometry: tubeAlong(
        [
          catAt.clone().setZ(catAt.z - 0.13),
          new THREE.Vector3(bank * 0.3, catAt.y, (catAt.z + silencer.z) / 2),
          new THREE.Vector3(bank * 0.22, silencer.y, silencer.z + size.z / 2 - 0.02),
        ],
        pipeRadius,
        lowDetail,
      ),
      material: "steel",
    });
  }
  return parts;
}

// ---------------------------------------------------------------------------
// All systems
// ---------------------------------------------------------------------------

export type SystemName =
  | "engine"
  | "transmission"
  | "suspension"
  | "battery"
  | "interior"
  | "electronics"
  | "exhaust";

export type Systems = Record<SystemName, Part[]> & { dispose(): void };

/** Every baked subsystem for a car, built together so it can be cached. */
export function buildSystems(
  layout: CarLayout,
  lowDetail: boolean,
  exhaustTips: THREE.Vector3[],
): Systems {
  const systems: Record<SystemName, Part[]> = {
    engine: buildEngine(layout, lowDetail),
    transmission: buildTransmission(layout, lowDetail),
    suspension: buildSuspension(layout, lowDetail),
    battery: buildBattery(layout, lowDetail),
    interior: buildInterior(layout, lowDetail),
    electronics: buildElectronics(layout, lowDetail),
    exhaust: buildExhaust(layout, lowDetail, exhaustTips),
  };
  return {
    ...systems,
    dispose() {
      for (const parts of Object.values(systems))
        for (const part of parts) part.geometry.dispose();
    },
  };
}
