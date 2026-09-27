import * as THREE from "three";
import { GOLD } from "@/lib/viewer-colors";
import { FINISH_PARAMS, type SurfaceParams } from "@/lib/viewer-paint";
import { releaseTexture, retainTexture, type TextureName } from "./car-textures";

export { GOLD };

/**
 * Materials for the procedural car.
 *
 * The paint is the part that sells the shape: a base coat under a clear coat,
 * which is how real automotive paint is built, with metallic flake in the base
 * where the finish has it. It only reads as metal because the lighting rig
 * gives it soft light panels to reflect.
 */

/** A paint as the renderer needs it: colour plus finish parameters. */
export type PaintSurface = SurfaceParams & { color: string };

/** The neutral studio silver the car shows before anything is chosen. */
export const DEFAULT_SURFACE: PaintSurface = {
  color: "#aeb3ba",
  ...FINISH_PARAMS.metallic,
};

type Factory = () => THREE.Material;

/** Carbon without its weave texture (LOW quality): a flat dark lacquer. */
const CARBON_PLAIN = "#15161a";

const FACTORIES = {
  paint: () =>
    new THREE.MeshPhysicalMaterial({
      color: DEFAULT_SURFACE.color,
      metalness: DEFAULT_SURFACE.metalness,
      roughness: DEFAULT_SURFACE.roughness,
      clearcoat: DEFAULT_SURFACE.clearcoat,
      clearcoatRoughness: DEFAULT_SURFACE.clearcoatRoughness,
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
    new THREE.MeshStandardMaterial({ color: "#e8e8ec", roughness: 0.06, metalness: 1 }),
  /** Windscreen and rear glass: see-through, with a strong reflection. */
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
      ior: 1.5,
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
  /** Rubber: dark, rough, almost no specular. */
  tyre: () =>
    new THREE.MeshStandardMaterial({
      color: "#131316",
      roughness: 0.88,
      metalness: 0.02,
    }),
  /** One rim material whose finish the configurator eases between. */
  rim: () =>
    new THREE.MeshStandardMaterial({
      color: "#c2c6cc",
      roughness: 0.24,
      metalness: 0.95,
    }),
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
  /** Brushed aluminium castings. */
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
  /** Carbon fibre under lacquer. The weave texture supplies the colour. */
  carbon: () =>
    new THREE.MeshPhysicalMaterial({
      color: CARBON_PLAIN,
      roughness: 0.35,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
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

/** Which procedural texture a material wears, when surface detail is on. */
const DETAIL: Partial<
  Record<
    MaterialName,
    { texture: TextureName; slot: "normalMap" | "map" | "roughnessMap" }
  >
> = {
  paint: { texture: "flake", slot: "normalMap" },
  carbon: { texture: "carbon", slot: "map" },
  alloy: { texture: "brushed", slot: "roughnessMap" },
};

/** Windscreen glass drawn by physical transmission instead of blending. */
const TRANSMISSIVE_GLASS = {
  transmission: 1,
  thickness: 0.006,
  color: new THREE.Color("#dfe7ea"),
  attenuationColor: new THREE.Color("#7f959e"),
  attenuationDistance: 0.35,
  opacity: 1,
  transparent: false,
};

const BLENDED_GLASS = {
  transmission: 0,
  thickness: 0,
  color: new THREE.Color("#0f161b"),
  attenuationColor: new THREE.Color("#ffffff"),
  attenuationDistance: Infinity,
  opacity: 0.42,
  transparent: true,
};

/**
 * A lazily-populated set of materials.
 *
 * Each subsystem gets its own kit, so highlighting the brakes can tint the
 * brake materials without also tinting the identical-looking steel of the
 * suspension. Only materials actually used are ever created.
 *
 * `dispose()` frees the GPU side but keeps the material objects: React's
 * development double-mount disposes and then reuses a kit, and everything
 * that captured a material (the shell's material array, the ghost fades)
 * must keep pointing at live objects.
 */
export class MaterialKit {
  private readonly cache = new Map<MaterialName, THREE.Material>();
  private readonly retained = new Set<TextureName>();
  private detail: boolean;
  private transmission: boolean;
  /** Strength of the paint flake, from the current finish (0–1). */
  private flake = DEFAULT_SURFACE.flake;

  constructor({ detail = true, transmission = false } = {}) {
    this.detail = detail;
    this.transmission = transmission;
  }

  get<T extends MaterialName>(name: T): ReturnType<(typeof FACTORIES)[T]> {
    let material = this.cache.get(name);
    if (!material) {
      material = FACTORIES[name]();
      this.cache.set(name, material);
      this.applyDetail(name, material);
      if (name === "glass") this.applyGlass(material as THREE.MeshPhysicalMaterial);
    }
    return material as ReturnType<(typeof FACTORIES)[T]>;
  }

  all(): THREE.Material[] {
    return [...this.cache.values()];
  }

  /** Turn the procedural surface textures on or off (quality level). */
  setSurfaceDetail(on: boolean): void {
    if (on === this.detail) return;
    this.detail = on;
    for (const [name, material] of this.cache) this.applyDetail(name, material);
  }

  /** Physically transmissive windscreen glass (HIGH quality only). */
  setGlassTransmission(on: boolean): void {
    if (on === this.transmission) return;
    this.transmission = on;
    const glass = this.cache.get("glass");
    if (glass) this.applyGlass(glass as THREE.MeshPhysicalMaterial);
  }

  get glassTransmission(): boolean {
    return this.transmission;
  }

  /** Flake strength for the paint's normal map, 0–1. */
  setFlake(amount: number): void {
    this.flake = amount;
    const paint = this.cache.get("paint") as THREE.MeshPhysicalMaterial | undefined;
    if (paint) paint.normalScale.setScalar(0.32 * amount);
  }

  private applyDetail(name: MaterialName, material: THREE.Material): void {
    const detail = DETAIL[name];
    if (!detail) return;
    const target = material as THREE.MeshStandardMaterial;
    const current = target[detail.slot];
    if (this.detail && !current) {
      const texture = this.retain(detail.texture);
      if (!texture) return;
      target[detail.slot] = texture;
      if (name === "paint") target.normalScale.setScalar(0.32 * this.flake);
      // The weave texture carries the colour; the base must not tint it.
      if (name === "carbon") target.color.set("#ffffff");
      target.needsUpdate = true;
    } else if (!this.detail && current) {
      target[detail.slot] = null;
      if (name === "carbon") target.color.set(CARBON_PLAIN);
      target.needsUpdate = true;
    }
  }

  private applyGlass(material: THREE.MeshPhysicalMaterial): void {
    const recipe = this.transmission ? TRANSMISSIVE_GLASS : BLENDED_GLASS;
    material.transmission = recipe.transmission;
    material.thickness = recipe.thickness;
    material.color.copy(recipe.color);
    material.attenuationColor.copy(recipe.attenuationColor);
    material.attenuationDistance = recipe.attenuationDistance;
    material.opacity = recipe.opacity;
    material.transparent = recipe.transparent;
    material.userData.baseOpacity = recipe.opacity;
    material.needsUpdate = true;
  }

  private retain(name: TextureName): THREE.Texture | null {
    const texture = retainTexture(name);
    if (texture) {
      if (this.retained.has(name)) releaseTexture(name);
      else this.retained.add(name);
    }
    return texture;
  }

  dispose(): void {
    for (const material of this.cache.values()) material.dispose();
    for (const name of this.retained) releaseTexture(name);
    this.retained.clear();
  }
}

/** Set a paint's colour and finish on a physical material. */
export function applySurface(
  material: THREE.MeshPhysicalMaterial,
  surface: PaintSurface,
): void {
  material.color.set(surface.color);
  material.metalness = surface.metalness;
  material.roughness = surface.roughness;
  material.clearcoat = surface.clearcoat;
  material.clearcoatRoughness = surface.clearcoatRoughness;
  material.iridescence = surface.iridescence;
  material.iridescenceIOR = 1.3;
}

const scratchColor = new THREE.Color();

/** A surface part-way between two others (colour blended in linear space). */
export function blendSurface(
  material: THREE.MeshPhysicalMaterial,
  from: PaintSurface,
  to: PaintSurface,
  t: number,
): void {
  const k = Math.min(1, Math.max(0, t));
  material.color.set(from.color).lerp(scratchColor.set(to.color), k);
  const mix = (a: number, b: number) => a + (b - a) * k;
  material.metalness = mix(from.metalness, to.metalness);
  material.roughness = mix(from.roughness, to.roughness);
  material.clearcoat = mix(from.clearcoat, to.clearcoat);
  material.clearcoatRoughness = mix(from.clearcoatRoughness, to.clearcoatRoughness);
  // Iridescence switches a shader feature on above zero; step it at the ends
  // rather than recompiling mid-blend.
  material.iridescence =
    k < 1 ? Math.min(from.iridescence, to.iridescence) : to.iridescence;
  material.iridescenceIOR = 1.3;
}

/** Brightest the highlight tint gets, already scaled to a glint. */
const HIGHLIGHT = new THREE.Color(GOLD).multiplyScalar(0.12);

/**
 * Tint every material in a kit toward gold, to point at the subsystem being
 * hovered, selected or discussed. What really picks a subsystem out is
 * setDim() fading everything around it; this only adds warmth.
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
    const transparent = dimmed || (data.baseTransparent ?? false);
    // A change of `transparent` needs a shader rebuild (see applyGhost).
    if (material.transparent !== transparent) {
      material.transparent = transparent;
      material.needsUpdate = true;
    }
    material.depthWrite = amount < 0.5 ? (data.baseDepthWrite ?? true) : false;
  }
}
