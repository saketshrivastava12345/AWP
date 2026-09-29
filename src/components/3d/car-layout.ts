import * as THREE from "three";
import type { CarBuild } from "@/lib/car-build";
import { BodyShape, resolveCarSpec, type CarSpec } from "./car-shape";
import { engineParts } from "./car-systems";

/**
 * Where everything goes inside a particular car.
 *
 * The mechanical layout follows the catalogue wherever it has something to
 * say: the engine's configuration and cylinder count, where it sits, which
 * axles are driven, how many motors an EV has, how many seats there are. Only
 * the proportions of individual components are generic.
 */

export type EngineKind = "inline" | "vee" | "flat" | "block";

export type EngineInfo = {
  kind: EngineKind;
  banks: 1 | 2;
  perBank: number;
  /** Angle between the two banks, radians (vee), or PI for a flat engine. */
  bankAngle: number;
  /** Crank along the car's length (true) or across it. */
  longitudinal: boolean;
  /** Centre of the crankshaft. */
  center: THREE.Vector3;
  /** Crankshaft length the engine is built with, metres, before scaling. */
  length: number;
  /** Extent along the car once placed and scaled, for positioning neighbours. */
  footprint: number;
  scale: number;
  turbos: number;
  supercharged: boolean;
};

export type Motor = { position: THREE.Vector3; length: number; radius: number };

export type Box = { center: THREE.Vector3; size: THREE.Vector3 };

export type Wheel = { position: THREE.Vector3; side: 1 | -1; front: boolean };

export type AnchorId =
  | "center"
  | "nose"
  | "tail"
  | "engine"
  | "gearbox"
  | "frontWheel"
  | "rearWheel"
  | "frontSuspension"
  | "battery"
  | "motor"
  | "cabin"
  | "dash";

export type CarLayout = {
  spec: CarSpec;
  shape: BodyShape;
  build: CarBuild;
  wheels: Wheel[];
  driven: { front: boolean; rear: boolean };
  engine: EngineInfo | null;
  gearbox: Box | null;
  /** Differentials at the driven axles. */
  differentials: THREE.Vector3[];
  /** Propshaft from the gearbox to a remote driven axle, if any. */
  propshaft: [THREE.Vector3, THREE.Vector3] | null;
  motors: Motor[];
  battery: Box | null;
  cabin: {
    floorY: number;
    seatRows: number[];
    seatX: number;
    driverX: number;
    dashZ: number;
    dashY: number;
    wheelZ: number;
  };
  anchors: Record<AnchorId, THREE.Vector3>;
};

const V_ANGLES: Record<number, number> = { 6: 60, 8: 90, 10: 90, 12: 65 };

function engineInfo(build: CarBuild, spec: CarSpec, shape: BodyShape): EngineInfo | null {
  if (build.powertrain === "electric") return null;
  // No recorded position means no engine is drawn: placing one would be a
  // guess, and the viewer's job is to show what is known.
  if (!build.enginePosition) return null;

  const cylinders = build.cylinders;
  let kind: EngineKind = "block";
  let banks: 1 | 2 = 1;
  let perBank = 4;
  let bankAngle = 0;

  switch (build.engineLayout) {
    case "inline":
      kind = "inline";
      perBank = cylinders ?? 4;
      break;
    case "vee":
    case "w":
      kind = "vee";
      banks = 2;
      perBank = Math.ceil((cylinders ?? 8) / 2);
      bankAngle = THREE.MathUtils.degToRad(V_ANGLES[cylinders ?? 8] ?? 90);
      break;
    case "flat":
      kind = "flat";
      banks = 2;
      perBank = Math.ceil((cylinders ?? 6) / 2);
      bankAngle = Math.PI;
      break;
    default:
      kind = "block";
      perBank = 4;
  }

  const position = build.enginePosition;
  const longitudinal = !(position === "front" && build.drive === "fwd");
  const length = perBank * 0.092 + 0.16;

  const turbos =
    build.aspiration === "twin_turbo" || build.aspiration === "twincharged"
      ? 2
      : build.aspiration === "turbocharged"
        ? 1
        : 0;
  const supercharged =
    build.aspiration === "supercharged" || build.aspiration === "twincharged";

  // Measure the engine as built rather than trusting nominal figures, so the
  // fit below is exact whatever the layout.
  const box = new THREE.Box3();
  for (const part of engineParts(
    { kind, perBank, length, bankAngle, turbos, supercharged },
    true,
  )) {
    part.geometry.computeBoundingBox();
    if (part.geometry.boundingBox) box.union(part.geometry.boundingBox);
    part.geometry.dispose();
  }
  const size = box.getSize(new THREE.Vector3());
  const footprint = longitudinal ? size.z : size.x;
  const breadth = longitudinal ? size.x : size.z;

  const placeAt = (extent: number) => {
    if (position === "front") {
      return longitudinal ? spec.frontAxleZ + 0.16 - extent / 2 : spec.frontAxleZ + 0.1;
    }
    if (position === "mid") return spec.rearAxleZ + 0.18 + extent / 2;
    return spec.rearAxleZ - 0.08 - extent / 2;
  };

  // Shrink the engine to fit under the bodywork above it. A generic V8 is
  // taller than a Huracán's engine cover allows; the real one is dry-sumped
  // and mounted low for exactly that reason. Two passes, because where the
  // engine sits depends on its size and its size on the room where it sits.
  const floor = spec.groundClearance + 0.04;
  const fit = (z: number, extent: number) => {
    let ceiling = Infinity;
    for (let k = -1; k <= 1; k += 0.25) {
      const s = shape.station(shape.uOf(z + (k * extent) / 2));
      ceiling = Math.min(ceiling, s.belt + Math.min(0, s.crown) + s.glass * 0.4 - 0.04);
    }
    return THREE.MathUtils.clamp(
      Math.min((ceiling - floor) / size.y, (spec.width * 0.6) / breadth),
      0.45,
      1.05,
    );
  };
  let scale = fit(placeAt(footprint), footprint);
  const z = placeAt(footprint * scale);
  scale = fit(z, footprint * scale);
  const crankY = floor - box.min.y * scale;

  return {
    kind,
    banks,
    perBank,
    bankAngle,
    longitudinal,
    center: new THREE.Vector3(longitudinal ? 0 : -0.06, crankY, z),
    length,
    footprint: footprint * scale,
    scale,
    turbos,
    supercharged,
  };
}

export function computeLayout(build: CarBuild): CarLayout {
  const spec = resolveCarSpec({
    bodyType: build.bodyType,
    enginePosition: build.enginePosition,
    powertrain: build.powertrain,
    length_mm: build.length_mm,
    width_mm: build.width_mm,
    height_mm: build.height_mm,
    wheelbase_mm: build.wheelbase_mm,
    ground_clearance_mm: build.ground_clearance_mm,
  });
  const shape = new BodyShape(spec);
  const R = spec.wheelRadius;
  const trackX = spec.track / 2;
  const { frontAxleZ: zF, rearAxleZ: zR } = spec;

  const wheels: Wheel[] = [
    { position: new THREE.Vector3(trackX, R, zF), side: 1, front: true },
    { position: new THREE.Vector3(-trackX, R, zF), side: -1, front: true },
    { position: new THREE.Vector3(trackX, R, zR), side: 1, front: false },
    { position: new THREE.Vector3(-trackX, R, zR), side: -1, front: false },
  ];

  const drive =
    build.drive ??
    (build.enginePosition === "front" || build.powertrain === "electric" ? "fwd" : "rwd");
  const driven = { front: drive !== "rwd", rear: drive !== "fwd" };

  const engine = engineInfo(build, spec, shape);

  // --- gearbox and driveline ----------------------------------------------
  let gearbox: Box | null = null;
  let propshaft: [THREE.Vector3, THREE.Vector3] | null = null;
  const differentials: THREE.Vector3[] = [];
  if (driven.front) differentials.push(new THREE.Vector3(0, R, zF));
  if (driven.rear) differentials.push(new THREE.Vector3(0, R, zR));

  if (engine) {
    const half = engine.footprint / 2;
    const y = engine.center.y;
    const position = build.enginePosition;
    if (!engine.longitudinal) {
      gearbox = {
        center: new THREE.Vector3(0.36, y - 0.02, engine.center.z - 0.04),
        size: new THREE.Vector3(0.32, 0.3, 0.34),
      };
      if (driven.rear)
        propshaft = [new THREE.Vector3(0.1, R, zF - 0.2), new THREE.Vector3(0, R, zR)];
    } else if (position === "front") {
      gearbox = {
        center: new THREE.Vector3(0, y - 0.03, engine.center.z - half - 0.3),
        size: new THREE.Vector3(0.3, 0.3, 0.56),
      };
      if (driven.rear) {
        propshaft = [
          new THREE.Vector3(0, y - 0.05, gearbox.center.z - 0.3),
          new THREE.Vector3(0, R, zR),
        ];
      }
    } else if (position === "mid") {
      gearbox = {
        center: new THREE.Vector3(0, y - 0.02, engine.center.z - half - 0.26),
        size: new THREE.Vector3(0.42, 0.32, 0.46),
      };
      if (driven.front)
        propshaft = [
          new THREE.Vector3(0, R, engine.center.z + half),
          new THREE.Vector3(0, R, zF),
        ];
    } else {
      // Rear-engined: the gearbox sits ahead of the axle, the engine behind it.
      gearbox = {
        center: new THREE.Vector3(0, y - 0.02, engine.center.z + half + 0.28),
        size: new THREE.Vector3(0.4, 0.3, 0.5),
      };
      if (driven.front)
        propshaft = [
          new THREE.Vector3(0, R, gearbox.center.z + 0.25),
          new THREE.Vector3(0, R, zF),
        ];
    }
  }

  // --- motors ---------------------------------------------------------------
  const motors: Motor[] = [];
  const motorAt = (z: number, x = 0, radius = 0.13, length = 0.34) =>
    motors.push({ position: new THREE.Vector3(x, R, z), length, radius });

  if (build.powertrain === "electric") {
    const count = build.motors ?? 1;
    if (count <= 1) motorAt(driven.front && !driven.rear ? zF : zR);
    else if (count === 2) {
      motorAt(zF);
      motorAt(zR);
    } else if (count === 3) {
      motorAt(zF);
      motorAt(zR, 0.17, 0.12, 0.3);
      motorAt(zR, -0.17, 0.12, 0.3);
    } else {
      motorAt(zF, 0.17, 0.12, 0.3);
      motorAt(zF, -0.17, 0.12, 0.3);
      motorAt(zR, 0.17, 0.12, 0.3);
      motorAt(zR, -0.17, 0.12, 0.3);
    }
  } else if (build.powertrain === "hybrid") {
    const count = build.motors ?? 1;
    const atGearbox = () => {
      if (!gearbox) return;
      motors.push({
        position: new THREE.Vector3(
          0,
          gearbox.center.y + 0.02,
          gearbox.center.z + gearbox.size.z * 0.62,
        ),
        length: 0.16,
        radius: 0.15,
      });
    };
    if (count >= 3) {
      motorAt(zF, 0.17, 0.11, 0.26);
      motorAt(zF, -0.17, 0.11, 0.26);
      atGearbox();
    } else if (count === 2) {
      atGearbox();
      motorAt(build.enginePosition === "front" ? zR : zF);
    } else if (drive === "awd" && build.enginePosition === "front") {
      // Engine on one axle, electric motor on the other.
      motorAt(zR);
    } else {
      atGearbox();
    }
  }

  // --- cabin ----------------------------------------------------------------
  const { def } = spec;
  const cowlZ = shape.zOf(def.cowl);
  const floorY = spec.groundClearance + 0.1;
  const tall =
    spec.style === "suv" ||
    spec.style === "offroad" ||
    spec.style === "pickup" ||
    spec.style === "mpv";
  const frontSeatZ = cowlZ - (tall ? 1.08 : 0.98);
  const seats = build.seats ?? (spec.style === "supercar" ? 2 : 5);
  const rowCount = seats <= 2 ? 1 : seats <= 5 ? 2 : 3;
  const seatRows = [frontSeatZ];
  for (let row = 1; row < rowCount; row += 1)
    seatRows.push(frontSeatZ - row * (tall ? 0.88 : 0.8));
  const seatX = spec.width * 0.21;
  const driverX = build.rightHandDrive ? -seatX : seatX;
  const dashZ = cowlZ - 0.2;
  const dashY = shape.station(def.cowl).belt - 0.02;

  // --- battery --------------------------------------------------------------
  let battery: Box | null = null;
  if (build.powertrain === "electric") {
    const start = zR + spec.archRadius + 0.06;
    const end = zF - spec.archRadius - 0.06;
    battery = {
      center: new THREE.Vector3(0, spec.groundClearance + 0.075, (start + end) / 2),
      size: new THREE.Vector3(spec.track - spec.tyreWidth - 0.28, 0.13, end - start),
    };
  } else if (build.powertrain === "hybrid") {
    // Plug-in and self-charging hybrids carry a far smaller pack, usually in
    // the transmission tunnel or under the rear seat.
    const z =
      build.enginePosition === "front"
        ? (seatRows[1] ?? frontSeatZ - 0.7)
        : frontSeatZ + 0.15;
    battery = {
      center: new THREE.Vector3(0, spec.groundClearance + 0.14, z),
      size: new THREE.Vector3(
        build.enginePosition === "front" ? 0.9 : 0.34,
        0.2,
        build.enginePosition === "front" ? 0.5 : 1.1,
      ),
    };
  }

  const beltMid = shape.station(0.5).belt;
  const anchors: Record<AnchorId, THREE.Vector3> = {
    center: new THREE.Vector3(0, spec.height * 0.42, 0),
    nose: new THREE.Vector3(0, shape.station(0.97).belt * 0.8, spec.noseZ),
    tail: new THREE.Vector3(0, shape.station(0.03).belt * 0.85, spec.tailZ),
    engine: engine
      ? engine.center.clone().add(new THREE.Vector3(0, 0.12, 0))
      : new THREE.Vector3(0, spec.height * 0.4, zF + 0.2),
    gearbox: gearbox
      ? gearbox.center.clone()
      : new THREE.Vector3(0, R, motors[0]?.position.z ?? zR),
    frontWheel: new THREE.Vector3(trackX + spec.tyreWidth / 2, R, zF),
    rearWheel: new THREE.Vector3(trackX + spec.tyreWidth / 2, R, zR),
    frontSuspension: new THREE.Vector3(trackX - 0.25, R + 0.12, zF),
    battery: battery
      ? battery.center.clone()
      : new THREE.Vector3(0, spec.groundClearance + 0.1, 0),
    motor: motors[0] ? motors[0].position.clone() : new THREE.Vector3(0, R, zR),
    cabin: new THREE.Vector3(driverX * 0.5, beltMid, frontSeatZ + 0.25),
    dash: new THREE.Vector3(0, dashY, dashZ),
  };

  return {
    spec,
    shape,
    build,
    wheels,
    driven,
    engine,
    gearbox,
    differentials,
    propshaft,
    motors,
    battery,
    cabin: { floorY, seatRows, seatX, driverX, dashZ, dashY, wheelZ: dashZ - 0.34 },
    anchors,
  };
}
