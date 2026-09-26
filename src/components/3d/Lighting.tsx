"use client";

import { ContactShadows, Environment } from "@react-three/drei";

/**
 * Cinematic three-point lighting plus an environment map.
 *
 * The environment map is what makes metallic paint read as metal at all — a
 * PBR metal with nothing to reflect renders nearly black. `studio` is a drei
 * preset bundled with the library, so there is no runtime fetch to a CDN.
 */
export function Lighting({ lowDetail = false }: { lowDetail?: boolean }) {
  return (
    <>
      {/* Key: high and slightly forward, warm. */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={2.4}
        color="#fff6e3"
        castShadow={!lowDetail}
        shadow-mapSize={lowDetail ? 512 : 1024}
        shadow-bias={-0.0005}
      />
      {/* Rim: behind and opposite, cool, to separate the car from the ground. */}
      <directionalLight position={[-6, 4, -7]} intensity={1.5} color="#b9ccd6" />
      {/* Fill: low and soft, so shadow sides are not pure black. */}
      <directionalLight position={[0, 2, 8]} intensity={0.55} color="#c8a34a" />
      <ambientLight intensity={0.22} />

      <Environment preset="studio" environmentIntensity={0.55} />

      {/* Grounds the car. Without it the model appears to float. */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.55}
        scale={14}
        blur={2.4}
        far={4}
        resolution={lowDetail ? 256 : 512}
        color="#000000"
      />
    </>
  );
}
