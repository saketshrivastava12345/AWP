import type { CarBuild } from "@/lib/car-build";

/**
 * Camera presets offered by the viewer, and which of them a car can use.
 *
 * The framings themselves are computed from the car's layout in
 * `src/components/3d/viewer-config.ts`; this module is the pure part (ids,
 * labels, availability), so the toolbar can be rendered without loading
 * three.js.
 */

export const PRESET_IDS = [
  "front34",
  "side",
  "rear34",
  "top",
  "low",
  "interior",
  "engineering",
  "engine",
  "battery",
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export const DEFAULT_PRESET: PresetId = "front34";

export const PRESET_LABELS: Record<PresetId, string> = {
  front34: "Front 3/4",
  side: "Side",
  rear34: "Rear 3/4",
  top: "Top",
  low: "Low angle",
  interior: "Interior",
  engineering: "Engineering",
  engine: "Engine",
  battery: "Battery",
};

/**
 * How far each preset ghosts the bodywork. A view that looks inside the car
 * has to see through the body; the exterior views leave it solid.
 */
export const PRESET_GHOST: Record<PresetId, number> = {
  front34: 0,
  side: 0,
  rear34: 0,
  top: 0,
  low: 0,
  interior: 0.85,
  engineering: 1,
  engine: 1,
  battery: 1,
};

export type PresetAvailability = {
  /** An engine is actually drawn (combustion or hybrid, position recorded). */
  hasEngine: boolean;
  /** A traction battery is drawn (electric or hybrid). */
  hasBattery: boolean;
};

export function presetAvailability(
  build: Pick<CarBuild, "powertrain" | "enginePosition">,
): PresetAvailability {
  return {
    hasEngine: build.powertrain !== "electric" && build.enginePosition !== null,
    hasBattery: build.powertrain !== "combustion",
  };
}

/**
 * Presets for a car, in toolbar order. ENGINE only when an engine is drawn —
 * an EV, or a car whose engine position is not recorded, would frame an
 * empty bay — and BATTERY only when there is a battery to look at.
 */
export function availablePresets({
  hasEngine,
  hasBattery,
}: PresetAvailability): PresetId[] {
  return PRESET_IDS.filter((id) => {
    if (id === "engine") return hasEngine;
    if (id === "battery") return hasBattery;
    return true;
  });
}

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === "string" && (PRESET_IDS as readonly string[]).includes(value);
}
