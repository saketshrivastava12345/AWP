"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import {
  DRACOLoader,
  GLTFLoader,
  KTX2Loader,
  MeshoptDecoder,
  type GLTF,
} from "three-stdlib";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { BASIS_PATH, DRACO_PATH } from "@/lib/viewer-assets";
import { applySurface, blendSurface, type PaintSurface } from "./car-materials";

/**
 * The GLB pipeline: load, decode, normalise, paint, dispose.
 *
 * Decoders are self-hosted — Draco geometry from /draco/gltf/, KTX2/Basis
 * textures transcoded from /basis/, meshopt built in — so nothing is fetched
 * from a third-party CDN at runtime. The loader cache is the same one drei's
 * `useGLTF` uses, so `useGLTF.preload`/`clear` work on these models too.
 *
 * Conventions a model must follow (documented for whoever uploads one):
 *   - glTF 2.0 (.glb or .gltf), +Y up, the car facing +Z. A model whose
 *     length lies along X is assumed to face +X and is turned to +Z; one that
 *     is taller than it is long is assumed to be Z-up and stood upright.
 *   - Scale and origin do not matter: the model is measured from its real
 *     meshes (ground and shadow planes are ignored and hidden) and scaled so
 *     its length matches the variant's published length.
 *   - Paint: materials whose name contains "body", "paint" or "carpaint"
 *     (any case; e.g. "Body", "CarPaint", "car_paint_red") take the
 *     configurator's paint. Nothing else on the model is recoloured, and
 *     wheels and calipers are left exactly as modelled.
 */

let draco: DRACOLoader | null = null;
let ktx2: KTX2Loader | null = null;
let ktx2Users = 0;

function dracoLoader(): DRACOLoader {
  if (!draco) {
    draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
  }
  return draco;
}

function ktx2Loader(gl: THREE.WebGLRenderer): KTX2Loader {
  if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(BASIS_PATH);
  // Which compressed formats the GPU takes decides what Basis transcodes to.
  ktx2.detectSupport(gl);
  return ktx2;
}

function loaderExtensions(gl: THREE.WebGLRenderer) {
  return (loader: GLTFLoader) => {
    loader.setDRACOLoader(dracoLoader());
    loader.setKTX2Loader(ktx2Loader(gl));
    loader.setMeshoptDecoder(
      typeof MeshoptDecoder === "function" ? MeshoptDecoder() : MeshoptDecoder,
    );
  };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const GROUND_NAME = /shadow|ground|floor|backdrop|plane|base_?plate/i;
const PAINT_NAME = /body|paint/i;

const box = new THREE.Box3();
const meshBox = new THREE.Box3();

function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
  });
  return meshes;
}

/** World-space bounds of the given meshes (after `root.updateMatrixWorld`). */
function boundsOf(meshes: THREE.Mesh[], out: THREE.Box3): THREE.Box3 {
  out.makeEmpty();
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) continue;
    meshBox.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    out.union(meshBox);
  }
  return out;
}

/**
 * The meshes that make up the car itself: not a ground plane, a baked shadow
 * card or a backdrop, which would otherwise stretch the measured bounds.
 */
function carMeshes(root: THREE.Object3D): { body: THREE.Mesh[]; ground: THREE.Mesh[] } {
  root.updateMatrixWorld(true);
  const meshes = meshesOf(root);
  const all = boundsOf(meshes, new THREE.Box3());
  const allSize = all.getSize(new THREE.Vector3());
  const span = Math.max(allSize.x, allSize.z, 1e-6);
  const body: THREE.Mesh[] = [];
  const ground: THREE.Mesh[] = [];
  for (const mesh of meshes) {
    const own = boundsOf([mesh], new THREE.Box3()).getSize(new THREE.Vector3());
    const flat = own.y < span * 0.01;
    const wide = Math.max(own.x, own.z) > span * 0.85;
    const named =
      GROUND_NAME.test(mesh.name) || GROUND_NAME.test(mesh.parent?.name ?? "");
    if ((flat && wide) || (flat && named)) ground.push(mesh);
    else body.push(mesh);
  }
  return body.length > 0 ? { body, ground } : { body: meshes, ground: [] };
}

export type PreparedModel = {
  root: THREE.Group;
  /** Materials cloned for painting (owned here, disposed with the model). */
  paintMaterials: THREE.MeshPhysicalMaterial[];
  /** Meshes big and opaque enough to be worth a place in the shadow pass. */
  shadowCasters: THREE.Mesh[];
  dispose(): void;
};

/** Clone, orient, measure, scale and seat a loaded scene. */
export function prepareModel(scene: THREE.Object3D, length: number): PreparedModel {
  // SkeletonUtils.clone keeps skinned meshes bound to their own bones, which
  // a plain clone(true) does not.
  const model = cloneSkinned(scene);
  const orient = new THREE.Group();
  orient.add(model);

  const { body, ground } = carMeshes(orient);
  for (const mesh of ground) mesh.visible = false;

  // Orientation: stand a Z-up model upright, and turn a model built along X
  // to face +Z.
  orient.updateMatrixWorld(true);
  let size = boundsOf(body, box).getSize(new THREE.Vector3());
  if (size.y > Math.max(size.x, size.z) * 1.05) {
    orient.rotation.x = -Math.PI / 2;
    orient.updateMatrixWorld(true);
    size = boundsOf(body, box).getSize(new THREE.Vector3());
  }
  if (size.x > size.z * 1.1) {
    orient.rotation.y = -Math.PI / 2;
    orient.updateMatrixWorld(true);
  }

  const bounds = boundsOf(body, box).clone();
  const measured = bounds.getSize(new THREE.Vector3());
  const factor = measured.z > 0 ? length / measured.z : 1;
  const centre = bounds.getCenter(new THREE.Vector3());

  const root = new THREE.Group();
  root.name = "glb-car";
  root.add(orient);
  orient.position.set(-centre.x, -bounds.min.y, -centre.z);
  root.scale.setScalar(factor);

  // Shadows only from meshes big enough to cast a visible one, and never
  // from glass: hundreds of tiny bolts in the shadow pass cost frames for
  // nothing.
  const threshold = length * 0.02;
  const paintMaterials: THREE.MeshPhysicalMaterial[] = [];
  const shadowCasters: THREE.Mesh[] = [];
  const painted = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
  for (const mesh of body) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const transparent = materials.some(
      (material) => material.transparent && material.opacity < 0.9,
    );
    const diagonal =
      boundsOf([mesh], meshBox).getSize(new THREE.Vector3()).length() * factor;
    if (!transparent && diagonal > threshold) shadowCasters.push(mesh);
    mesh.castShadow = false;
    mesh.receiveShadow = !transparent;

    // Paintable materials are cloned (the originals stay in the loader
    // cache untouched) and upgraded to a clear-coated physical material.
    const replaced = materials.map((material) => {
      if (!PAINT_NAME.test(material.name)) return material;
      if (!(material instanceof THREE.MeshStandardMaterial)) return material;
      let paint = painted.get(material);
      if (!paint) {
        paint = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(paint, material);
        paint.defines = { STANDARD: "", PHYSICAL: "" };
        paint.name = material.name;
        paint.clearcoat = 1;
        paint.clearcoatRoughness = 0.04;
        painted.set(material, paint);
        paintMaterials.push(paint);
      }
      return paint;
    });
    mesh.material = Array.isArray(mesh.material)
      ? replaced
      : (replaced[0] ?? mesh.material);
  }

  return {
    root,
    paintMaterials,
    shadowCasters,
    dispose() {
      for (const material of paintMaterials) material.dispose();
      // Free this renderer's copies of the shared geometry and textures; the
      // cached model can still be drawn again (three re-uploads on use).
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value instanceof THREE.Texture) value.dispose();
          }
        }
      });
    },
  };
}

/** Shadows on or off for the meshes worth casting them (a quality setting). */
export function setShadowCasting(model: PreparedModel, on: boolean): void {
  for (const mesh of model.shadowCasters) mesh.castShadow = on;
}

// ---------------------------------------------------------------------------
// Cache lifetime
// ---------------------------------------------------------------------------

const users = new Map<string, number>();

/**
 * Keep a model in the loader cache while any viewer shows it, and drop it a
 * few seconds after the last one goes — long enough that a development
 * double-mount, or a quick scroll away and back, reuses it.
 */
function holdModel(url: string): () => void {
  users.set(url, (users.get(url) ?? 0) + 1);
  ktx2Users += 1;
  return () => {
    users.set(url, (users.get(url) ?? 1) - 1);
    ktx2Users -= 1;
    window.setTimeout(() => {
      if ((users.get(url) ?? 0) <= 0) {
        users.delete(url);
        useGLTF.clear(url);
      }
      if (ktx2Users <= 0 && ktx2) {
        ktx2.dispose();
        ktx2 = null;
      }
    }, 5000);
  };
}

/** Forget a failed model, so a retry fetches it again instead of rethrowing. */
export function forgetModel(url: string): void {
  useGLTF.clear(url);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export type ModelLoadInfo = {
  /** The model has materials the configurator's paint applies to. */
  paintable: boolean;
};

export function VehicleModel({
  url,
  length,
  paint,
  castShadows,
  reducedMotion,
  onProgress,
  onLoaded,
  rootRef,
}: {
  url: string;
  /** Published length, metres: the model is scaled to it. */
  length: number;
  paint: PaintSurface;
  castShadows: boolean;
  reducedMotion: boolean;
  /** Download progress of the file, 0–1 (null when the size is unknown). */
  onProgress?: (fraction: number | null) => void;
  onLoaded?: (info: ModelLoadInfo) => void;
  rootRef?: RefObject<THREE.Group | null>;
}) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const extensions = useMemo(() => loaderExtensions(gl), [gl]);

  const progress = useRef(onProgress);
  useLayoutEffect(() => {
    progress.current = onProgress;
  }, [onProgress]);

  // Suspends while loading; throws on failure, which is what the error
  // boundary around this component is for.
  const gltf = useLoader(GLTFLoader, url, extensions, (event: ProgressEvent) => {
    progress.current?.(
      event.lengthComputable && event.total > 0 ? event.loaded / event.total : null,
    );
  }) as GLTF;

  const prepared = useMemo(() => prepareModel(gltf.scene, length), [gltf.scene, length]);
  useEffect(() => () => prepared.dispose(), [prepared]);
  useEffect(() => holdModel(url), [url]);

  useEffect(() => {
    setShadowCasting(prepared, castShadows);
    invalidate();
  }, [prepared, castShadows, invalidate]);

  const loaded = useRef(onLoaded);
  useLayoutEffect(() => {
    loaded.current = onLoaded;
  }, [onLoaded]);
  useEffect(() => {
    loaded.current?.({ paintable: prepared.paintMaterials.length > 0 });
    invalidate();
  }, [prepared, invalidate]);

  // Paint, eased like the procedural car's.
  const shown = useRef<PaintSurface | null>(null);
  useEffect(() => {
    const materials = prepared.paintMaterials;
    if (materials.length === 0) return;
    const from = shown.current;
    shown.current = paint;
    if (!from || reducedMotion) {
      for (const material of materials) applySurface(material, paint);
      invalidate();
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / 600);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      for (const material of materials) blendSurface(material, from, paint, eased);
      invalidate();
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [prepared, paint, reducedMotion, invalidate]);

  return <primitive ref={rootRef} object={prepared.root} />;
}
