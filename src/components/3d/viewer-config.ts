import type { BodyType, ViewerGroup } from "@/types/domain";

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
] as const;

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
};

/**
 * Direction and distance each group travels in the exploded view, in metres.
 * Chosen so nothing overlaps at full separation and the layout still reads as
 * a car rather than a cloud of parts.
 */
export const EXPLODE_VECTORS: Record<ViewerGroup, [number, number, number]> = {
  body: [0, 1.5, 0],
  engine: [0, 0.35, 1.9],
  transmission: [0, -0.15, 0.55],
  suspension: [0, -1.0, 0],
  brakes: [1.7, -0.25, 0],
  wheels: [2.5, 0, 0],
  interior: [0, 0.75, -0.7],
  electronics: [-1.9, 0.45, -0.6],
  battery: [0, -1.3, -0.5],
};

export type CameraPreset = {
  id: string;
  label: string;
  /** Camera position in metres. */
  position: [number, number, number];
  /** Point the camera looks at. */
  target: [number, number, number];
};

/**
 * Camera presets. `orbit` is the default resting view and the one auto-rotate
 * uses; the rest frame a specific subsystem.
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "orbit", label: "360°", position: [6.4, 1.7, 7.2], target: [0, 0.5, 0] },
  { id: "front", label: "Front", position: [0, 1.3, 6.4], target: [0, 0.6, 0.4] },
  { id: "rear", label: "Rear", position: [0, 1.4, -6.4], target: [0, 0.6, -0.4] },
  { id: "side", label: "Side", position: [8.0, 0.9, 0.2], target: [0, 0.6, 0] },
  {
    id: "interior",
    label: "Interior",
    position: [0.0, 1.45, -0.2],
    target: [0, 1.0, 2.2],
  },
  { id: "engine", label: "Engine", position: [1.6, 1.9, 3.3], target: [0, 0.75, 1.55] },
  {
    id: "wheels",
    label: "Wheels",
    position: [3.0, 0.75, 2.4],
    target: [0.85, 0.34, 1.35],
  },
  {
    id: "brakes",
    label: "Brakes",
    position: [2.4, 0.55, 1.9],
    target: [0.9, 0.34, 1.35],
  },
];

export const DEFAULT_PRESET = "orbit";

/**
 * Body proportions in metres, used when a variant has no published dimensions.
 *
 * A coupé sits lower and longer, an SUV taller, a hatchback shorter — so cars
 * in the viewer are not all the same silhouette. When real dimensions exist in
 * the database they override these entirely.
 */
export type Proportions = {
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  /** Height of the cabin greenhouse as a fraction of total height. */
  cabinRatio: number;
  /** Wheel radius in metres. */
  wheelRadius: number;
  groundClearance: number;
};

const BODY_PROPORTIONS: Record<BodyType, Proportions> = {
  coupe: {
    length: 4.5,
    width: 1.9,
    height: 1.28,
    wheelbase: 2.6,
    cabinRatio: 0.36,
    wheelRadius: 0.35,
    groundClearance: 0.12,
  },
  roadster: {
    length: 4.3,
    width: 1.88,
    height: 1.22,
    wheelbase: 2.5,
    cabinRatio: 0.3,
    wheelRadius: 0.34,
    groundClearance: 0.12,
  },
  sedan: {
    length: 4.8,
    width: 1.85,
    height: 1.45,
    wheelbase: 2.85,
    cabinRatio: 0.42,
    wheelRadius: 0.34,
    groundClearance: 0.14,
  },
  hatchback: {
    length: 4.05,
    width: 1.78,
    height: 1.46,
    wheelbase: 2.55,
    cabinRatio: 0.46,
    wheelRadius: 0.32,
    groundClearance: 0.15,
  },
  wagon: {
    length: 4.95,
    width: 1.9,
    height: 1.47,
    wheelbase: 2.92,
    cabinRatio: 0.45,
    wheelRadius: 0.34,
    groundClearance: 0.14,
  },
  suv: {
    length: 4.65,
    width: 1.94,
    height: 1.72,
    wheelbase: 2.8,
    cabinRatio: 0.44,
    wheelRadius: 0.38,
    groundClearance: 0.2,
  },
  off_road: {
    length: 4.0,
    width: 1.82,
    height: 1.84,
    wheelbase: 2.45,
    cabinRatio: 0.46,
    wheelRadius: 0.4,
    groundClearance: 0.24,
  },
  mpv: {
    length: 4.7,
    width: 1.85,
    height: 1.75,
    wheelbase: 2.8,
    cabinRatio: 0.5,
    wheelRadius: 0.34,
    groundClearance: 0.16,
  },
  pickup: {
    length: 5.6,
    width: 2.0,
    height: 1.9,
    wheelbase: 3.5,
    cabinRatio: 0.4,
    wheelRadius: 0.4,
    groundClearance: 0.22,
  },
  convertible: {
    length: 4.5,
    width: 1.88,
    height: 1.3,
    wheelbase: 2.6,
    cabinRatio: 0.28,
    wheelRadius: 0.34,
    groundClearance: 0.13,
  },
};

export type DimensionInput = {
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  wheelbase_mm?: number | null;
};

/**
 * Resolve proportions for a car.
 *
 * Real published dimensions win wherever they exist; anything missing falls
 * back to the body-type profile. So a car with known dimensions is modelled at
 * its actual size, and one without still looks like the right kind of car.
 */
export function resolveProportions(
  bodyType: BodyType | null,
  dimensions?: DimensionInput | null,
): Proportions {
  const base = BODY_PROPORTIONS[bodyType ?? "coupe"] ?? BODY_PROPORTIONS.coupe;

  const mm = (value: number | null | undefined): number | null =>
    value !== null && value !== undefined && value > 0 ? value / 1000 : null;

  const length = mm(dimensions?.length_mm) ?? base.length;
  const width = mm(dimensions?.width_mm) ?? base.width;
  const height = mm(dimensions?.height_mm) ?? base.height;
  const wheelbase = mm(dimensions?.wheelbase_mm) ?? base.wheelbase;

  return {
    length,
    width,
    height,
    // A wheelbase longer than the car would be nonsense; clamp defensively.
    wheelbase: Math.min(wheelbase, length * 0.72),
    cabinRatio: base.cabinRatio,
    wheelRadius: Math.min(base.wheelRadius, height * 0.3),
    groundClearance: base.groundClearance,
  };
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
