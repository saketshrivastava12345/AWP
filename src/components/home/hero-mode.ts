import type { QualityLevel, QualitySetting } from "@/lib/viewer-quality";

/**
 * Whether the home hero draws its 3D scene or shows the still composition,
 * and why. Pure, so every branch is unit-tested.
 *
 * The still is not a degraded mode: it is the server-rendered first paint
 * that every visitor sees, and the scene fades in over it only when this says
 * so. Reasons are shown to the visitor, so a missing canvas is explained
 * rather than silently absent.
 */

export type HeroPosterReason =
  /** Hydrating, probing WebGL, or waiting for the page to finish loading. */
  | "pending"
  | "reduced-motion"
  | "no-webgl"
  /** The device's quality tier (or the visitor's own setting) is LOW. */
  | "low-power"
  /** The scene threw or lost its graphics context. */
  | "failed";

export type HeroMode =
  | { kind: "poster"; reason: HeroPosterReason; canOptIn: boolean }
  | { kind: "scene"; level: QualityLevel };

export type HeroModeInput = {
  reducedMotion: boolean;
  /** null until probed on the client. */
  webgl: boolean | null;
  /** The device's own tier (useGpuTier); null until known. */
  tier: QualityLevel | null;
  /** The visitor's stored viewer quality; an explicit level wins over AUTO. */
  setting: QualitySetting;
  /** Phone-sized viewport. */
  mobile: boolean;
  /** The visitor asked for the 3D scene on a LOW device. */
  optIn: boolean;
  failed: boolean;
};

export function heroMode(input: HeroModeInput): HeroMode {
  const { reducedMotion, webgl, tier, setting, mobile, optIn, failed } = input;

  // A moving camera is exactly what reduced motion asks us not to show, and
  // a still 3D frame would add nothing the drawing does not already say.
  if (reducedMotion) return { kind: "poster", reason: "reduced-motion", canOptIn: false };
  if (failed) return { kind: "poster", reason: "failed", canOptIn: false };
  if (webgl === false) return { kind: "poster", reason: "no-webgl", canOptIn: false };

  const level = setting === "auto" ? tier : setting;
  if (webgl === null || level === null) {
    return { kind: "poster", reason: "pending", canOptIn: false };
  }
  if (level === "low" && !optIn) {
    return { kind: "poster", reason: "low-power", canOptIn: true };
  }
  // Phones get the lighter recipe whatever the tier: no mirrored floor, no
  // shadow maps, a coarser car.
  return { kind: "scene", level: mobile ? "low" : level };
}

/** What the still says about itself, or null when nothing needs saying. */
export const POSTER_NOTES: Record<HeroPosterReason, string | null> = {
  pending: null,
  "reduced-motion": "Still drawing — reduced motion is on",
  "no-webgl": "Still drawing — this browser cannot draw 3D",
  "low-power": "Still drawing — 3D is off on this device to save power",
  failed: "Still drawing — the 3D scene could not start",
};

