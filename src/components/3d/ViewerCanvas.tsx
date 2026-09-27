"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import type { ViewerBridge } from "@/lib/viewer-bridge";
import type { PublishedDimensions } from "@/lib/viewer-dimensions";
import type { LightingId } from "@/lib/viewer-lighting";
import type { QualityProfile } from "@/lib/viewer-quality";
import { SceneLighting, ViewerFloor } from "./CarLighting";
import { CameraController, type PresetRequest } from "./CameraController";
import { ProceduralCar, type AnchorRegistry, type CarAppearance } from "./ProceduralCar";
import { VehicleModel, forgetModel, type ModelLoadInfo } from "./ModelLoader";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { OverlayProjector } from "./OverlayProjector";
import { INTERNAL_GROUPS, cameraPresets, type Vec3 } from "./viewer-config";
import { useCarLayout } from "./layout-cache";
import { dimensionLines } from "./dimension-geometry";

/**
 * The interactive viewer's WebGL canvas: lighting, floor, the car (a GLB or
 * the procedural model), the camera and the overlay projector.
 *
 * Loaded with next/dynamic (ssr: false) by Car3DViewer, which owns every bit
 * of state; this module only draws it. The frame loop is "demand": a frame is
 * rendered when something changes — the camera moves, a part animates, a
 * material eases — and none while the scene is still, so an idle viewer costs
 * nothing. Off screen, or while another scene has the page's render slot, the
 * loop is "never" and the canvas keeps its last frame.
 */

export type ViewerProgress = {
  model: number | null;
  textures: number | null;
  environment: number | null;
};

export type ViewerModelSource = { url: string };

export type ViewerCanvasProps = {
  build: CarBuild;
  /** The GLB to show while simply looking; null draws the procedural car. */
  model: ViewerModelSource | null;
  running: boolean;
  quality: QualityProfile;
  /** AUTO quality: watch the frame rate and report sustained changes. */
  adaptive: boolean;
  lighting: LightingId;
  preset: PresetRequest;
  exploded: boolean;
  /** X-ray: ghost the body and bring these groups forward. */
  xray: boolean;
  emphasis: readonly ViewerGroup[];
  selectedGroup: ViewerGroup | null;
  appearance: CarAppearance;
  dimensions: PublishedDimensions | null;
  autoRotate: boolean;
  controlsEnabled: boolean;
  panMode: boolean;
  reducedMotion: boolean;
  bridge: ViewerBridge;
  onSelectGroup: (group: ViewerGroup) => void;
  onReady: () => void;
  onProgress: (progress: Partial<ViewerProgress>) => void;
  onModelLoaded: (info: ModelLoadInfo) => void;
  onModelError: (error: Error) => void;
  onContextLost: () => void;
  onPerformance: (event: "decline" | "incline") => void;
  onInteract: () => void;
};

/** The canvas cursor: a pointer over something that can be picked. */
function setCursor(canvas: HTMLCanvasElement, cursor: string): void {
  canvas.style.cursor = cursor;
}

/** Reports texture loading for a GLB from three's loading manager. */
function TextureProgress({
  onProgress,
}: {
  onProgress: ViewerCanvasProps["onProgress"];
}) {
  const loaded = useProgress((state) => state.loaded);
  const total = useProgress((state) => state.total);
  useEffect(() => {
    // Item one is the model file itself; the rest are its textures.
    if (total > 1)
      onProgress({ textures: Math.round(((loaded - 1) / (total - 1)) * 100) });
  }, [loaded, total, onProgress]);
  return null;
}

/** Calls back once the vehicle has actually been drawn, not merely mounted. */
function FirstFrame({ armed, onFrame }: { armed: boolean; onFrame: () => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    if (armed) invalidate();
  }, [armed, invalidate]);
  useFrame(() => {
    if (!armed || done.current) return;
    frames.current += 1;
    // The second frame: the first one (shader compile, environment capture)
    // has been presented.
    if (frames.current >= 2) {
      done.current = true;
      onFrame();
    } else {
      invalidate();
    }
  });
  return null;
}

function Scene(props: ViewerCanvasProps) {
  const {
    build,
    model,
    running,
    quality,
    adaptive,
    lighting,
    preset,
    exploded,
    xray,
    emphasis,
    selectedGroup,
    appearance,
    dimensions,
    autoRotate,
    controlsEnabled,
    panMode,
    reducedMotion,
    bridge,
    onSelectGroup,
    onReady,
    onProgress,
    onModelLoaded,
    onModelError,
    onContextLost,
    onPerformance,
    onInteract,
  } = props;

  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const layout = useCarLayout(build);
  const { spec } = layout;
  const scale = spec.length / 4.5;
  const presets = useMemo(() => cameraPresets(layout), [layout]);
  const [anchors] = useState<AnchorRegistry>(() => new Map());

  // --- render loop housekeeping ----------------------------------------------
  useEffect(() => {
    if (running) invalidate();
  }, [running, invalidate]);
  useEffect(() => {
    invalidate();
  }, [quality, lighting, invalidate]);

  // A lost context cannot be drawn to again; the viewer shows its fallback.
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (event: Event) => {
      event.preventDefault();
      // R3F deliberately loses the context when a canvas unmounts; only a
      // loss on a canvas still in the page is a real failure.
      requestAnimationFrame(() => {
        if (canvas.isConnected) onContextLost();
      });
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);

  // --- hover -----------------------------------------------------------------
  const hovered = useSyncExternalStore(
    bridge.hover.subscribe,
    bridge.hover.get,
    () => null,
  );
  const handleHover = useCallback(
    (group: ViewerGroup | null, point?: { x: number; y: number }) => {
      bridge.hover.set(group, point?.x, point?.y);
      setCursor(gl.domElement, group ? "pointer" : "");
    },
    [bridge, gl],
  );
  useEffect(
    () => () => {
      bridge.hover.set(null);
      setCursor(gl.domElement, "");
    },
    [bridge, gl],
  );

  // --- vehicle -------------------------------------------------------------------
  const [explodeMoving, setExplodeMoving] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const handleExplodeMotion = useCallback((moving: boolean) => {
    setExplodeMoving(moving);
    // Once the parts come to rest, the contact shadows are captured afresh.
    if (!moving) setEpoch((value) => value + 1);
  }, []);

  const [vehicleReady, setVehicleReady] = useState(false);
  const handleProceduralReady = useCallback(() => {
    setVehicleReady(true);
    setEpoch((value) => value + 1);
    onProgress({ model: 100, textures: 100 });
  }, [onProgress]);
  const handleModelProgress = useCallback(
    (fraction: number | null) => {
      onProgress({ model: fraction === null ? null : Math.round(fraction * 100) });
    },
    [onProgress],
  );
  const handleModelLoaded = useCallback(
    (info: ModelLoadInfo) => {
      setVehicleReady(true);
      setEpoch((value) => value + 1);
      onProgress({ model: 100, textures: 100 });
      onModelLoaded(info);
    },
    [onProgress, onModelLoaded],
  );
  const handleModelError = useCallback(
    (error: Error) => {
      if (model) forgetModel(model.url);
      onModelError(error);
    },
    [model, onModelError],
  );
  const handleFirstFrame = useCallback(() => {
    onProgress({ environment: 100 });
    onReady();
  }, [onProgress, onReady]);

  useEffect(() => {
    invalidate();
  }, [epoch, explodeMoving, invalidate]);

  const presetGhost = presets[preset.id]?.ghost ?? 0;
  const ghost = exploded
    ? 0
    : xray || (selectedGroup !== null && INTERNAL_GROUPS.has(selectedGroup))
      ? 1
      : presetGhost;
  // The ENGINE and BATTERY views are about one system: it is picked out and
  // the rest of the car (seats included) steps back, as in the anatomy tour.
  // Anything the visitor chose themselves — a selection, X-ray, explode —
  // takes precedence.
  const focus: ViewerGroup | null =
    exploded || xray || selectedGroup !== null
      ? null
      : preset.id === "engine"
        ? "engine"
        : preset.id === "battery"
          ? "battery"
          : null;

  // GLB anchors: a real model has no named subsystems, so its hotspots are
  // placed from the published layout — wheel centres, the engine's recorded
  // position — and only for components that sit where the layout says.
  const glbAnchors = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const root = glbAnchors.current;
    if (!model || !root) return;
    const { anchors: points, spec: s } = layout;
    const entries: [string, THREE.Vector3][] = [
      [
        "wheels",
        layout.wheels[2]?.position.clone().setX(s.track / 2 + s.tyreWidth / 2 + 0.03) ??
          points.rearWheel,
      ],
      [
        "brakes",
        points.frontWheel
          .clone()
          .add(new THREE.Vector3(0.02, s.rimRadius * 0.5, -s.rimRadius * 0.3)),
      ],
      ["suspension", points.frontSuspension],
    ];
    if (layout.engine) entries.push(["engine", points.engine]);
    if (layout.battery) entries.push(["battery", layout.battery.center]);
    for (const [id, local] of entries)
      anchors.set(id, { object: root, local: local.clone() });
    invalidate();
    return () => {
      for (const [id] of entries) anchors.delete(id);
    };
  }, [model, layout, anchors, invalidate]);

  const procedural = (
    <ProceduralCar
      layout={layout}
      appearance={appearance}
      explode={exploded ? 1 : 0}
      selectedGroup={selectedGroup}
      highlightGroup={focus}
      hoveredGroup={hovered}
      emphasis={xray ? emphasis : null}
      onSelectGroup={onSelectGroup}
      onHoverGroup={handleHover}
      lowDetail={quality.lowDetail}
      surfaceDetail={quality.surfaceDetail}
      glassTransmission={quality.glassTransmission}
      ghost={ghost}
      reducedMotion={reducedMotion}
      anchors={anchors}
      onExplodeMotion={handleExplodeMotion}
      onReady={handleProceduralReady}
    />
  );

  // --- framing -----------------------------------------------------------------
  const bounds = useMemo(() => {
    const x = spec.width / 2 + 1.2;
    const z = spec.length / 2 + 1.8;
    const top = spec.height + (exploded ? 2.6 : 1.2) * scale;
    return { min: [-x, 0.05, -z] as Vec3, max: [x, top, z] as Vec3 };
  }, [spec, exploded, scale]);

  const lines = useMemo(
    () => (dimensions ? dimensionLines(layout, dimensions) : null),
    [layout, dimensions],
  );

  // Shadow coverage: fixed per car (see ViewerFloor), big enough for the
  // exploded layout.
  const extent = spec.length / 2 + 2.4 * scale;
  const contactFrames = quality.liveContactShadows && explodeMoving ? Infinity : 1;

  const [awake, setAwake] = useState(false);

  return (
    <>
      <SceneLighting preset={lighting} quality={quality} extent={extent} scale={scale} />
      <ViewerFloor
        epoch={epoch}
        preset={lighting}
        quality={quality}
        contactFrames={contactFrames}
        extent={extent + 1}
      />

      {model ? (
        <>
          <group ref={glbAnchors} name="glb-anchors" />
          <ModelErrorBoundary
            label="model"
            expected
            resetKeys={[model.url]}
            fallback={null}
            onError={handleModelError}
          >
            <TextureProgress onProgress={onProgress} />
            <Suspense fallback={null}>
              <VehicleModel
                url={model.url}
                length={spec.length}
                paint={appearance.paint}
                castShadows={quality.shadows}
                reducedMotion={reducedMotion}
                onProgress={handleModelProgress}
                onLoaded={handleModelLoaded}
              />
            </Suspense>
          </ModelErrorBoundary>
        </>
      ) : (
        procedural
      )}

      <CameraController
        presets={presets}
        request={preset}
        exploded={exploded}
        length={spec.length}
        bounds={bounds}
        autoRotate={autoRotate && !reducedMotion}
        enabled={controlsEnabled}
        panMode={panMode}
        reducedMotion={reducedMotion}
        commandsRef={bridge.commands}
        onInteract={onInteract}
        onAwakeChange={setAwake}
      />

      <OverlayProjector bridge={bridge} anchors={anchors} dimensions={lines} />
      <FirstFrame armed={vehicleReady} onFrame={handleFirstFrame} />

      {/* Frame-rate watch for AUTO quality, only while the camera is moving:
          with on-demand rendering an idle scene draws no frames at all, and
          measuring that would read as a very slow device. */}
      {adaptive && awake ? (
        <PerformanceMonitor
          iterations={8}
          ms={250}
          threshold={0.75}
          onDecline={() => onPerformance("decline")}
          onIncline={() => onPerformance("incline")}
        />
      ) : null}
    </>
  );
}

export function ViewerCanvas(props: ViewerCanvasProps) {
  const { quality, running, controlsEnabled } = props;
  return (
    <Canvas
      frameloop={running ? "demand" : "never"}
      dpr={quality.dpr}
      // PCF: three r186 dropped PCFSoft (R3F's default) and warns about it.
      shadows="percentage"
      gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      camera={{ position: [5, 1.6, 6], fov: 36, near: 0.05, far: 160 }}
      // Scroll-safe until the visitor opts in on touch screens; the camera
      // controls take over touch-action once enabled.
      className={controlsEnabled ? undefined : "touch-pan-y"}
      aria-hidden="true"
    >
      <Scene {...props} />
    </Canvas>
  );
}
