"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Lighting } from "./Lighting";
import { ProceduralCar } from "./ProceduralCar";
import type { CameraState } from "./HeroStory";

/**
 * The home page hero scene.
 *
 * Reads its camera from a ref that GSAP mutates, and applies it inside
 * `useFrame` — so the scroll sequence drives the camera without a single React
 * re-render.
 */

/** Follows the externally-tweened camera state. */
function CameraFollower({ cameraRef }: { cameraRef: RefObject<CameraState> }) {
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const state = cameraRef.current;
    if (!state) return;
    camera.position.set(state.position[0], state.position[1], state.position[2]);
    lookAt.set(state.target[0], state.target[1], state.target[2]);
    camera.lookAt(lookAt);
  });

  return null;
}

/**
 * Drifting particles. Only on the home hero, per the brief — they would be
 * noise on a detail page where the car is the subject.
 */
function Particles({ count = 180 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    // Deterministic rather than Math.random(): a pure render must produce the
    // same output every time, and a stable field also means the particles do
    // not visibly rearrange if the component ever re-renders.
    const pseudoRandom = (seed: number): number => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };

    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = (pseudoRandom(index * 3) - 0.5) * 26;
      array[index * 3 + 1] = pseudoRandom(index * 3 + 1) * 9 - 1;
      array[index * 3 + 2] = (pseudoRandom(index * 3 + 2) - 0.5) * 26;
    }
    return array;
  }, [count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.012;
  });

  return (
    <Points ref={ref} positions={positions} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c8a34a"
        size={0.035}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
      />
    </Points>
  );
}

export function HeroScene({
  cameraRef,
  lowDetail = false,
}: {
  cameraRef: RefObject<CameraState>;
  lowDetail?: boolean;
}) {
  return (
    <Canvas
      dpr={lowDetail ? [1, 1.5] : [1, 2]}
      shadows={!lowDetail}
      gl={{ antialias: !lowDetail, powerPreference: "high-performance" }}
      camera={{ position: [6.4, 1.8, 7], fov: 38, near: 0.1, far: 120 }}
      // No OrbitControls here: the scroll position owns the camera, and giving
      // the visitor a second way to move it would fight the pinned sequence.
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 12, 34]} />

      <Lighting lowDetail={lowDetail} />
      <Particles count={lowDetail ? 70 : 180} />

      {/* A generic coupé: the hero is about the anatomy of a car in general,
          not about any one model in the catalogue. */}
      <ProceduralCar bodyType="coupe" powertrain="combustion" lowDetail={lowDetail} />

      <CameraFollower cameraRef={cameraRef} />
    </Canvas>
  );
}
