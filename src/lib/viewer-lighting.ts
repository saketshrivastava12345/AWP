import { VOID } from "@/lib/viewer-colors";

/**
 * Lighting presets for the viewer. The rigs themselves are built in the scene
 * (`src/components/3d/CarLighting.tsx`) from soft light panels and simple
 * lights; nothing is downloaded. This module holds the pure description:
 * exposure, backdrop, fog and floor, so the toolbar can list the presets
 * without loading three.js.
 */

export const LIGHTING_IDS = ["studio", "outdoor", "dark", "engineering"] as const;
export type LightingId = (typeof LIGHTING_IDS)[number];

export const DEFAULT_LIGHTING: LightingId = "studio";

export type LightingDef = {
  id: LightingId;
  label: string;
  /** One line for the tooltip. */
  description: string;
  /** Tone-mapping exposure. Tuned per rig so highlights never clip. */
  exposure: number;
  /** Backdrop: a flat colour, or a vertical gradient (top, bottom). */
  background: string | [top: string, bottom: string];
  /** Fog colour and near/far distances for a 4.5 m car. */
  fog: [color: string, near: number, far: number];
  /** A measured grid drawn over the floor. */
  grid: boolean;
  floorColor: string;
  /** Base roughness of the floor under its reflection (or matte on LOW). */
  floorRoughness: number;
  contactShadowOpacity: number;
};

export const LIGHTING: Record<LightingId, LightingDef> = {
  studio: {
    id: "studio",
    label: "Studio",
    description: "Soft overhead panels and side strips, as in a showroom.",
    exposure: 1,
    background: VOID,
    fog: [VOID, 12, 34],
    grid: false,
    floorColor: "#09090c",
    floorRoughness: 0.85,
    contactShadowOpacity: 0.75,
  },
  outdoor: {
    id: "outdoor",
    label: "Outdoor",
    description: "Daylight sky, a warm low sun and light bounced off the ground.",
    exposure: 0.92,
    background: ["#2a3440", "#0e1115"],
    fog: ["#11151a", 14, 40],
    grid: false,
    floorColor: "#17181b",
    floorRoughness: 0.95,
    contactShadowOpacity: 0.85,
  },
  dark: {
    id: "dark",
    label: "Dark",
    description: "Low-key: rim light traces the silhouette out of darkness.",
    exposure: 0.85,
    background: "#030305",
    fog: ["#030305", 10, 28],
    grid: false,
    floorColor: "#050507",
    floorRoughness: 0.7,
    contactShadowOpacity: 0.9,
  },
  engineering: {
    id: "engineering",
    label: "Engineering",
    description: "Flat, neutral light over a measured grid, for reading forms.",
    exposure: 1,
    background: "#0b0e13",
    fog: ["#0b0e13", 14, 40],
    grid: true,
    floorColor: "#0c0f14",
    floorRoughness: 0.95,
    contactShadowOpacity: 0.45,
  },
};

export function isLightingId(value: unknown): value is LightingId {
  return typeof value === "string" && (LIGHTING_IDS as readonly string[]).includes(value);
}
