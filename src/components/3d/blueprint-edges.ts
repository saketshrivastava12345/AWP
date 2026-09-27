import * as THREE from "three";
import { GOLD, VIEWER_COLORS } from "@/lib/viewer-colors";

/**
 * Line work for the blueprint: the creases and silhouettes of each part,
 * drawn as hairlines the way a technical illustration outlines a component.
 *
 * `EdgesGeometry` keeps only edges where the surface turns by more than the
 * threshold, so a lathed tyre or a cylinder shows its profile and its caps
 * rather than every facet. The edges of one subsystem are merged into a
 * single buffer: one draw call per group.
 */

/** Degrees the surface must turn across an edge for it to be drawn. */
const THRESHOLD = 30;

/** Ink hairline for parts that are not the subject (--color-ink-400). */
export const EDGE_INK = new THREE.Color("#8a8a96");
/** Gold hairline for the part being taken off (--color-gold-500). */
export const EDGE_GOLD = new THREE.Color(GOLD);
/** The warmest line, for the subject at full strength (--color-gold-300). */
export const EDGE_GOLD_LIGHT = new THREE.Color(VIEWER_COLORS.goldLight);

/** One merged line-segment buffer from the hard edges of several meshes. */
export function mergedEdges(
  geometries: readonly THREE.BufferGeometry[],
  threshold = THRESHOLD,
): THREE.BufferGeometry {
  const chunks: Float32Array[] = [];
  let total = 0;
  for (const geometry of geometries) {
    const edges = new THREE.EdgesGeometry(geometry, threshold);
    const attribute = edges.getAttribute("position");
    const array = new Float32Array(attribute.array.length);
    array.set(attribute.array as ArrayLike<number>);
    chunks.push(array);
    total += array.length;
    edges.dispose();
  }
  const positions = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    positions.set(chunk, offset);
    offset += chunk.length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.computeBoundingSphere();
  return merged;
}

/** A hairline material for one subsystem's line work; starts invisible. */
export function edgeMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: EDGE_INK,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
}

const scratch = new THREE.Color();

/**
 * Set a hairline between ink (0) and gold (1). Returns true when anything
 * changed, so the caller knows whether a frame is needed.
 */
export function toneEdges(
  material: THREE.LineBasicMaterial,
  warmth: number,
  opacity: number | null,
): boolean {
  const w = Math.min(1, Math.max(0, warmth));
  scratch.copy(EDGE_INK).lerp(EDGE_GOLD, Math.min(1, w * 1.4));
  if (w > 0.7) scratch.lerp(EDGE_GOLD_LIGHT, (w - 0.7) / 0.3);
  let changed = false;
  if (!material.color.equals(scratch)) {
    material.color.copy(scratch);
    changed = true;
  }
  if (opacity !== null && Math.abs(material.opacity - opacity) > 1e-4) {
    material.opacity = opacity;
    changed = true;
  }
  // Nothing to draw: skip the object entirely rather than blend zeros.
  const visible = material.opacity > 0.002;
  if (material.visible !== visible) {
    material.visible = visible;
    changed = true;
  }
  return changed;
}
