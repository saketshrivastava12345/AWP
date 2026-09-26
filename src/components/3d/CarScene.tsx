"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { Lighting, StudioFloor } from "./Lighting";
import { CameraRig } from "./CameraRig";
import { ProceduralCar, useCarLayout } from "./ProceduralCar";
import { GLBCar } from "./GLBCar";
import { ViewerErrorBoundary } from "./ViewerErrorBoundary";
import { cameraPresets, DEFAULT_PRESET } from "./viewer-config";
import type { PaintId } from "./car-materials";

export type CarSceneProps = {
  build: CarBuild;
  paint: PaintId;
  glbUrl?: string | null;
  preset: string;
  explode: number;
  selectedGroup: ViewerGroup | null;
  highlightGroup?: ViewerGroup | null;
  onSelectGroup: (group: ViewerGroup) => void;
  lowDetail: boolean;
  reducedMotion: boolean;
  /** False when the canvas is scrolled out of view — stops the render loop. */
  active: boolean;
  /** Engineering Mode: bodywork ghosted, systems visible. */
  engineering?: boolean;
  onGlbFailed?: () => void;
};

/**
 * Subsystems that live inside the bodywork. Selecting one ghosts the body so
 * the visitor can actually see what they picked.
 */
const INTERNAL: ReadonlySet<ViewerGroup> = new Set([
  "engine",
  "transmission",
  "suspension",
  "battery",
  "electronics",
  "interior",
]);

/** In-canvas loading indicator tied to the real asset loader. */
function SceneLoader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-[9px] tracking-[0.2em] text-ink-400 uppercase">
          Loading model
        </span>
        <span className="tabular font-mono text-xs text-gold-300">
          {Math.round(progress)}%
        </span>
      </div>
    </Html>
  );
}

export function CarScene({
  build,
  paint,
  glbUrl,
  preset,
  explode,
  selectedGroup,
  highlightGroup = null,
  onSelectGroup,
  lowDetail,
  reducedMotion,
  active,
  engineering = false,
  onGlbFailed,
}: CarSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [interacting, setInteracting] = useState(false);
  const layout = useCarLayout(build);
  const presets = useMemo(() => cameraPresets(layout), [layout]);

  const presetGhost = presets.find((entry) => entry.id === preset)?.ghost ?? 0;
  // Exploded, the parts are already apart and the shell stays solid. Otherwise
  // anything that looks inside the car ghosts the bodywork.
  const ghost =
    explode > 0
      ? 0
      : engineering || (selectedGroup !== null && INTERNAL.has(selectedGroup))
        ? 1
        : presetGhost;

  const procedural = (
    <ProceduralCar
      layout={layout}
      paint={paint}
      explode={explode}
      selectedGroup={selectedGroup}
      highlightGroup={highlightGroup}
      onSelectGroup={onSelectGroup}
      lowDetail={lowDetail}
      ghost={ghost}
      reducedMotion={reducedMotion}
    />
  );

  const handleGlbFailed = useCallback(() => {
    onGlbFailed?.();
  }, [onGlbFailed]);

  /**
   * Which car to render when a real GLB exists.
   *
   * A downloaded GLB is a single welded mesh: it has no named subsystems, so
   * it cannot be exploded and its parts cannot be clicked. The procedural car
   * is the opposite — fully segmented. The viewer switches between them by
   * intent: the GLB while simply looking, the anatomy model the moment the
   * visitor explodes the car or inspects a subsystem.
   */
  const needsAnatomy =
    explode > 0 || selectedGroup !== null || engineering || presetGhost > 0;
  const showGlb = Boolean(glbUrl) && !needsAnatomy;

  // Auto-rotate only while idle, and never when the user prefers reduced
  // motion or is mid-gesture.
  const autoRotate =
    active &&
    !interacting &&
    !reducedMotion &&
    explode === 0 &&
    preset === DEFAULT_PRESET;

  const initial = presets[0]?.position ?? [5, 2, 5];
  const reach = layout.spec.length / 4.5;

  return (
    <Canvas
      // "never" while off-screen is what actually stops the GPU work.
      frameloop={active ? "always" : "never"}
      dpr={lowDetail ? [1, 1.5] : [1, 2]}
      shadows={!lowDetail}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: initial, fov: 36, near: 0.05, far: 120 }}
      // Pointer events on the canvas would otherwise swallow page scroll on
      // touch devices; OrbitControls re-enables what it needs.
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 12, 34]} />

      <Lighting lowDetail={lowDetail} />
      <StudioFloor lowDetail={lowDetail} />

      <Suspense fallback={<SceneLoader />}>
        {showGlb && glbUrl ? (
          <ViewerErrorBoundary fallback={procedural} onError={handleGlbFailed}>
            <GLBCar url={glbUrl} xray={engineering} targetLength={layout.spec.length} />
          </ViewerErrorBoundary>
        ) : (
          procedural
        )}
      </Suspense>

      <CameraRig
        preset={preset || DEFAULT_PRESET}
        presets={presets}
        controlsRef={controlsRef}
        reducedMotion={reducedMotion}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan
        minDistance={1.2}
        maxDistance={14 * reach}
        // Stop the camera dropping below the ground plane.
        maxPolarAngle={Math.PI / 2.05}
        autoRotate={autoRotate}
        autoRotateSpeed={0.45}
        onStart={() => setInteracting(true)}
        onEnd={() => setInteracting(false)}
      />
    </Canvas>
  );
}
