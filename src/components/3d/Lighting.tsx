"use client";

import {
  ContactShadows,
  Environment,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";

/**
 * Studio lighting, built in the scene rather than downloaded.
 *
 * Car paint is judged by what it reflects: a metallic finish with nothing to
 * mirror renders nearly black. The environment here is a set of soft light
 * panels (drei Lightformers) rendered once into a cube map — long overhead
 * strips for the highlights that run down a bonnet and roof, side strips for
 * the shoulder line, and a warm ring for a single point of sparkle.
 *
 * Nothing is fetched. The previous `preset="studio"` pulled an HDR file from
 * a third-party CDN at runtime, and when that request failed the error took
 * the whole car page down with it.
 */
export function Lighting({ lowDetail = false }: { lowDetail?: boolean }) {
  return (
    <>
      <ambientLight intensity={0.12} />
      {/* Key: high and forward, warm. The only shadow caster. */}
      <directionalLight
        position={[4.5, 8, 5.5]}
        intensity={1.5}
        color="#fff3df"
        castShadow={!lowDetail}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      {/* Rim: behind and opposite, cool, to lift the silhouette off the ground. */}
      <directionalLight position={[-6, 3.5, -7]} intensity={0.7} color="#bccfe0" />

      <Environment
        resolution={lowDetail ? 128 : 256}
        frames={1}
        environmentIntensity={0.95}
      >
        <color attach="background" args={["#040406"]} />
        {/* Overhead softboxes. */}
        <Lightformer
          form="rect"
          intensity={2.4}
          position={[0, 6, 0]}
          rotation-x={Math.PI / 2}
          scale={[14, 1.8, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.3}
          position={[0, 6, -4.5]}
          rotation-x={Math.PI / 2}
          scale={[14, 0.9, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.3}
          position={[0, 6, 4.5]}
          rotation-x={Math.PI / 2}
          scale={[14, 0.9, 1]}
        />
        {/* Side strips, low, for the long reflection along the flanks. */}
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[-10, 1.4, 0]}
          rotation-y={Math.PI / 2}
          scale={[24, 0.7, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[10, 1.4, 0]}
          rotation-y={-Math.PI / 2}
          scale={[24, 0.7, 1]}
        />
        {/* Warm ring: one point of sparkle, in the brand's gold. */}
        <Lightformer
          form="ring"
          color="#f2d6a0"
          intensity={4}
          scale={2.4}
          position={[7, 4, 8]}
          target={[0, 0, 0]}
        />
        {/* Cool back panel. */}
        <Lightformer
          form="rect"
          color="#d4e2ff"
          intensity={1.2}
          position={[0, 3, -11]}
          scale={[10, 3, 1]}
          target={[0, 0, 0]}
        />
      </Environment>
    </>
  );
}

/**
 * Showroom floor: a softly reflective ground plus contact shadows, which are
 * what stop the car looking as if it floats. The reflection renders the scene
 * a second time, so small devices get a plain matte floor instead.
 */
export function StudioFloor({
  lowDetail = false,
  size = 60,
}: {
  lowDetail?: boolean;
  size?: number;
}) {
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        {lowDetail ? (
          <meshStandardMaterial color="#08080b" roughness={0.92} metalness={0.1} />
        ) : (
          <MeshReflectorMaterial
            blur={[320, 90]}
            resolution={1024}
            mixBlur={1}
            mixStrength={18}
            mixContrast={1}
            roughness={0.85}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.3}
            color="#09090c"
            metalness={0.5}
            mirror={0.35}
          />
        )}
      </mesh>
      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={0.75}
        scale={13}
        blur={2.2}
        far={3}
        resolution={lowDetail ? 256 : 512}
        color="#000000"
      />
    </group>
  );
}
