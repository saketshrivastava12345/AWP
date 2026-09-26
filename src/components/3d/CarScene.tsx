"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useProgress } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ViewerGroup } from "@/types/domain";
import { Lighting } from "./Lighting";
import { CameraRig } from "./CameraRig";
import { ProceduralCar } from "./ProceduralCar";
import { GLBCar } from "./GLBCar";
import { ViewerErrorBoundary } from "./ViewerErrorBoundary";
import { CAMERA_PRESETS, DEFAULT_PRESET, type DimensionInput } from "./viewer-config";

export type CarSceneProps = {
  bodyType: string | null;
  dimensions?: DimensionInput | null;
  powertrain: "combustion" | "electric" | "hybrid";
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
  xray?: boolean;
  onGlbFailed?: () => void;
};

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
  bodyType,
  dimensions,
  powertrain,
  glbUrl,
  preset,
  explode,
  selectedGroup,
  highlightGroup = null,
  onSelectGroup,
  lowDetail,
  reducedMotion,
  active,
  xray = false,
  onGlbFailed,
}: CarSceneProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [interacting, setInteracting] = useState(false);

  const procedural = (
    <ProceduralCar
      bodyType={bodyType}
      dimensions={dimensions}
      powertrain={powertrain}
      explode={explode}
      selectedGroup={selectedGroup}
      highlightGroup={highlightGroup}
      onSelectGroup={onSelectGroup}
      lowDetail={lowDetail}
      xray={xray}
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
   * is the opposite — plain to look at, but fully segmented.
   *
   * Rather than choose one, the viewer switches between them by intent. The
   * GLB is shown while simply looking at the car; the moment the visitor
   * explodes it or inspects a subsystem, the anatomy model takes over. Both
   * features survive, and neither pretends to be the other.
   */
  const needsAnatomy = explode > 0 || selectedGroup !== null;
  const showGlb = Boolean(glbUrl) && !needsAnatomy;

  // Auto-rotate only while idle, and never when the user prefers reduced
  // motion or is mid-gesture.
  const autoRotate = active && !interacting && !reducedMotion && explode === 0;

  return (
    <Canvas
      // "never" while off-screen is what actually stops the GPU work; the
      // brief's `demand` behaviour is covered by OrbitControls and the camera
      // rig calling invalidate() when something changes.
      frameloop={active ? "always" : "never"}
      dpr={lowDetail ? [1, 1.5] : [1, 2]}
      shadows={!lowDetail}
      gl={{ antialias: !lowDetail, powerPreference: "high-performance" }}
      camera={{
        position: CAMERA_PRESETS[0]?.position ?? [5, 2, 5],
        fov: 38,
        near: 0.1,
        far: 100,
      }}
      // Pointer events on the canvas would otherwise swallow page scroll on
      // touch devices; OrbitControls re-enables what it needs.
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#06060a"]} />
      <fog attach="fog" args={["#06060a", 14, 30]} />

      <Lighting lowDetail={lowDetail} />

      <Suspense fallback={<SceneLoader />}>
        {showGlb && glbUrl ? (
          <ViewerErrorBoundary fallback={procedural} onError={handleGlbFailed}>
            <GLBCar url={glbUrl} xray={xray} />
          </ViewerErrorBoundary>
        ) : (
          procedural
        )}
      </Suspense>

      <CameraRig
        preset={preset || DEFAULT_PRESET}
        controlsRef={controlsRef}
        reducedMotion={reducedMotion}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.06}
        enablePan
        minDistance={2.2}
        maxDistance={13}
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
