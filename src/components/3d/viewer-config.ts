import type { ViewerGroup } from "@/types/domain";
import {
  PRESET_GHOST,
  PRESET_IDS,
  PRESET_LABELS,
  type PresetId,
} from "@/lib/viewer-presets";
import type { CarLayout } from "./car-layout";

/**
 * Viewer groups and camera framings.
 *
 * Type-only imports of the layout: this module is safe to load in the DOM half
 * of the viewer without pulling in three.js.
 */

/**
 * The named subsystems of the procedural car. These match the `viewer_group`
 * enum in the database exactly, which is what lets a part in the encyclopedia
 * point at the group it belongs to.
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
  "exhaust",
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

/** One generic line per group, for the hover tooltip. Not a claim about a car. */
export const GROUP_DESCRIPTIONS: Record<ViewerGroup, string> = {
  body: "Bodyshell, glazing, lamps and the surfaces that shape the airflow.",
  engine: "The combustion engine, its induction and cooling.",
  transmission: "Gearbox, driveshafts and differentials that take power to the wheels.",
  suspension: "Springs, dampers and linkages that locate each wheel.",
  brakes: "Discs and calipers at each corner.",
  wheels: "Rims and tyres: the car's only contact with the road.",
  interior: "Seats, dashboard, controls and the driving position.",
  electronics: "Control units, sensors, the 12-volt system and wiring.",
  battery: "Traction battery, electric motors and their power electronics.",
  exhaust: "Manifolds, catalytic converter, silencer and tailpipes.",
};

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
  if (kind === "hybrid") return [...shared, "engine", "battery", "exhaust"];
  return [...shared, "engine", "exhaust"];
}

/**
 * The groups a car actually draws: by powertrain, minus the engine when its
 * position is not recorded (an engine is never drawn where it is not known).
 */
export function drawnGroups(build: {
  powertrain: "combustion" | "electric" | "hybrid";
  enginePosition: string | null;
}): ViewerGroup[] {
  return groupsForPowertrain(build.powertrain).filter(
    (group) => group !== "engine" || build.enginePosition !== null,
  );
}

/** Internal groups: selecting one ghosts the body so it can be seen. */
export const INTERNAL_GROUPS: ReadonlySet<ViewerGroup> = new Set([
  "engine",
  "transmission",
  "suspension",
  "battery",
  "electronics",
  "interior",
  "exhaust",
]);

export type Vec3 = [number, number, number];

export type CameraPreset = {
  id: PresetId;
  label: string;
  /** Camera position in metres. */
  position: Vec3;
  /** Point the camera looks at. */
  target: Vec3;
  /** How far to ghost the bodywork, so a view inside the car can see in. */
  ghost: number;
  /** Exterior framing: pulled back on narrow screens, and when exploded. */
  exterior: boolean;
};

/**
 * Camera presets for a particular car, framed from its real size and its real
 * component positions — so ENGINE on a 911 looks in behind the rear axle while
 * the same button on a saloon looks under the bonnet.
 */
export function cameraPresets(layout: CarLayout): Record<PresetId, CameraPreset> {
  const { spec, anchors, cabin, battery } = layout;
  const k = spec.length / 4.5;
  const H = spec.height;
  const L = spec.length;
  const engine = anchors.engine;
  // Approach the engine from whichever end it is nearer to.
  const engineSide = engine.z >= 0 ? 1 : -1;
  const pack = battery?.center ?? anchors.battery;

  const framings: Record<PresetId, Omit<CameraPreset, "id" | "label" | "ghost">> = {
    front34: {
      position: [4.5 * k, 1.15 + H * 0.2, 5.2 * k],
      target: [0, H * 0.36, 0.1 * k],
      exterior: true,
    },
    side: {
      position: [L * 1.5, H * 0.5, 0],
      target: [0, H * 0.4, 0],
      exterior: true,
    },
    rear34: {
      position: [-4.3 * k, 1.2 + H * 0.2, -5.1 * k],
      target: [0, H * 0.4, -0.1 * k],
      exterior: true,
    },
    // Straight down with the car across the screen, nose to the right.
    top: {
      position: [0.02, H + 5.4 * k, 0.0001],
      target: [0, 0, 0],
      exterior: true,
    },
    // Near the floor, level with the sills: the car rises above the horizon
    // line with its reflection below. (The camera never looks up from below
    // its target, which is what keeps it above the floor when orbiting.)
    low: {
      position: [3.2 * k, 0.34, 4.1 * k],
      target: [0, 0.3, 0.2 * k],
      exterior: true,
    },
    interior: {
      position: [cabin.driverX * 0.6, H + 0.55, (cabin.seatRows[0] ?? 0) - 0.9],
      target: [0, cabin.dashY - 0.1, cabin.dashZ + 0.3],
      exterior: false,
    },
    // High and square-on to the drivetrain, with the body ghosted.
    engineering: {
      position: [4.4 * k, 3.4 + H * 0.3, 3.3 * k],
      target: [0, H * 0.28, 0],
      exterior: true,
    },
    engine: {
      position: [engine.x + 1.7 * k, engine.y + 1.5, engine.z + engineSide * 1.9 * k],
      target: [engine.x, engine.y, engine.z],
      exterior: false,
    },
    battery: {
      position: [2.5 * k, 2.4 + H * 0.3, pack.z + 1.6 * k],
      target: [pack.x, pack.y, pack.z],
      exterior: false,
    },
  };

  return Object.fromEntries(
    PRESET_IDS.map((id) => [
      id,
      { id, label: PRESET_LABELS[id], ghost: PRESET_GHOST[id], ...framings[id] },
    ]),
  ) as Record<PresetId, CameraPreset>;
}

/**
 * A preset adapted to the stage: pulled back on narrow (portrait-ish) stages
 * so the car is not cropped, and further back when the car is exploded so the
 * separated parts stay in frame.
 */
export function framePreset(
  preset: CameraPreset,
  { aspect, exploded, length }: { aspect: number; exploded: boolean; length: number },
): { position: Vec3; target: Vec3 } {
  const [tx, ty, tz] = preset.target;
  let [px, py, pz] = preset.position;
  let target: Vec3 = [tx, ty, tz];
  if (preset.exterior) {
    const fit = Math.min(2.2, Math.max(1, 1.9 / Math.max(0.3, aspect)));
    const spread = exploded ? 1.45 : 1;
    const scale = fit * spread;
    px = tx + (px - tx) * scale;
    py = ty + (py - ty) * scale;
    pz = tz + (pz - tz) * scale;
    if (exploded) {
      // The body rises well above the roofline: aim higher.
      const lift = 0.55 * (length / 4.5);
      target = [tx, ty + lift, tz];
      py += lift;
    }
  }
  return { position: [px, py, pz], target };
}
