"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { BLUEPRINT_INTRO, blueprintLook, type BlueprintOverlay } from "@/lib/blueprint";
import { VOID } from "@/lib/viewer-colors";
import { QUALITY_PROFILES } from "@/lib/viewer-quality";
import { Lighting, StudioFloor } from "./Lighting";
import { ProceduralCar, type BlueprintState, type CarMotion } from "./ProceduralCar";
import { useCarLayout } from "./layout-cache";
import { blueprintShots } from "./tour-cameras";
import { Director, Road, type TourProgress } from "./StageDirector";
import { BlueprintLabels, BlueprintRig } from "./BlueprintScene";

/**
 * The 3D stage behind the blueprint (the anatomy tour, taken apart). The page
 * writes the scroll position into `progressRef`; the Director (shared with
 * the home page story) turns it into camera moves and the rig into each
 * group's separation, so scrolling never causes a React render. Only the
 * focus card, which changes a dozen times over the section, is state.
 *
 * Rendering is on demand: a scroll asks for a frame, and the Director keeps
 * asking until the camera has caught up. Reading a card with the page still
 * costs nothing. The layout — and through it the car's geometry — is the one
 * the interactive viewer further down the page uses.
 */

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** A frame for every scroll event; the Director takes it from there. */
function ScrollFrames() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [invalidate]);
  return null;
}

/** Calls back after the first frame has really been drawn (not on creation). */
function FirstFrame({ onFrame }: { onFrame?: () => void }) {
  const frames = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate]);
  useFrame(() => {
    if (frames.current > 1) return;
    frames.current += 1;
    if (frames.current === 2) onFrame?.();
    else invalidate();
  });
  return null;
}

/** Leaving the "never" loop: draw once so the frame is current. */
function Wake({ running }: { running: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (running) invalidate();
  }, [running, invalidate]);
  return null;
}

export function ShowcaseStage({
  build,
  groups,
  progressRef,
  focus,
  overlay,
  reducedMotion,
  lowDetail,
  running,
  onReady,
}: {
  build: CarBuild;
  /** The groups the blueprint takes apart, in order (blueprintGroups). */
  groups: readonly ViewerGroup[];
  /** Written by the page on scroll; read here every frame. */
  progressRef: RefObject<TourProgress>;
  /** The card whose subject is on screen (focusCardAt). */
  focus: number;
  /** DOM labels the scene positions every frame. */
  overlay: BlueprintOverlay;
  reducedMotion: boolean;
  lowDetail: boolean;
  /** False when off screen or another scene holds the render slot. */
  running: boolean;
  /** The first frame has been drawn. */
  onReady?: () => void;
}) {
  const layout = useCarLayout(build);
  const shots = useMemo(() => blueprintShots(layout, groups), [layout, groups]);
  const motionRef = useRef<CarMotion>({ distance: 0 });
  const shownRef = useRef<number>(0);
  const roadRef = useRef<number>(1);
  const floorRef = useRef<THREE.Group>(null);
  const blueprintRef = useRef<BlueprintState>({
    drawing: 0,
    explode: {},
    labels: new Map(),
  });
  const dimensions = useMemo(
    () => ({
      length_mm: build.length_mm,
      width_mm: build.width_mm,
      height_mm: build.height_mm,
      wheelbase_mm: build.wheelbase_mm,
      ground_clearance_mm: build.ground_clearance_mm,
    }),
    [build],
  );

  const look = blueprintLook(focus, groups);
  // The line work is built the first time the drawing is asked for, not on
  // mount: a visitor who never scrolls this far never pays for it.
  const [lineWork, setLineWork] = useState(false);
  if (focus >= BLUEPRINT_INTRO && !lineWork) setLineWork(true);

  // The car rolls forward from the opening shot to the drawing, then stands.
  const drive = (beat: number) => 11 * smoothstep(beat);

  return (
    <Canvas
      frameloop={running ? "demand" : "never"}
      dpr={lowDetail ? QUALITY_PROFILES.low.dpr : QUALITY_PROFILES.medium.dpr}
      shadows={lowDetail ? false : "percentage"}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{
        position: shots[0]?.position.toArray() ?? [5, 1.5, 6],
        fov: 32,
        near: 0.05,
        far: 140,
      }}
      aria-hidden="true"
      // The canvas is scenery for the text beside it. It must never swallow
      // the scroll that drives it.
      style={{ pointerEvents: "none" }}
    >
      <color attach="background" args={[VOID]} />
      <fog attach="fog" args={[VOID, 11, 32]} />

      <Lighting lowDetail={lowDetail} />
      {/* The contact shadow is captured once, for the assembled car on the
          showroom floor; by the time the car comes apart the blueprint's
          sheet has covered the floor. */}
      <group ref={floorRef}>
        <StudioFloor lowDetail={lowDetail} contactFrames={1} />
      </group>
      <Road layout={layout} motionRef={motionRef} visibilityRef={roadRef} />

      {/* Order matters: useFrame runs in mount order. The Director moves the
          camera and eases the beat, the rig turns the beat into separation,
          the car applies it, and the labels project the result. */}
      <Director
        shots={shots}
        progressRef={progressRef}
        shownRef={shownRef}
        motionRef={motionRef}
        reducedMotion={reducedMotion}
        drive={drive}
        phoneLift={false}
      />
      <BlueprintRig
        layout={layout}
        groups={groups}
        dimensions={dimensions}
        shownRef={shownRef}
        state={blueprintRef}
        roadRef={roadRef}
        floorRef={floorRef}
      />

      <ProceduralCar
        layout={layout}
        ghost={look.ghost}
        highlightGroup={look.highlight}
        restDim={look.restDim}
        restEdge={look.restEdge}
        shellEdge={look.shellEdge}
        blueprint={blueprintRef}
        lineWork={lineWork}
        lowDetail={lowDetail}
        surfaceDetail={!lowDetail}
        reducedMotion={reducedMotion}
        motion={motionRef}
      />

      <BlueprintLabels
        layout={layout}
        groups={groups}
        dimensions={dimensions}
        shownRef={shownRef}
        state={blueprintRef}
        overlay={overlay}
      />
      <ScrollFrames />
      <Wake running={running} />
      <FirstFrame onFrame={onReady} />
    </Canvas>
  );
}
