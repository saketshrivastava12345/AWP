"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type * as THREE from "three";
import type { CarBuild } from "@/lib/car-build";
import type { TourStop } from "@/lib/anatomy-tour";
import { Lighting, StudioFloor } from "./Lighting";
import { ProceduralCar, useCarLayout, type CarMotion } from "./ProceduralCar";
import { tourShots } from "./tour-cameras";
import { Director, Road, type TourProgress } from "./StageDirector";

/**
 * The 3D stage behind the anatomy tour. The page writes the scroll position
 * into `progressRef`; the Director (shared with the home page story) turns it
 * into camera moves every frame, so scrolling never causes a React render.
 * Only the stop index, which changes a handful of times per page, is state.
 */

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** A label pinned to a point inside the car, visible while its stop is. */
function Callout({
  position,
  text,
  index,
  shownRef,
}: {
  position: THREE.Vector3;
  text: string;
  index: number;
  shownRef: RefObject<number>;
}) {
  const element = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const distance = Math.abs((shownRef.current ?? 0) - index);
    if (element.current)
      element.current.style.opacity = String(Math.max(0, 1 - distance * 3.2));
  });
  return (
    <Html position={position} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div
        ref={element}
        className="flex -translate-y-1/2 items-center gap-2 whitespace-nowrap opacity-0"
        aria-hidden="true"
      >
        <span className="relative block size-2.5 rounded-full border border-gold-300 bg-gold-500/40">
          <span className="absolute inset-0 animate-ping rounded-full bg-gold-400/40" />
        </span>
        <span className="h-px w-8 bg-gold-500/70" />
        <span className="border border-gold-700/60 bg-void/80 px-2 py-1 font-mono text-[10px] tracking-[0.12em] text-gold-200 uppercase backdrop-blur-sm">
          {text}
        </span>
      </div>
    </Html>
  );
}

export function ShowcaseStage({
  build,
  stops,
  progressRef,
  active,
  reducedMotion,
  lowDetail,
  running,
  onReady,
}: {
  build: CarBuild;
  stops: TourStop[];
  /** Written by the page on scroll; read here every frame. */
  progressRef: RefObject<TourProgress>;
  /** Index of the stop in view (0 = opening shot). */
  active: number;
  reducedMotion: boolean;
  lowDetail: boolean;
  /** False when the tour is off-screen — stops the render loop entirely. */
  running: boolean;
  onReady?: () => void;
}) {
  const layout = useCarLayout(build);
  const shots = useMemo(() => tourShots(layout, stops), [layout, stops]);
  const motionRef = useRef<CarMotion>({ distance: 0 });
  const shownRef = useRef<number>(0);

  const shot = shots[Math.min(shots.length - 1, Math.max(0, active))] ?? shots[0];
  const stop = active > 0 ? stops[active - 1] : undefined;

  // Scrolling from the opening shot to the first stop rolls the car forward;
  // scrolling into the finale floors it.
  const drive = (beat: number) => {
    const launch = Math.max(0, beat - (shots.length - 2));
    return 11 * smoothstep(beat) + 34 * launch * launch;
  };

  return (
    <Canvas
      frameloop={running ? "always" : "never"}
      dpr={lowDetail ? [1, 1.5] : [1, 1.75]}
      shadows={!lowDetail}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        position: shots[0]?.position.toArray() ?? [5, 1.5, 6],
        fov: 32,
        near: 0.05,
        far: 140,
      }}
      onCreated={() => onReady?.()}
      aria-hidden="true"
      // The canvas is scenery for the text beside it. It must never swallow
      // the scroll that drives it.
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 11, 32]} />

      <Lighting lowDetail={lowDetail} />
      <StudioFloor lowDetail={lowDetail} />
      <Road layout={layout} motionRef={motionRef} />

      <ProceduralCar
        layout={layout}
        ghost={shot?.ghost ?? 0}
        highlightGroup={shot?.highlight ?? null}
        lowDetail={lowDetail}
        reducedMotion={reducedMotion}
        motion={motionRef}
      />

      {stop?.callouts.map((callout) => (
        <Callout
          key={`${stop.id}-${callout.anchor}`}
          position={layout.anchors[callout.anchor]}
          text={callout.text}
          index={active}
          shownRef={shownRef}
        />
      ))}

      <Director
        shots={shots}
        progressRef={progressRef}
        shownRef={shownRef}
        motionRef={motionRef}
        reducedMotion={reducedMotion}
        drive={drive}
      />
    </Canvas>
  );
}
