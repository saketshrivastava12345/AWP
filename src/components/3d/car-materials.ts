import * as THREE from "three";

/**
 * Materials for the procedural car.
 *
 * The paint is the part that sells the shape: a metallic base under a clear
 * coat, which is how real automotive paint is built. It only reads as metal
 * because Lighting.tsx gives it a studio of soft light panels to reflect.
 */

export type PaintId =
  "gt-silver" | "carrara" | "obsidian" | "graphite" | "aurum" | "rosso";

export type Paint = {
  id: PaintId;
  label: string;
  color: string;
  metalness: number;
  roughness: number;
};

/**
 * Paint swatches offered in the viewer. A car's real colour is not in the
 * catalogue, so this is presentation only — nothing here claims a factory
 * colour for any variant.
 */
export const PAINTS: readonly Paint[] = [
  {
    id: "gt-silver",
    label: "GT Silver",
    color: "#aeb3ba",
    metalness: 0.78,
    roughness: 0.3,
  },
  {
    id: "carrara",
    label: "Carrara White",
    color: "#e6e4df",
    metalness: 0.12,
    roughness: 0.28,
  },
  {
    id: "graphite",
    label: "Graphite",
    color: "#3a3e45",
    metalness: 0.72,
    roughness: 0.3,
  },
  {
    id: "obsidian",
    label: "Obsidian",
    color: "#0d0e11",
    metalness: 0.55,
    roughness: 0.3,
  },
  { id: "aurum", label: "Aurum", color: "#a8823a", metalness: 0.86, roughness: 0.3 },
  { id: "rosso", label: "Rosso", color: "#6e1512", metalness: 0.45, roughness: 0.32 },
] as const;

export const DEFAULT_PAINT: PaintId = "gt-silver";

export function paintById(id: PaintId | null | undefined): Paint {
  return PAINTS.find((paint) => paint.id === id) ?? PAINTS[0]!;
}

export const GOLD = "#c8a34a";

type Factory = () => THREE.Material;

const FACTORIES = {
  paint: () =>
    new THREE.MeshPhysicalMaterial({
      color: PAINTS[0]!.color,
      metalness: PAINTS[0]!.metalness,
      roughness: PAINTS[0]!.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.25,
    }),
  /** The inside of the shell, seen through the glass. */
  lining: () =>
    new THREE.MeshStandardMaterial({
      color: "#121216",
      roughness: 0.85,
      metalness: 0,
      side: THREE.BackSide,
    }),
  under: () =>
    new THREE.MeshStandardMaterial({ color: "#08080b", roughness: 0.9, metalness: 0.1 }),
  /** Wheel-arch liners are seen from both sides through the opening. */
  well: () =>
    new THREE.MeshStandardMaterial({
      color: "#060608",
      roughness: 0.95,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  trim: () =>
    new THREE.MeshPhysicalMaterial({
      color: "#0a0a0c",
      roughness: 0.28,
      metalness: 0.2,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
    }),
  satin: () =>
    new THREE.MeshStandardMaterial({
      color: "#16171a",
      roughness: 0.55,
      metalness: 0.35,
    }),
  chrome: () =>
    new THREE.MeshStandardMaterial({ color: "#e8e8ec", roughness: 0.1, metalness: 1 }),
  glass: () =>
    new THREE.MeshPhysicalMaterial({
      color: "#0f161b",
      metalness: 0.1,
      roughness: 0.03,
      transparent: true,
      opacity: 0.42,
      envMapIntensity: 2,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      depthWrite: false,
    }),
  /** Side glass: no opening behind it, so it is drawn as deep tinted glass. */
  sideGlass: () =>
    new THREE.MeshPhysicalMaterial({
      color: "#0a0e11",
      metalness: 0.25,
      roughness: 0.04,
      envMapIntensity: 1.7,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    }),
  lens: () =>
    new THREE.MeshPhysicalMaterial({
      color: "#1a2026",
      metalness: 0.6,
      roughness: 0.08,
      envMapIntensity: 1.8,
      clearcoat: 1,
    }),
  drl: () =>
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#e6f3ff",
      emissiveIntensity: 2.6,
      roughness: 0.2,
      toneMapped: false,
    }),
  tail: () =>
    new THREE.MeshStandardMaterial({
      color: "#2a0305",
      emissive: "#b0141c",
      emissiveIntensity: 1.9,
      roughness: 0.25,
      toneMapped: false,
    }),
  tyre: () =>
    new THREE.MeshStandardMaterial({
      color: "#131316",
      roughness: 0.88,
      metalness: 0.02,
    }),
  rim: () =>
    new THREE.MeshStandardMaterial({
      color: "#c2c6cc",
      roughness: 0.24,
      metalness: 0.95,
    }),
  rimDark: () =>
    new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.3, metalness: 0.9 }),
  disc: () =>
    new THREE.MeshStandardMaterial({
      color: "#7c7e84",
      roughness: 0.42,
      metalness: 0.85,
    }),
  caliper: () =>
    new THREE.MeshPhysicalMaterial({
      color: GOLD,
      roughness: 0.32,
      metalness: 0.35,
      clearcoat: 0.8,
    }),
  alloy: () =>
    new THREE.MeshStandardMaterial({
      color: "#9a9da4",
      roughness: 0.34,
      metalness: 0.88,
    }),
  castIron: () =>
    new THREE.MeshStandardMaterial({ color: "#4a4744", roughness: 0.62, metalness: 0.7 }),
  camCover: () =>
    new THREE.MeshStandardMaterial({ color: "#1c1d21", roughness: 0.45, metalness: 0.5 }),
  carbon: () =>
    new THREE.MeshPhysicalMaterial({
      color: "#15161a",
      roughness: 0.35,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    }),
  steel: () =>
    new THREE.MeshStandardMaterial({ color: "#6f727a", roughness: 0.4, metalness: 0.82 }),
  spring: () =>
    new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.6 }),
  battery: () =>
    new THREE.MeshStandardMaterial({ color: "#2b3036", roughness: 0.5, metalness: 0.55 }),
  /** High-voltage cabling is orange on every production EV; muted here. */
  hv: () =>
    new THREE.MeshStandardMaterial({ color: "#b8642c", roughness: 0.5, metalness: 0.1 }),
  copper: () =>
    new THREE.MeshStandardMaterial({ color: "#a86a3e", roughness: 0.35, metalness: 0.9 }),
  leather: () =>
    new THREE.MeshStandardMaterial({
      color: "#1b1b20",
      roughness: 0.72,
      metalness: 0.05,
    }),
  stitch: () =>
    new THREE.MeshStandardMaterial({ color: "#8a6f35", roughness: 0.6, metalness: 0.2 }),
  screen: () =>
    new THREE.MeshStandardMaterial({
      color: "#05080b",
      emissive: "#1b3140",
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.3,
    }),
  pcb: () =>
    new THREE.MeshStandardMaterial({ color: "#232830", roughness: 0.5, metalness: 0.4 }),
} satisfies Record<string, Factory>;

export type MaterialName = keyof typeof FACTORIES;

/**
 * A lazily-populated set of materials.
 *
 * Each subsystem gets its own kit, so highlighting the brakes can tint the
 * brake materials without also tinting the identical-looking steel of the
 * suspension. Only materials actually used are ever created.
 */
export class MaterialKit {
  private readonly cache = new Map<MaterialName, THREE.Material>();

  get<T extends MaterialName>(name: T): ReturnType<(typeof FACTORIES)[T]> {
    let material = this.cache.get(name);
    if (!material) {
      material = FACTORIES[name]();
      this.cache.set(name, material);
    }
    return material as ReturnType<(typeof FACTORIES)[T]>;
  }

  all(): THREE.Material[] {
    return [...this.cache.values()];
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    this.cache.clear();
  }
}

export function applyPaint(material: THREE.MeshPhysicalMaterial, paint: Paint): void {
  material.color.set(paint.color);
  material.metalness = paint.metalness;
  material.roughness = paint.roughness;
}

/** The tint a highlighted subsystem glows with, already scaled to a glint. */
const HIGHLIGHT = new THREE.Color(GOLD).multiplyScalar(0.06);

/**
 * Tint every material in a kit faintly toward gold, to point at the subsystem
 * being discussed. What really picks it out is setDim() fading everything
 * around it; this only adds warmth.
 *
 * The blend works on the emissive colour with the intensity pinned at 1.
 * Materials default to an emissive intensity of 1 with a black colour, so
 * scaling the intensity instead would leave a full-strength gold.
 */
export function setHighlight(kit: MaterialKit, amount: number): void {
  for (const material of kit.all()) {
    if (!(material instanceof THREE.MeshStandardMaterial)) continue;
    // Lamps are already emissive; tinting them would read as a fault.
    if (!material.toneMapped) continue;

    const data = material.userData as {
      baseEmissive?: THREE.Color;
      baseIntensity?: number;
    };
    if (!data.baseEmissive) {
      data.baseEmissive = material.emissive.clone();
      data.baseIntensity = material.emissiveIntensity;
    }

    if (amount <= 0.001) {
      material.emissive.copy(data.baseEmissive);
      material.emissiveIntensity = data.baseIntensity ?? 1;
    } else {
      material.emissive
        .copy(data.baseEmissive)
        .multiplyScalar(data.baseIntensity ?? 1)
        .lerp(HIGHLIGHT, Math.min(1, amount));
      material.emissiveIntensity = 1;
    }
  }
}

/**
 * Fade a subsystem back so another can be seen through it — the cutaway
 * convention of a technical illustration. 0 = as built, 1 = faint.
 */
export function setDim(kit: MaterialKit, amount: number): void {
  for (const material of kit.all()) {
    const data = material.userData as {
      baseOpacity?: number;
      baseTransparent?: boolean;
      baseDepthWrite?: boolean;
    };
    if (data.baseOpacity === undefined) {
      data.baseOpacity = material.opacity;
      data.baseTransparent = material.transparent;
      data.baseDepthWrite = material.depthWrite;
    }
    const dimmed = amount > 0.001;
    material.opacity = (data.baseOpacity ?? 1) * (1 - 0.8 * Math.min(1, amount));
    material.transparent = dimmed || (data.baseTransparent ?? false);
    material.depthWrite = amount < 0.5 ? (data.baseDepthWrite ?? true) : false;
  }
}
