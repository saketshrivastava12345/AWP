import type { CarBuild } from "@/lib/car-build";
import type { ViewerGroup } from "@/types/domain";

/**
 * Hotspots: small markers anchored to the car that name a component and open
 * its subsystem panel.
 *
 * Which hotspots a car gets follows the same rules as the geometry: no engine
 * marker on an EV (or where the engine position is not recorded, since no
 * engine is drawn), no battery on a petrol car, no charging inlet on a
 * self-charging hybrid, no exhaust on an EV. The anchor positions come from
 * the car's layout inside the canvas; this module is the pure part.
 */

export const HOTSPOT_IDS = [
  "headlights",
  "aero",
  "engine",
  "battery",
  "charging",
  "suspension",
  "brakes",
  "wheels",
  "exhaust",
] as const;

export type HotspotId = (typeof HOTSPOT_IDS)[number];

export type HotspotDef = {
  id: HotspotId;
  label: string;
  /** The subsystem panel the hotspot opens. */
  group: ViewerGroup;
  /** One generic line about the component, not a claim about this car. */
  description: string;
};

export const HOTSPOTS: Record<HotspotId, HotspotDef> = {
  headlights: {
    id: "headlights",
    label: "Headlights",
    group: "body",
    description: "Lamp units and the car's lighting signature.",
  },
  aero: {
    id: "aero",
    label: "Aerodynamics",
    group: "body",
    description: "Spoiler, diffuser and the surfaces that manage airflow.",
  },
  engine: {
    id: "engine",
    label: "Engine",
    group: "engine",
    description: "The combustion engine and its induction.",
  },
  battery: {
    id: "battery",
    label: "Battery",
    group: "battery",
    description: "Traction battery and the electric drive it feeds.",
  },
  charging: {
    id: "charging",
    label: "Charging port",
    group: "battery",
    description: "Charging inlet and on-board charger.",
  },
  suspension: {
    id: "suspension",
    label: "Suspension",
    group: "suspension",
    description: "Springs, dampers and the linkage at each corner.",
  },
  brakes: {
    id: "brakes",
    label: "Brakes",
    group: "brakes",
    description: "Discs, calipers and the hydraulic system.",
  },
  wheels: {
    id: "wheels",
    label: "Wheels",
    group: "wheels",
    description: "Rims, tyres and hubs.",
  },
  exhaust: {
    id: "exhaust",
    label: "Exhaust",
    group: "exhaust",
    description: "Manifolds, catalytic converter and silencer.",
  },
};

export function hotspotAvailable(
  id: HotspotId,
  build: Pick<CarBuild, "powertrain" | "enginePosition" | "plugIn">,
): boolean {
  switch (id) {
    case "engine":
      return build.powertrain !== "electric" && build.enginePosition !== null;
    case "battery":
      return build.powertrain !== "combustion";
    case "charging":
      return build.plugIn;
    case "exhaust":
      return build.powertrain !== "electric";
    default:
      return true;
  }
}

/** The hotspots a car has, in display order. */
export function availableHotspots(
  build: Pick<CarBuild, "powertrain" | "enginePosition" | "plugIn">,
): HotspotDef[] {
  return HOTSPOT_IDS.filter((id) => hotspotAvailable(id, build)).map(
    (id) => HOTSPOTS[id],
  );
}
