import * as THREE from "three";

/**
 * Procedural surface textures: metallic-paint flake, carbon-fibre weave and
 * brushed aluminium. Generated once in memory (no image requests), shared by
 * every material that uses them, and reference-counted: when the last user
 * lets go the GPU copy is disposed. The texture object itself is kept, so a
 * remount simply re-uploads it instead of regenerating it.
 *
 * Deterministic: a seeded generator, so the pattern is identical on every
 * render and every visit.
 */

export type TextureName = "flake" | "carbon" | "brushed";

const cache = new Map<TextureName, THREE.Texture>();
const refs = new Map<TextureName, number>();

/** Small seeded PRNG (mulberry32). */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Metallic flake as a normal map: small clusters of texels each tilted a
 * random way, so the base coat sparkles as the light moves across it. Mip
 * levels average the tilts back to flat, so the sparkle fades with distance
 * the way real flake does.
 */
function flakeTexture(): THREE.Texture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const next = random(0xa51c3);
  const cell = 2;
  for (let cy = 0; cy < size; cy += cell) {
    for (let cx = 0; cx < size; cx += cell) {
      const tilt = 0.25 + next() * 0.5;
      const angle = next() * Math.PI * 2;
      const nx = Math.cos(angle) * tilt;
      const ny = Math.sin(angle) * tilt;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      for (let y = cy; y < cy + cell; y += 1) {
        for (let x = cx; x < cx + cell; x += 1) {
          const i = (y * size + x) * 4;
          data[i] = Math.round((nx * 0.5 + 0.5) * 255);
          data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
          data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
          data[i + 3] = 255;
        }
      }
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Shell UVs are in metres: one tile every 6 cm keeps the flake sub-millimetre.
  texture.repeat.set(1 / 0.06, 1 / 0.06);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

/**
 * 2×2 twill carbon weave: tows alternate direction every two cells, each
 * shaded across its width so the weave catches the light like the real
 * thing under lacquer.
 */
function carbonTexture(): THREE.Texture {
  const size = 256;
  const cells = 16;
  const step = size / cells;
  const texture = canvasTexture(size, size, (ctx) => {
    for (let j = 0; j < cells; j += 1) {
      for (let i = 0; i < cells; i += 1) {
        const horizontal = (i + j) % 4 < 2;
        const x = i * step;
        const y = j * step;
        const gradient = horizontal
          ? ctx.createLinearGradient(x, y, x, y + step)
          : ctx.createLinearGradient(x, y, x + step, y);
        gradient.addColorStop(0, "#101114");
        gradient.addColorStop(0.45, horizontal ? "#34363c" : "#2a2c31");
        gradient.addColorStop(1, "#0d0e10");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, step, step);
      }
    }
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.repeat.set(3, 3);
  return texture;
}

/** Fine directional streaks for brushed aluminium, as a roughness map. */
function brushedTexture(): THREE.Texture {
  const width = 256;
  const height = 64;
  const next = random(0xb125);
  const texture = canvasTexture(width, height, (ctx) => {
    ctx.fillStyle = "rgb(214,214,214)";
    ctx.fillRect(0, 0, width, height);
    for (let k = 0; k < 420; k += 1) {
      const y = next() * height;
      const shade = Math.round(170 + next() * 85);
      ctx.strokeStyle = `rgba(${shade},${shade},${shade},0.55)`;
      ctx.lineWidth = 0.5 + next();
      ctx.beginPath();
      ctx.moveTo(next() * -40, y);
      ctx.lineTo(width + next() * 40, y + (next() - 0.5) * 0.6);
      ctx.stroke();
    }
  });
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

const FACTORIES: Record<TextureName, () => THREE.Texture> = {
  flake: flakeTexture,
  carbon: carbonTexture,
  brushed: brushedTexture,
};

/**
 * Take a reference to a shared texture, creating it on first use. Returns
 * null on the server, where there is no canvas to draw into.
 */
export function retainTexture(name: TextureName): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  let texture = cache.get(name);
  if (!texture) {
    texture = FACTORIES[name]();
    cache.set(name, texture);
  }
  refs.set(name, (refs.get(name) ?? 0) + 1);
  return texture;
}

/** Give a reference back; the GPU copy is freed when nobody holds one. */
export function releaseTexture(name: TextureName): void {
  const count = (refs.get(name) ?? 0) - 1;
  if (count > 0) {
    refs.set(name, count);
    return;
  }
  refs.delete(name);
  cache.get(name)?.dispose();
}
