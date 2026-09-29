/**
 * Render quality for the 3D viewer.
 *
 * Three fixed levels, each a complete recipe for the canvas: pixel ratio,
 * shadows, floor reflection, environment resolution, contact-shadow policy
 * and procedural detail. AUTO picks a level from what the device reports
 * about itself and then adjusts it from measured frame rate.
 *
 * Pure: no DOM, no three.js. The browser signals are gathered by
 * `src/hooks/useGpuTier.ts`; the canvas applies the profile.
 */

export const QUALITY_LEVELS = ["high", "medium", "low"] as const;
export type QualityLevel = (typeof QUALITY_LEVELS)[number];

export const QUALITY_SETTINGS = ["auto", "high", "medium", "low"] as const;
export type QualitySetting = (typeof QUALITY_SETTINGS)[number];

export const QUALITY_LABELS: Record<QualitySetting, string> = {
  auto: "Auto",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** localStorage key for the visitor's explicit choice. */
export const QUALITY_STORAGE_KEY = "aurix-viewer-quality";

export type QualityProfile = {
  level: QualityLevel;
  /** Device-pixel-ratio range handed to the canvas. */
  dpr: [number, number];
  /** Whether the key light renders a shadow map at all. */
  shadows: boolean;
  shadowMapSize: number;
  /** Softly mirrored floor (renders the scene a second time) or matte. */
  reflector: boolean;
  reflectorResolution: number;
  /** Cube-map size the lighting environment is rendered into. */
  envResolution: number;
  contactShadowResolution: number;
  /**
   * Re-render contact shadows while parts move (the explode). When false
   * they are captured once per arrangement, which is nearly free.
   */
  liveContactShadows: boolean;
  /** Fewer segments and small details dropped from the procedural car. */
  lowDetail: boolean;
  /** Physically transmissive glass (an extra opaque pass per frame). */
  glassTransmission: boolean;
  /** Procedural surface textures: paint flake, carbon weave, brushed metal. */
  surfaceDetail: boolean;
};

export const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  high: {
    level: "high",
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    reflector: true,
    reflectorResolution: 1024,
    envResolution: 512,
    contactShadowResolution: 1024,
    liveContactShadows: true,
    lowDetail: false,
    glassTransmission: true,
    surfaceDetail: true,
  },
  medium: {
    level: "medium",
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    reflector: true,
    reflectorResolution: 512,
    envResolution: 256,
    contactShadowResolution: 512,
    liveContactShadows: true,
    lowDetail: false,
    glassTransmission: false,
    surfaceDetail: true,
  },
  low: {
    level: "low",
    dpr: [1, 1],
    shadows: false,
    shadowMapSize: 512,
    reflector: false,
    reflectorResolution: 256,
    envResolution: 128,
    contactShadowResolution: 256,
    liveContactShadows: false,
    lowDetail: true,
    glassTransmission: false,
    surfaceDetail: false,
  },
};

export function isQualitySetting(value: unknown): value is QualitySetting {
  return (
    typeof value === "string" && (QUALITY_SETTINGS as readonly string[]).includes(value)
  );
}

/** A stored value, or AUTO when there is none or it is not recognised. */
export function parseQualitySetting(value: string | null | undefined): QualitySetting {
  return isQualitySetting(value) ? value : "auto";
}

// ---------------------------------------------------------------------------
// Choosing a level from the device
// ---------------------------------------------------------------------------

/** What the browser reports about the device, gathered once on the client. */
export type DeviceSignals = {
  /** No fine pointer anywhere: a phone or tablet. */
  coarsePointer: boolean;
  /** Shorter side of the screen, CSS pixels. */
  screenMin: number | null;
  /** navigator.deviceMemory, GiB (Chromium only, capped at 8). */
  deviceMemory: number | null;
  /** navigator.hardwareConcurrency. */
  cores: number | null;
  /** Unmasked WebGL renderer string, when the browser exposes it. */
  renderer: string | null;
  /** The visitor asked for reduced data use. */
  saveData: boolean;
};

export type QualityDecision = { level: QualityLevel; reason: string };

/** CPU rasterisers: every pixel costs CPU time, so render as little as possible. */
const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|offscreen/i;

/** Discrete desktop GPUs and Apple Silicon. */
const DISCRETE_RENDERER =
  /nvidia|geforce|quadro|\brtx\b|\bgtx\b|radeon\s*(\(tm\)\s*)?(rx|pro|vii)|intel\(r\)\s*arc|\barc\(tm\)|apple m\d/i;

/** Integrated and mobile GPUs. */
const INTEGRATED_RENDERER =
  /intel|mali|adreno|powervr|videocore|apple a\d|radeon\(tm\)\s*graphics|vega \d/i;

/** Safari masks every Apple GPU as "Apple GPU": a Mac or an iPhone. */
const MASKED_APPLE = /apple gpu/i;

/** Pick a starting level from device signals. Deliberately conservative on phones. */
export function selectQuality(signals: DeviceSignals): QualityDecision {
  const { renderer, deviceMemory, cores, coarsePointer, screenMin } = signals;

  if (renderer && SOFTWARE_RENDERER.test(renderer)) {
    return { level: "low", reason: "Software renderer" };
  }
  if (signals.saveData) return { level: "low", reason: "Data saver is on" };
  if (deviceMemory !== null && deviceMemory <= 2) {
    return { level: "low", reason: "Low device memory" };
  }
  if (cores !== null && cores <= 2) return { level: "low", reason: "Few CPU cores" };

  if (coarsePointer) {
    const phone = screenMin !== null && screenMin < 600;
    if (phone) {
      return deviceMemory !== null && deviceMemory >= 8
        ? { level: "medium", reason: "High-memory phone" }
        : { level: "low", reason: "Phone" };
    }
    return { level: "medium", reason: "Tablet" };
  }

  if (renderer && DISCRETE_RENDERER.test(renderer)) {
    return { level: "high", reason: "Dedicated GPU" };
  }
  if (renderer && MASKED_APPLE.test(renderer)) {
    return cores !== null && cores >= 8
      ? { level: "high", reason: "Apple desktop GPU" }
      : { level: "medium", reason: "Apple GPU" };
  }
  if (renderer && INTEGRATED_RENDERER.test(renderer)) {
    return { level: "medium", reason: "Integrated GPU" };
  }
  if ((cores ?? 0) >= 8 && (deviceMemory ?? 8) >= 8) {
    return { level: "high", reason: "Desktop-class device" };
  }
  return { level: "medium", reason: "Unrecognised GPU" };
}

export function stepQuality(level: QualityLevel, direction: "up" | "down"): QualityLevel {
  const index = QUALITY_LEVELS.indexOf(level);
  const next = direction === "down" ? index + 1 : index - 1;
  return QUALITY_LEVELS[Math.min(QUALITY_LEVELS.length - 1, Math.max(0, next))] ?? level;
}

/** True when `a` is a higher quality level than `b`. */
export function isAbove(a: QualityLevel, b: QualityLevel): boolean {
  return QUALITY_LEVELS.indexOf(a) < QUALITY_LEVELS.indexOf(b);
}

// ---------------------------------------------------------------------------
// Adapting AUTO from measured frame rate
// ---------------------------------------------------------------------------

export type AdaptiveQuality = {
  level: QualityLevel;
  /** The device's own level. AUTO never climbs above it. */
  ceiling: QualityLevel;
  declines: number;
  inclines: number;
};

export function initialAdaptive(level: QualityLevel): AdaptiveQuality {
  return { level, ceiling: level, declines: 0, inclines: 0 };
}

/**
 * Step down on sustained low frame rate; step back up only to recover a level
 * that was lost, and never after the level has flip-flopped. Frame rate on a
 * laptop swings with thermals and other tabs, so a viewer that keeps changing
 * its look would be worse than one that settles slightly low.
 */
export function adaptQuality(
  state: AdaptiveQuality,
  event: "decline" | "incline",
): AdaptiveQuality {
  if (event === "decline") {
    const level = stepQuality(state.level, "down");
    if (level === state.level) return state;
    return { ...state, level, declines: state.declines + 1 };
  }
  const recoverable =
    state.declines < 2 &&
    state.inclines < state.declines &&
    isAbove(state.ceiling, state.level);
  if (!recoverable) return state;
  return {
    ...state,
    level: stepQuality(state.level, "up"),
    inclines: state.inclines + 1,
  };
}

/** The level actually rendered for a setting. */
export function effectiveLevel(
  setting: QualitySetting,
  adaptive: AdaptiveQuality | null,
): QualityLevel {
  if (setting !== "auto") return setting;
  return adaptive?.level ?? "medium";
}
