import type { CarColor, PaintFinish } from "@/types/domain";

/**
 * The viewer's configurator: paint, wheels, brake calipers and discs.
 *
 * Honesty rules, enforced here rather than left to the UI:
 *   - A car's catalogued colours (`car_colors`, each with a source) are the
 *     only colours presented under a manufacturer's paint name.
 *   - Everything else is an AURIX studio finish: a visualisation colour with
 *     a plain descriptive name, never dressed up as a factory paint.
 *   - Wheel styles and caliper colours are the ones the procedural geometry
 *     can draw. They are presentation choices, not a claim about options.
 *
 * Pure data and functions, no three.js.
 */

// ---------------------------------------------------------------------------
// Finishes
// ---------------------------------------------------------------------------

export const FINISH_IDS = ["gloss", "metallic", "pearl", "matte", "satin"] as const;
export type FinishId = (typeof FINISH_IDS)[number];

export const FINISH_LABELS: Record<FinishId, string> = {
  gloss: "Gloss",
  metallic: "Metallic",
  pearl: "Pearl",
  matte: "Matte",
  satin: "Satin",
};

/** Finishes offered for a studio colour. Pearl is only ever catalogue data. */
export const STUDIO_FINISHES = [
  "gloss",
  "metallic",
  "matte",
  "satin",
] as const satisfies readonly FinishId[];

/** How a finish is built in a physically based material. */
export type SurfaceParams = {
  metalness: number;
  roughness: number;
  /** Clear lacquer over the base coat, 0–1. */
  clearcoat: number;
  clearcoatRoughness: number;
  /** Strength of the metallic flake in the base coat, 0–1. */
  flake: number;
  /** Thin-film colour shift of a pearlescent coat, 0–1. */
  iridescence: number;
};

export const FINISH_PARAMS: Record<FinishId, SurfaceParams> = {
  // Solid colour under a thick clear coat: the base is dielectric.
  gloss: {
    metalness: 0.02,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    flake: 0,
    iridescence: 0,
  },
  metallic: {
    metalness: 0.78,
    roughness: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    flake: 1,
    iridescence: 0,
  },
  pearl: {
    metalness: 0.42,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    flake: 0.55,
    iridescence: 0.35,
  },
  // Matte paint has no gloss lacquer at all; that is what makes it matte.
  matte: {
    metalness: 0.18,
    roughness: 0.68,
    clearcoat: 0,
    clearcoatRoughness: 0.6,
    flake: 0,
    iridescence: 0,
  },
  satin: {
    metalness: 0.45,
    roughness: 0.46,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    flake: 0.3,
    iridescence: 0,
  },
};

/** The catalogue's `paint_finish` enum mapped onto a rendered finish. */
export function finishFromCatalogue(finish: PaintFinish): FinishId {
  switch (finish) {
    case "solid":
      return "gloss";
    case "metallic":
      return "metallic";
    case "pearl":
      return "pearl";
    case "matte":
      return "matte";
    case "satin":
      return "satin";
  }
}

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export type StudioColor = {
  id: string;
  name: string;
  hex: string;
  finish: FinishId;
};

/**
 * AURIX studio finishes. Descriptive names on purpose: these are colours to
 * judge a shape in, not any manufacturer's paint.
 */
export const STUDIO_COLORS = [
  { id: "obsidian-black", name: "Obsidian Black", hex: "#0c0d10", finish: "metallic" },
  { id: "arctic-white", name: "Arctic White", hex: "#e8e7e3", finish: "gloss" },
  { id: "racing-red", name: "Racing Red", hex: "#8f1616", finish: "gloss" },
  { id: "graphite-grey", name: "Graphite Grey", hex: "#3a3e45", finish: "metallic" },
  { id: "midnight-blue", name: "Midnight Blue", hex: "#141c33", finish: "metallic" },
  { id: "silver", name: "Silver", hex: "#aeb3ba", finish: "metallic" },
  { id: "aurum-gold", name: "Aurum Gold", hex: "#a8823a", finish: "metallic" },
] as const satisfies readonly StudioColor[];

export type StudioColorId = (typeof STUDIO_COLORS)[number]["id"];

export const DEFAULT_STUDIO_COLOR: StudioColorId = "silver";

export function isStudioColorId(value: unknown): value is StudioColorId {
  return typeof value === "string" && STUDIO_COLORS.some((color) => color.id === value);
}

/** "#abc", "abc", "#aabbcc" or "AABBCC" as "#aabbcc"; anything else null. */
export function normaliseHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${[...raw].map((c) => c + c).join("")}`.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toLowerCase();
  return null;
}

/** Catalogued colours that can actually be drawn, in display order. */
export function catalogueSwatches(colors: readonly CarColor[]): CarColor[] {
  return colors
    .filter((color) => normaliseHex(color.hex) !== null)
    .sort((a, b) => a.display_order - b.display_order || a.name.localeCompare(b.name));
}

export type PaintChoice =
  | { source: "catalogue"; id: string }
  | { source: "studio"; id: StudioColorId; finish: FinishId };

export type ResolvedPaint = {
  name: string;
  hex: string;
  finish: FinishId;
  source: "catalogue" | "studio";
  /** The catalogue row, for its source and link. */
  color: CarColor | null;
};

export function resolvePaint(
  choice: PaintChoice,
  colors: readonly CarColor[],
): ResolvedPaint {
  if (choice.source === "catalogue") {
    const color = colors.find((entry) => entry.id === choice.id);
    const hex = normaliseHex(color?.hex);
    if (color && hex) {
      return {
        name: color.name,
        hex,
        finish: finishFromCatalogue(color.finish),
        source: "catalogue",
        color,
      };
    }
  }
  const studio =
    STUDIO_COLORS.find((entry) => entry.id === choice.id) ??
    STUDIO_COLORS.find((entry) => entry.id === DEFAULT_STUDIO_COLOR) ??
    STUDIO_COLORS[0];
  const finish =
    choice.source === "studio" &&
    (STUDIO_FINISHES as readonly string[]).includes(choice.finish)
      ? choice.finish
      : studio.finish;
  return { name: studio.name, hex: studio.hex, finish, source: "studio", color: null };
}

// ---------------------------------------------------------------------------
// Wheels, calipers, discs
// ---------------------------------------------------------------------------

/** The spoke patterns the procedural wheel geometry can build. */
export const WHEEL_STYLES = ["twin", "five", "six", "mesh"] as const;
export type WheelStyle = (typeof WHEEL_STYLES)[number];

export const WHEEL_STYLE_LABELS: Record<WheelStyle, string> = {
  twin: "Twin-spoke",
  five: "Five-spoke",
  six: "Six-spoke",
  mesh: "Mesh",
};

export const WHEEL_FINISHES = ["dark", "bright"] as const;
export type WheelFinish = (typeof WHEEL_FINISHES)[number];

export const WHEEL_FINISH_LABELS: Record<WheelFinish, string> = {
  dark: "Dark",
  bright: "Bright",
};

export const WHEEL_FINISH_PARAMS: Record<
  WheelFinish,
  { color: string; metalness: number; roughness: number }
> = {
  dark: { color: "#2a2c30", metalness: 0.9, roughness: 0.3 },
  bright: { color: "#c2c6cc", metalness: 0.95, roughness: 0.24 },
};

export const CALIPER_COLORS = [
  { id: "black", name: "Black", hex: "#141417" },
  { id: "red", name: "Red", hex: "#a11d1a" },
  { id: "yellow", name: "Yellow", hex: "#d19c16" },
  { id: "grey", name: "Grey", hex: "#6d7077" },
  { id: "gold", name: "Gold", hex: "#c8a34a" },
] as const;

export type CaliperId = (typeof CALIPER_COLORS)[number]["id"];

export const DISC_TYPES = ["steel", "carbon-ceramic"] as const;
export type DiscType = (typeof DISC_TYPES)[number];

export const DISC_LABELS: Record<DiscType, string> = {
  steel: "Steel",
  "carbon-ceramic": "Carbon-ceramic",
};

export const DISC_PARAMS: Record<
  DiscType,
  { color: string; metalness: number; roughness: number }
> = {
  steel: { color: "#7c7e84", metalness: 0.85, roughness: 0.42 },
  // Carbon-ceramic rotors are a dark, matte, mottled grey.
  "carbon-ceramic": { color: "#34322f", metalness: 0.25, roughness: 0.66 },
};

// ---------------------------------------------------------------------------
// The whole configuration
// ---------------------------------------------------------------------------

export type ViewerConfig = {
  paint: PaintChoice;
  wheelStyle: WheelStyle;
  wheelFinish: WheelFinish;
  caliper: CaliperId;
  disc: DiscType;
};

export type ConfigDefaults = {
  colors: readonly CarColor[];
  /** The body style's own spoke pattern and rim finish. */
  wheelStyle: WheelStyle;
  wheelFinish: WheelFinish;
  /** The variant catalogues carbon-ceramic discs. */
  carbonCeramic: boolean;
};

export function defaultConfig({
  colors,
  wheelStyle,
  wheelFinish,
  carbonCeramic,
}: ConfigDefaults): ViewerConfig {
  const first = catalogueSwatches(colors)[0];
  const studio = STUDIO_COLORS.find((color) => color.id === DEFAULT_STUDIO_COLOR);
  return {
    paint: first
      ? { source: "catalogue", id: first.id }
      : {
          source: "studio",
          id: DEFAULT_STUDIO_COLOR,
          finish: studio?.finish ?? "metallic",
        },
    wheelStyle,
    wheelFinish,
    caliper: "gold",
    disc: carbonCeramic ? "carbon-ceramic" : "steel",
  };
}

const oneOf = <T extends string>(options: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (options as readonly string[]).includes(value);

/**
 * A stored configuration, checked field by field. Anything unrecognised — a
 * stale colour id after the catalogue changed, a hand-edited value — falls
 * back to the default for that field rather than breaking the viewer.
 */
export function sanitizeConfig(
  raw: unknown,
  defaults: ViewerConfig,
  colors: readonly CarColor[],
): ViewerConfig {
  if (!raw || typeof raw !== "object") return defaults;
  const value = raw as Record<string, unknown>;

  let paint = defaults.paint;
  const storedPaint = value.paint as Record<string, unknown> | undefined;
  if (storedPaint && typeof storedPaint === "object") {
    if (
      storedPaint.source === "catalogue" &&
      typeof storedPaint.id === "string" &&
      catalogueSwatches(colors).some((color) => color.id === storedPaint.id)
    ) {
      paint = { source: "catalogue", id: storedPaint.id };
    } else if (
      storedPaint.source === "studio" &&
      isStudioColorId(storedPaint.id) &&
      oneOf(STUDIO_FINISHES, storedPaint.finish)
    ) {
      paint = { source: "studio", id: storedPaint.id, finish: storedPaint.finish };
    }
  }

  return {
    paint,
    wheelStyle: oneOf(WHEEL_STYLES, value.wheelStyle)
      ? value.wheelStyle
      : defaults.wheelStyle,
    wheelFinish: oneOf(WHEEL_FINISHES, value.wheelFinish)
      ? value.wheelFinish
      : defaults.wheelFinish,
    caliper: oneOf(
      CALIPER_COLORS.map((color) => color.id),
      value.caliper,
    )
      ? value.caliper
      : defaults.caliper,
    disc: oneOf(DISC_TYPES, value.disc) ? value.disc : defaults.disc,
  };
}

/** sessionStorage key for one car's configuration. */
export function configStorageKey(carKey: string): string {
  const slug = carKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `aurix-viewer-config:${slug || "car"}`;
}

/** The rendered material parameters for a paint. */
export function paintSurface(paint: ResolvedPaint): SurfaceParams & { color: string } {
  return { color: paint.hex, ...FINISH_PARAMS[paint.finish] };
}
