"use client";

import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads a GLB registered in `car_media` and frames it consistently.
 *
 * Real models arrive at arbitrary scale and origin, so the model is measured
 * and normalised: scaled so its longest axis matches the car's real length,
 * then shifted so it sits on the ground plane and is centred horizontally.
 * Without that, one model floats and the next fills the screen.
 *
 * This component deliberately does not catch its own errors. `useGLTF`
 * suspends and throws on failure, which is exactly what ViewerErrorBoundary
 * upstream is there to catch — that is how the procedural fallback is
 * triggered.
 */
export function GLBCar({
  url,
  targetLength = 4.5,
  xray = false,
}: {
  url: string;
  targetLength?: number;
  xray?: boolean;
}) {
  const { scene } = useGLTF(url);

  // Clone so two viewers of the same model cannot mutate each other's scene.
  const model = useMemo(() => scene.clone(true), [scene]);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());

    const longest = Math.max(size.x, size.y, size.z);
    const factor = longest > 0 ? targetLength / longest : 1;

    return {
      scale: factor,
      offset: new THREE.Vector3(
        -centre.x * factor,
        -box.min.y * factor,
        -centre.z * factor,
      ),
    };
  }, [model, targetLength]);

  useEffect(() => {
    if (!xray) return;
    // Engineering Mode: swap to a wireframe look without destroying the
    // originals, so leaving the mode restores the real materials.
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originals.set(child, child.material);
        child.material = new THREE.MeshBasicMaterial({
          color: "#8fb3bf",
          wireframe: true,
          transparent: true,
          opacity: 0.5,
        });
      }
    });
    return () => {
      for (const [mesh, material] of originals) mesh.material = material;
    };
  }, [model, xray]);

  useEffect(() => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [model]);

  return (
    <group name="glb-car" position={offset.toArray()} scale={scale}>
      <primitive object={model} />
    </group>
  );
}
