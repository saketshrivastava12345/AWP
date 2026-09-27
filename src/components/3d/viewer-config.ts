import type { ViewerGroup } from "@/types/domain";
import type { CarLayout } from "./car-layout";

/**
 * The named subsystems of the procedural car.
 *
 * These match the `viewer_group` enum in the database exactly, which is what
 * lets a part in the encyclopedia point at the group it belongs to.
 */
export const VIEWER_GROUPS = [
  "body",
  "engine",
  "transmission",
  "suspension",
  "brakes",
  "wheels",
  "interior",
  "electronics",
  "battery",
] as const satisfies readonly ViewerGroup[];

export const GROUP_LABELS: Record<ViewerGroup, string> = {
  body: "Body & Aerodynamics",
  engine: "Engine",
  transmission: "Transmission",
  suspension: "Suspension",
  brakes: "Braking",
  wheels: "Wheels & Tyres",
  interior: "Interior",
  electronics: "Electrical",
  battery: "Battery & Electric Drive",
  exhaust: "Exhaust",
};

/**
 * Direction and distance each group travels in the exploded view, in metres
 * for a 4.5 m car (scaled with the car). Chosen so nothing overlaps at full
 * separation and the layout still reads as a car rather than a cloud of parts.
 */
export const EXPLODE_VECTORS: Record<ViewerGroup, [number, number, number]> = {
  body: [0, 1.6, 0],
  engine: [0, 0.45, 1.9],
  transmission: [0, -0.15, 0.55],
  suspension: [0, -1.0, 0],
  // Wheels and brakes also spread outward to their own side (see
  // ProceduralCar), so these only lift them slightly.
  brakes: [0, -0.15, 0],
  wheels: [0, -0.05, 0],
  interior: [0, 0.85, -0.7],
  electronics: [-1.9, 0.45, -0.6],
  battery: [0, -1.3, -0.5],
  exhaust: [0, -0.45, -1.6],
};

export type Vec3 = [number, number, number];

export type CameraPreset = {
  id: string;
  label: string;
  /** Camera position in metres. */
  position: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
  /** How far to ghost the bodywork, so a view inside the car can see in. */
  ghost?: number;
};

export const PRESET_IDS = [
  "orbit",
  "front",
  "rear",
  "side",
  "interior",
  "engine",
  "wheels",
  "brakes",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const DEFAULT_PRESET: PresetId = "orbit";

const PRESET_LABELS: Record<PresetId, string> = {
  orbit: "360°",
  front: "Front",
  rear: "Rear",
  side: "Side",
  interior: "Interior",
  engine: "Engine",
  wheels: "Wheels",
  brakes: "Brakes",
};

/** Preset buttons, in display order. */
export const PRESET_OPTIONS = PRESET_IDS.map((id) => ({ id, label: PRESET_LABELS[id] }));

/**
 * Camera presets for a particular car.
 *
 * Framed from the car's real size and its real component positions, so the
 * "Engine" view of a 911 looks in behind the rear axle while the same button
 * on a saloon looks under the bonnet.
 */
export function cameraPresets(layout: CarLayout): CameraPreset[] {
  const { spec, anchors, cabin } = layout;
  const k = spec.length / 4.5;
  const H = spec.height;
  const engine = anchors.engine;
  // Approach the engine from whichever end it is nearer to.
  const engineSide = engine.z >= 0 ? 1 : -1;
  const wheel = anchors.frontWheel;
  const presets: Record<PresetId, Omit<CameraPreset, "id" | "label">> = {
    orbit: { position: [4.7 * k, 1.35 + H * 0.2, 5.4 * k], target: [0, H * 0.36, 0] },
    front: {
      position: [0.9 * k, H * 0.8, spec.noseZ + 4.4 * k],
      target: [0, H * 0.4, spec.noseZ * 0.2],
    },
    rear: {
      position: [-0.9 * k, H * 0.9, spec.tailZ - 4.4 * k],
      target: [0, H * 0.42, spec.tailZ * 0.2],
    },
    side: { position: [spec.length * 1.5, H * 0.55, 0], target: [0, H * 0.4, 0] },
    interior: {
      position: [cabin.driverX * 0.6, H + 0.55, (cabin.seatRows[0] ?? 0) - 0.9],
      target: [0, cabin.dashY - 0.1, cabin.dashZ + 0.3],
      ghost: 0.85,
    },
    engine: {
      position: [engine.x + 1.7, engine.y + 1.5, engine.z + engineSide * 1.9],
      target: [engine.x, engine.y, engine.z],
      ghost: 1,
    },
    wheels: {
      position: [wheel.x + 1.9, wheel.y + 0.45, wheel.z + 1.1],
      target: [wheel.x - 0.1, wheel.y, wheel.z],
    },
    brakes: {
      position: [wheel.x + 1.05, wheel.y + 0.2, wheel.z + 0.6],
      target: [wheel.x - 0.15, wheel.y + 0.02, wheel.z],
    },
  };
  return PRESET_IDS.map((id) => ({ id, label: PRESET_LABELS[id], ...presets[id] }));
}

/** Which groups exist for a given powertrain. */
export function groupsForPowertrain(
  kind: "combustion" | "electric" | "hybrid",
): ViewerGroup[] {
  const shared: ViewerGroup[] = [
    "body",
    "transmission",
    "suspension",
    "brakes",
    "wheels",
    "interior",
    "electronics",
  ];
  if (kind === "electric") return [...shared, "battery"];
  if (kind === "hybrid") return [...shared, "engine", "battery"];
  return [...shared, "engine"];
}
