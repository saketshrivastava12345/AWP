"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import { useMemo, useRef, type RefObject } from "react";
import type * as THREE from "three";
import { GENERIC_BUILD } from "@/lib/car-build";
import { Lighting, StudioFloor } from "./Lighting";
import { ProceduralCar, useCarLayout, type CarMotion } from "./ProceduralCar";
import { Director, Road, type TourProgress } from "./StageDirector";
import { storyShots, type StoryShotId } from "./tour-cameras";

/**
 * The home page story scene.
 *
 * A generic coupé: the story is about the anatomy of a car in general, not
 * about any one model in the catalogue. The page writes the scroll position
 * into `progressRef`, and the Director shared with the car pages turns it into
 * camera moves — the same layout-derived framing, the same ghosting of the
 * bodywork when a beat looks inside it. The finale pulls the car apart into
 * its subsystems.
 */

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

/** The car rolls forward steadily while the story is scrolled. */
const drive = (beat: number) => beat * 4.5;

export function HeroScene({
  beats,
  progressRef,
  active,
  running,
  lowDetail = false,
}: {
  /** The story's beats, in order. Must be a stable array. */
  beats: readonly StoryShotId[];
  /** Written by the page on scroll; read here every frame. */
  progressRef: RefObject<TourProgress>;
  /** Index of the beat in view. */
  active: number;
  /** False when the story is off-screen — stops the render loop entirely. */
  running: boolean;
  lowDetail?: boolean;
}) {
  const layout = useCarLayout(GENERIC_BUILD);
  const shots = useMemo(() => storyShots(layout, beats), [layout, beats]);
  const motionRef = useRef<CarMotion>({ distance: 0 });
  const shownRef = useRef<number>(0);

  const shot = shots[Math.min(shots.length - 1, Math.max(0, active))];
  const exploded = beats[active] === "whole";

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={lowDetail ? [1, 1.5] : [1, 1.75]}
      shadows={!lowDetail}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        position: shots[0]?.position.toArray() ?? [6.4, 1.8, 7],
        fov: 32,
        near: 0.05,
        far: 140,
      }}
      aria-hidden="true"
      // No OrbitControls here: the scroll position owns the camera. The canvas
      // is scenery and must never swallow the scroll that drives it.
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 12, 34]} />

      <Lighting lowDetail={lowDetail} />
      <StudioFloor lowDetail={lowDetail} />
      <Road layout={layout} motionRef={motionRef} />
      <Particles count={lowDetail ? 70 : 180} />

      <ProceduralCar
        layout={layout}
        explode={exploded ? 1 : 0}
        ghost={exploded ? 0 : (shot?.ghost ?? 0)}
        highlightGroup={shot?.highlight ?? null}
        lowDetail={lowDetail}
        motion={motionRef}
      />

      <Director
        shots={shots}
        progressRef={progressRef}
        shownRef={shownRef}
        motionRef={motionRef}
        reducedMotion={false}
        drive={drive}
      />
    </Canvas>
  );
}
