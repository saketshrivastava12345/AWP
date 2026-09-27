"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PointMaterial, Points } from "@react-three/drei";
import * as THREE from "three";
import type { CarBuild } from "@/lib/car-build";
import type { QualityProfile } from "@/lib/viewer-quality";
import type { HeroBeatId } from "@/components/home/hero-beats";
import { SceneLighting, ViewerFloor } from "./CarLighting";
import { ProceduralCar, type CarMotion } from "./ProceduralCar";
import { useCarLayout } from "./layout-cache";
import type { CarLayout } from "./car-layout";
import { Road } from "./StageDirector";
import { cameraAt, shotFor, storyShots, type Shot } from "./tour-cameras";

/**
 * The home page's one WebGL scene: the hero and the scroll story share it.
 *
 * The car is the featured variant's procedural representation, laid out from
 * its published dimensions and drivetrain (useCarLayout), in the studio rig
 * the interactive viewer uses. The page writes the scroll position into
 * `progressRef` as a continuous beat (0 = the hero, 1 = the first story card,
 * …); this scene reads it every frame and flies the camera between shots
 * framed from the car's own layout — the anatomy tour's shots (tour-cameras.ts)
 * for the story, a wider low three-quarter view for the hero.
 *
 * Nothing here causes a React render while scrolling or while the pointer
 * moves: the camera, the parallax and the rolling road are set directly on
 * objects. Only the beat in view, which changes a handful of times per page,
 * is a prop.
 *
 * Rendering is on demand. At the hero a slow idle sway is drawn at ~30 fps;
 * a scroll or pointer move asks for frames until the camera settles; in the
 * story the scene is still between moves and costs nothing. Off screen, or
 * while another scene holds the page's render slot, the loop is "never".
 */

export type HeroProgress = { beat: number };

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** The opening frame: a low, wide front three-quarter with room for the headline. */
function heroShot(layout: CarLayout): Shot {
  const { spec } = layout;
  const k = spec.length / 4.5;
  return {
    position: v(6.7 * k, 0.9 + spec.height * 0.1, 5.9 * k),
    target: v(0, spec.height * 0.34, -0.2 * k),
    ghost: 0,
    highlight: null,
  };
}

/** The same shot from further along its line of sight. */
function pullBack(shot: Shot, factor: number): Shot {
  const position = shot.position
    .clone()
    .sub(shot.target)
    .multiplyScalar(factor)
    .add(shot.target);
  return { ...shot, position };
}

function beatShot(layout: CarLayout, id: HeroBeatId): Shot {
  switch (id) {
    // The tour frames these beside a narrower card; full-bleed behind the
    // home page's cards they read better from a little further back.
    case "design":
      return pullBack(shotFor(layout, "design"), 1.35);
    case "brakes":
      return pullBack(shotFor(layout, "brakes"), 1.15);
    case "engine":
    case "electric":
      return shotFor(layout, id);
    // Performance is every system at once: the car pulled apart, from far
    // enough back to hold all of it.
    case "performance":
      return storyShots(layout, ["whole"])[0] ?? heroShot(layout);
  }
}

/** The car rolls forward as the story is scrolled; at the hero it stands. */
const drive = (beat: number) => Math.max(0, beat) * 4.2;

/** Per-frame working objects; used synchronously inside one frame only. */
const SCRATCH = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  spherical: new THREE.Spherical(),
};

/** Idle frames per second at the hero. The sway is slow; 30 is plenty. */
const IDLE_FPS = 30;

const BASE_FOV = 32;
const PORTRAIT_FOV = 44;
const toRadians = Math.PI / 180;

/**
 * Lens and distance for the viewport. Shots are framed for a landscape
 * screen; a portrait one sees far less width at the same distance. Backing
 * away alone would push the car into the fog and show the floor's far edge,
 * so a portrait screen first widens the lens, then backs away only as much
 * as it still needs.
 */
function framing(width: number, height: number): { fov: number; fit: number } {
  const aspect = width / Math.max(1, height);
  if (aspect >= 1.2) return { fov: BASE_FOV, fit: 1 };
  const fov = aspect < 1 ? PORTRAIT_FOV : BASE_FOV;
  const widen = Math.tan((BASE_FOV / 2) * toRadians) / Math.tan((fov / 2) * toRadians);
  return { fov, fit: Math.min(3, Math.max(1, (1.2 / aspect) * widen)) };
}

/**
 * Drifting motes in the key light. Only at medium quality and above, and
 * deterministic rather than Math.random() so the field never rearranges.
 */
function Motes({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pseudoRandom = (seed: number): number => {
      const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = (pseudoRandom(index * 3) - 0.5) * 22;
      array[index * 3 + 1] = pseudoRandom(index * 3 + 1) * 7 + 0.2;
      array[index * 3 + 2] = (pseudoRandom(index * 3 + 2) - 0.5) * 22;
    }
    return array;
  }, [count]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });

  return (
    <Points ref={ref} positions={positions} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c8a34a"
        size={0.028}
        sizeAttenuation
        depthWrite={false}
        opacity={0.32}
      />
    </Points>
  );
}

/** Camera, parallax, idle sway and the road; all written to objects, never state. */
function Rig({
  shots,
  progressRef,
  motionRef,
  running,
}: {
  shots: Shot[];
  progressRef: RefObject<HeroProgress>;
  motionRef: RefObject<CarMotion>;
  running: boolean;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  const shown = useRef<number | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const pointerGoal = useRef({ x: 0, y: 0 });
  const idleTimer = useRef<number | null>(null);

  // Scroll and pointer ask for a frame; the rig keeps asking until settled.
  useEffect(() => {
    const onScroll = () => invalidate();
    const onPointer = (event: PointerEvent) => {
      // Touch has no hover: a finger scrolling the page must not swing the car.
      if (event.pointerType === "touch") return;
      pointerGoal.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerGoal.current.y = (event.clientY / window.innerHeight) * 2 - 1;
      invalidate();
    };
    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget !== null) return;
      pointerGoal.current.x = 0;
      pointerGoal.current.y = 0;
      invalidate();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [invalidate]);

  // Leaving the "never" loop: draw once so the frame is current.
  useEffect(() => {
    if (running) invalidate();
  }, [running, invalidate]);

  useEffect(
    () => () => {
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      camera.clearViewOffset();
    },
    [camera],
  );

  useFrame((state, delta) => {
    const step = Math.min(delta, 0.1);
    const goal = progressRef.current?.beat ?? 0;
    const beat =
      shown.current === null
        ? goal
        : THREE.MathUtils.damp(shown.current, goal, 3.5, step);
    shown.current = Math.abs(beat - goal) < 1e-4 ? goal : beat;

    const p = pointer.current;
    const g = pointerGoal.current;
    p.x = THREE.MathUtils.damp(p.x, g.x, 2.6, step);
    p.y = THREE.MathUtils.damp(p.y, g.y, 2.6, step);
    const pointerMoving = Math.abs(p.x - g.x) + Math.abs(p.y - g.y) > 1e-3;

    const { position, target, offset, spherical } = SCRATCH;
    cameraAt(shots, shown.current, false, position, target);

    // Idle sway at the hero, fading out as the story takes over; pointer
    // parallax throughout, small enough never to fight the framing.
    const hero = 1 - clamp01(shown.current);
    const t = state.clock.elapsedTime;
    offset.subVectors(position, target);
    spherical.setFromVector3(offset);
    spherical.theta += hero * Math.sin(t * 0.21) * 0.075 + p.x * 0.08;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + hero * Math.sin(t * 0.13) * 0.018 + p.y * 0.035,
      0.35,
      1.5,
    );
    const { fov, fit } = framing(size.width, size.height);
    const lens = state.camera as THREE.PerspectiveCamera;
    if (lens.fov !== fov) {
      lens.fov = fov;
      lens.updateProjectionMatrix();
    }
    spherical.radius *= fit;
    position.setFromSpherical(spherical).add(target);
    position.y = Math.max(0.18, position.y);
    camera.position.copy(position);
    camera.lookAt(target);

    // The car sits beside the text rather than under it: to the right on wide
    // screens; on narrower ones low under the headline, then high above the
    // cards (which sit at the bottom there).
    const { width, height } = size;
    const x =
      width >= 1024
        ? -width * THREE.MathUtils.lerp(0.25, 0.19, clamp01(shown.current))
        : 0;
    const y =
      width < 1024
        ? THREE.MathUtils.lerp(-height * 0.2, height * 0.2, clamp01(shown.current))
        : 0;
    camera.setViewOffset(width, height, x, y, width, height);

    motionRef.current.distance = drive(shown.current);
    // DEBUG-W9B (temporary)
    const debugCanvas = state.gl.domElement;
    debugCanvas.dataset.beat = shown.current.toFixed(3);
    debugCanvas.dataset.frames = String(Number(debugCanvas.dataset.frames ?? 0) + 1);
    debugCanvas.dataset.fov = String(lens.fov);

    if (shown.current !== goal || pointerMoving) {
      invalidate();
    } else if (hero > 0.01 && idleTimer.current === null) {
      idleTimer.current = window.setTimeout(() => {
        idleTimer.current = null;
        invalidate();
      }, 1000 / IDLE_FPS);
    }
  });

  return null;
}

/** Calls back after the car has really been drawn twice (shaders compiled). */
function FirstFrame({ armed, onFrame }: { armed: boolean; onFrame: () => void }) {
  const frames = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (armed) invalidate();
  }, [armed, invalidate]);
  useFrame(() => {
    if (!armed || frames.current >= 2) return;
    frames.current += 1;
    if (frames.current === 2) onFrame();
    else invalidate();
  });
  return null;
}

/** Reports a lost context on a canvas still in the page (not R3F's own unmount). */
function ContextWatch({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      requestAnimationFrame(() => {
        if (canvas.isConnected) onLost();
      });
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  return null;
}

function Scene({
  build,
  beats,
  progressRef,
  active,
  running,
  quality,
  onReady,
  onContextLost,
}: HeroSceneProps) {
  const layout = useCarLayout(build);
  const { spec } = layout;
  const scale = spec.length / 4.5;
  const size = useThree((state) => state.size);
  const shots = useMemo(
    () => [heroShot(layout), ...beats.map((id) => beatShot(layout, id))],
    [layout, beats],
  );
  const motionRef = useRef<CarMotion>({ distance: 0 });

  const shot = shots[Math.min(shots.length - 1, Math.max(0, active))];
  const exploded = active > 0 && beats[active - 1] === "performance";

  // Contact shadows follow the parts only while they move, then are captured
  // once in their new arrangement.
  const [moving, setMoving] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const [built, setBuilt] = useState(false);
  const handleMotion = useCallback((next: boolean) => {
    setMoving(next);
    if (!next) setEpoch((value) => value + 1);
  }, []);
  const handleBuilt = useCallback(() => {
    setBuilt(true);
    setEpoch((value) => value + 1);
  }, []);

  const extent = spec.length / 2 + 2.4 * scale;
  // Fog and floor are tuned for a landscape framing; where a portrait screen
  // backs the camera away they recede with it, so the fog never swallows the
  // car and the floor's far edge stays inside it.
  const { fit } = framing(size.width, size.height);
  const fogScale = scale * fit;

  return (
    <>
      <SceneLighting preset="studio" quality={quality} extent={extent} scale={fogScale} />
      <ViewerFloor
        preset="studio"
        quality={quality}
        epoch={epoch}
        contactFrames={quality.liveContactShadows && moving ? Infinity : 1}
        extent={extent + 1}
        size={140 * fit}
      />
      {/* The lane markings belong to the drive: the car stands still at the
          hero, so the road appears only once the story begins. */}
      {active > 0 ? <Road layout={layout} motionRef={motionRef} /> : null}
      {quality.lowDetail ? null : <Motes count={110} />}

      <ProceduralCar
        layout={layout}
        explode={exploded ? 1 : 0}
        ghost={exploded ? 0 : (shot?.ghost ?? 0)}
        highlightGroup={exploded ? null : (shot?.highlight ?? null)}
        lowDetail={quality.lowDetail}
        surfaceDetail={quality.surfaceDetail}
        glassTransmission={quality.glassTransmission}
        motion={motionRef}
        onExplodeMotion={handleMotion}
        onReady={handleBuilt}
      />

      <Rig
        shots={shots}
        progressRef={progressRef}
        motionRef={motionRef}
        running={running}
      />
      <FirstFrame armed={built} onFrame={onReady} />
      <ContextWatch onLost={onContextLost} />
    </>
  );
}

export type HeroSceneProps = {
  build: CarBuild;
  /** The story's beats in order; must be a stable array. */
  beats: readonly HeroBeatId[];
  /** Written by the page on scroll; read here every frame. */
  progressRef: RefObject<HeroProgress>;
  /** Index in view: 0 = the hero, n = the nth story card. */
  active: number;
  /** False off screen or without the page's render slot: the loop stops. */
  running: boolean;
  quality: QualityProfile;
  /** The first frame of the car has been presented. */
  onReady: () => void;
  onContextLost: () => void;
};

export function HeroScene(props: HeroSceneProps) {
  const { running, quality } = props;
  const maxDpr = Math.min(quality.dpr[1], 1.75);
  return (
    <Canvas
      frameloop={running ? "demand" : "never"}
      dpr={[1, maxDpr]}
      // PCF: three r186 dropped PCFSoft (R3F's default) and warns about it.
      shadows={quality.shadows ? "percentage" : false}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [6.2, 1.2, 5.4], fov: BASE_FOV, near: 0.05, far: 400 }}
      aria-hidden="true"
      data-scene-active={props.active}
      // Scenery: the page scrolls through it and the parallax is read from
      // the window, so the canvas never takes a pointer event.
      style={{ pointerEvents: "none" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
