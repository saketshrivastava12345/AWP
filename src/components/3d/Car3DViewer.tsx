"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { X } from "lucide-react";
import type { CarColor, Part, ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useGpuTier } from "@/hooks/useGpuTier";
import { Badge } from "@/components/ui/Badge";
import { Sheet } from "@/components/ui/Sheet";
import { InfoHint } from "@/components/ui/Tooltip";
import { createViewerBridge } from "@/lib/viewer-bridge";
import { publishedMeasurements, type PublishedDimensions } from "@/lib/viewer-dimensions";
import { availableHotspots } from "@/lib/viewer-hotspots";
import { DEFAULT_LIGHTING, type LightingId } from "@/lib/viewer-lighting";
import { stableKey } from "@/lib/viewer-lru";
import {
  CALIPER_COLORS,
  configStorageKey,
  defaultConfig,
  paintSurface,
  resolvePaint,
} from "@/lib/viewer-paint";
import {
  DEFAULT_PRESET,
  PRESET_GHOST,
  PRESET_LABELS,
  availablePresets,
  presetAvailability,
  type PresetId,
} from "@/lib/viewer-presets";
import {
  QUALITY_PROFILES,
  adaptQuality,
  effectiveLevel,
  initialAdaptive,
} from "@/lib/viewer-quality";
import { drawnGroups } from "./viewer-config";
import { bodyStyleOf, wheelDefaults } from "./wheel-defaults";
import type { CarAppearance } from "./ProceduralCar";
import type { PresetRequest } from "./CameraController";
import type { ModelLoadInfo } from "./ModelLoader";
import type { ViewerProgress } from "./ViewerCanvas";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import {
  CarControls,
  DisplaySettings,
  PresetBar,
  type ViewerToggles,
} from "./CarControls";
import { ConfiguratorPanel } from "./ConfiguratorPanel";
import { ComponentIndex, HotspotMarkers } from "./PartHotspots";
import { DimensionOverlay } from "./DimensionOverlay";
import { EngineeringCallouts, xrayCallouts, xrayEmphasis } from "./EngineeringMode";
import { HoverTooltip } from "./HoverTooltip";
import { PartPanel } from "./PartPanel";
import { TechnicalHud, type HudEntry } from "./TechnicalHud";
import { ViewerFallback } from "./ViewerFallback";
import { ViewerLoader } from "./ViewerLoader";
import { useFullscreen } from "./useFullscreen";
import { useSceneLifecycle, useWebGLSupport } from "./useSceneLifecycle";
import { useStoredConfig, useStoredQuality } from "./useViewerStorage";

/**
 * The interactive 3D viewer.
 *
 * This component is the DOM half: state, toolbar, overlays, panels. It does
 * not import three.js — the WebGL half (ViewerCanvas) is loaded with
 * next/dynamic only once the viewer nears the viewport, so the page's text is
 * interactive long before ~260 kB of 3D code has parsed, and a device without
 * WebGL never downloads it.
 */
const ViewerCanvas = dynamic(() => import("./ViewerCanvas").then((m) => m.ViewerCanvas), {
  ssr: false,
  loading: () => null,
});

export type Car3DViewerModel = {
  url: string;
  /** The file models this exact car (not a stand-in of the body style). */
  isExact: boolean;
  format: "glb" | "gltf";
  /** e.g. ["draco"], ["meshopt", "ktx2"]. */
  compression: string[];
  credit: string | null;
  license: string | null;
  author: string | null;
  sourceUrl: string | null;
  posterUrl: string | null;
};

export type Car3DViewerProps = {
  /** The variant's layout: dimensions, engine, drivetrain, seats. */
  build: CarBuild;
  /** e.g. "Porsche 911 GT3": names the 3D view for assistive technology. */
  title: string;
  /** A registered GLB for this car, if any. */
  model?: Car3DViewerModel | null;
  /** Photograph shown when WebGL or the model is unavailable. */
  posterUrl?: string | null;
  /** Catalogued parts by subsystem, for the info panel. */
  partsByGroup?: Partial<Record<ViewerGroup, Part[]>>;
  /** Part slug → a note specific to this variant. */
  partDetails?: Record<string, string>;
  /** Short factual line per subsystem, from the variant's specifications. */
  groupNotes?: Partial<Record<ViewerGroup, string>>;
  /** Figures for the technical HUD. */
  hud?: HudEntry[];
  /** Published dimensions for the measurement overlay. */
  dimensions?: PublishedDimensions | null;
  /** Catalogued paint colours (car_colors). */
  colors?: CarColor[];
  /** The variant catalogues carbon-ceramic discs. */
  carbonCeramic?: boolean;
  /** Open this subsystem's panel on mount (e.g. from ?inspect=brakes). */
  initialInspect?: ViewerGroup | null;
  className?: string;
};

const EMPTY_PARTS: Partial<Record<ViewerGroup, Part[]>> = {};
const EMPTY_DETAILS: Record<string, string> = {};
const EMPTY_NOTES: Partial<Record<ViewerGroup, string>> = {};
const EMPTY_HUD: HudEntry[] = [];
const EMPTY_COLORS: CarColor[] = [];
const NO_PROGRESS: ViewerProgress = { model: null, textures: null, environment: null };

/** Degrees per arrow-key press. */
const ORBIT_STEP = (15 * Math.PI) / 180;
const TILT_STEP = (8 * Math.PI) / 180;

export function Car3DViewer({
  build,
  title,
  model = null,
  posterUrl = null,
  partsByGroup = EMPTY_PARTS,
  partDetails = EMPTY_DETAILS,
  groupNotes = EMPTY_NOTES,
  hud = EMPTY_HUD,
  dimensions = null,
  colors = EMPTY_COLORS,
  carbonCeramic = false,
  initialInspect = null,
  className,
}: Car3DViewerProps) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const coarse = useMediaQuery("(pointer: coarse)", false);
  const webgl = useWebGLSupport();
  const tier = useGpuTier();

  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [bridge] = useState(createViewerBridge);
  const { mounted, visible, canRender } = useSceneLifecycle(stageRef, `viewer${id}`);
  const fullscreen = useFullscreen(rootRef);

  // --- what this car has --------------------------------------------------------
  const groups = useMemo(() => drawnGroups(build), [build]);
  const presets = useMemo(() => availablePresets(presetAvailability(build)), [build]);
  const hotspots = useMemo(() => availableHotspots(build), [build]);
  const measurements = useMemo(() => publishedMeasurements(dimensions), [dimensions]);
  const emphasis = useMemo(() => xrayEmphasis(build.powertrain, groups), [build, groups]);
  const callouts = useMemo(
    () =>
      xrayCallouts(
        build.powertrain,
        groups,
        groupNotes,
        build.powertrain === "electric" || build.powertrain === "hybrid",
      ),
    [build, groups, groupNotes],
  );

  // --- view state ---------------------------------------------------------------
  const [toggles, setToggles] = useState<Omit<ViewerToggles, "hud">>({
    panMode: false,
    autoRotate: false,
    exploded: false,
    xray: false,
    hotspots: true,
    dimensions: false,
  });
  // The HUD defaults off on phones, where it would sit on the car.
  const [hudPreference, setHudPreference] = useState<boolean | null>(null);
  const showHud = hudPreference ?? !isMobile;
  const [preset, setPreset] = useState<PresetRequest>({ id: DEFAULT_PRESET, nonce: 0 });
  const [lighting, setLighting] = useState<LightingId>(DEFAULT_LIGHTING);
  const [selected, setSelected] = useState<ViewerGroup | null>(
    initialInspect && drawnGroups(build).includes(initialInspect) ? initialInspect : null,
  );
  const [configOpen, setConfigOpen] = useState(false);
  const [touchActive, setTouchActive] = useState(false);
  const [interacted, setInteracted] = useState(false);

  // --- loading and failure --------------------------------------------------------
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<ViewerProgress>(NO_PROGRESS);
  // Both belong to the model they describe, so another model starts clean.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const glbFailed = model !== null && failedUrl === model.url;
  const [loaded, setLoaded] = useState<{ url: string; info: ModelLoadInfo } | null>(null);
  const modelInfo = loaded && loaded.url === model?.url ? loaded.info : null;
  const [contextLost, setContextLost] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // --- quality ----------------------------------------------------------------------
  const [qualitySetting, setQualitySetting] = useStoredQuality();
  const [perfEvents, setPerfEvents] = useState<("decline" | "incline")[]>([]);
  const adaptive = useMemo(
    () => (tier ? perfEvents.reduce(adaptQuality, initialAdaptive(tier.level)) : null),
    [tier, perfEvents],
  );
  const level = effectiveLevel(qualitySetting, adaptive);
  const quality = QUALITY_PROFILES[level];

  // --- configuration ----------------------------------------------------------------
  const wheels = useMemo(() => wheelDefaults(bodyStyleOf(build)), [build]);
  const defaults = useMemo(
    () =>
      defaultConfig({
        colors,
        wheelStyle: wheels.style,
        wheelFinish: wheels.finish,
        carbonCeramic,
      }),
    [colors, wheels, carbonCeramic],
  );
  const [config, setConfig, resetConfig] = useStoredConfig(
    configStorageKey(title),
    defaults,
    colors,
  );
  const appearance = useMemo<CarAppearance>(() => {
    const paint = paintSurface(resolvePaint(config.paint, colors));
    return {
      paint,
      wheelStyle: config.wheelStyle,
      wheelFinish: config.wheelFinish,
      caliper:
        CALIPER_COLORS.find((color) => color.id === config.caliper)?.hex ??
        CALIPER_COLORS[4].hex,
      disc: config.disc,
    };
  }, [config, colors]);

  // --- which model is on screen ----------------------------------------------------
  const exploded = toggles.exploded;
  const xray = toggles.xray;
  // A real model is one welded mesh: it cannot be exploded, ghosted or
  // picked apart, so anatomy views use the procedural representation.
  const anatomy = exploded || xray || selected !== null || PRESET_GHOST[preset.id] > 0;
  const hasModel = Boolean(model?.url) && !glbFailed;
  const showModel = hasModel && !anatomy;
  const exact = showModel && model?.isExact === true;
  const canvasModel = useMemo(
    () => (showModel && model ? { url: model.url } : null),
    [showModel, model],
  );

  const controlsEnabled = !coarse || touchActive;
  const canvasMounted = mounted && webgl === true && !contextLost;
  const running = canRender && !contextLost;

  // --- actions ------------------------------------------------------------------------
  const setToggle = useCallback((key: keyof ViewerToggles, value: boolean) => {
    if (key === "hud") {
      setHudPreference(value);
      return;
    }
    setToggles((current) => ({ ...current, [key]: value }));
    if (key === "exploded") setSelected(null);
  }, []);

  const choosePreset = useCallback((next: PresetId) => {
    setPreset((current) => ({ id: next, nonce: current.nonce + 1 }));
    // The engineering view is the X-ray view, framed for it.
    if (next === "engineering") setToggles((current) => ({ ...current, xray: true }));
  }, []);

  const reset = useCallback(() => {
    setPreset((current) => ({ id: DEFAULT_PRESET, nonce: current.nonce + 1 }));
    setToggles((current) => ({ ...current, exploded: false, xray: false }));
    setSelected(null);
  }, []);

  const zoom = (direction: 1 | -1) => {
    bridge.commands.current?.zoom(direction);
    setInteracted(true);
  };

  const openGroup = useCallback((group: ViewerGroup) => setSelected(group), []);
  const closeConfig = useCallback(() => setConfigOpen(false), []);
  const toggleConfig = useCallback(() => setConfigOpen((open) => !open), []);
  const closePanel = useCallback(() => setSelected(null), []);
  // The configurator is inline on the page but a modal sheet in fullscreen;
  // carrying it across would open a sheet over the view the visitor just
  // asked to see in full.
  const toggleFullscreen = () => {
    setConfigOpen(false);
    fullscreen.toggle();
  };
  const handleInteract = useCallback(() => setInteracted(true), []);
  const handleReady = useCallback(() => setReady(true), []);
  const handleProgress = useCallback((update: Partial<ViewerProgress>) => {
    setProgress((current) => {
      const next = { ...current, ...update };
      return next.model === current.model &&
        next.textures === current.textures &&
        next.environment === current.environment
        ? current
        : next;
    });
  }, []);
  const modelUrl = model?.url ?? null;
  const handleModelLoaded = useCallback(
    (info: ModelLoadInfo) => {
      if (modelUrl) setLoaded({ url: modelUrl, info });
    },
    [modelUrl],
  );
  const handleModelError = useCallback(() => setFailedUrl(modelUrl), [modelUrl]);
  // A model that is simply not there (a stale media row, a moved file) is
  // found with a HEAD request long before the canvas mounts. The loader would
  // fail as well and fall back the same way, but R3F reports every error
  // caught inside a canvas as a global error event; this keeps the commonest
  // failure out of the console. Anything less definite than "gone" — a
  // network error, a server that refuses HEAD — is left to the loader.
  useEffect(() => {
    if (!modelUrl) return;
    const controller = new AbortController();
    fetch(modelUrl, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        if (response.status === 404 || response.status === 410) setFailedUrl(modelUrl);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [modelUrl]);
  const handleContextLost = useCallback(() => setContextLost(true), []);
  const handlePerformance = useCallback(
    (event: "decline" | "incline") => setPerfEvents((current) => [...current, event]),
    [],
  );
  const retry = useCallback(() => {
    setContextLost(false);
    setReady(false);
    setProgress(NO_PROGRESS);
    setAttempt((value) => value + 1);
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const commands = bridge.commands.current;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft":
        if (event.shiftKey) commands?.pan(-0.4, 0);
        else commands?.orbit(-ORBIT_STEP, 0);
        break;
      case "ArrowRight":
        if (event.shiftKey) commands?.pan(0.4, 0);
        else commands?.orbit(ORBIT_STEP, 0);
        break;
      case "ArrowUp":
        if (event.shiftKey) commands?.pan(0, 0.3);
        else commands?.orbit(0, -TILT_STEP);
        break;
      case "ArrowDown":
        if (event.shiftKey) commands?.pan(0, -0.3);
        else commands?.orbit(0, TILT_STEP);
        break;
      case "+":
      case "=":
        commands?.zoom(1);
        break;
      case "-":
      case "_":
        commands?.zoom(-1);
        break;
      case "r":
      case "R":
        reset();
        break;
      case "f":
      case "F":
        toggleFullscreen();
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      setInteracted(true);
    }
  };

  // --- derived presentation --------------------------------------------------------
  const selectedParts = selected ? (partsByGroup[selected] ?? []) : [];
  const modeLabel = [
    PRESET_LABELS[preset.id],
    xray ? "X-ray" : null,
    exploded ? "Exploded" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const representation = exact ? "exact 3D model" : "3D representation";
  const modeBadges =
    exploded || xray ? (
      <>
        {xray ? (
          <Badge tone="gold" className="bg-void/70">
            X-ray
          </Badge>
        ) : null}
        {exploded ? (
          <Badge tone="gold" className="bg-void/70">
            Exploded
          </Badge>
        ) : null}
      </>
    ) : null;
  const instructionsId = `${id}-instructions`;
  const configAsSheet = isMobile || fullscreen.active;
  const showDimensions = toggles.dimensions && !exploded && measurements.length > 0;
  const loaderVisible = canvasMounted && !ready;

  const display = (
    <DisplaySettings
      lighting={lighting}
      onLighting={setLighting}
      quality={qualitySetting}
      onQuality={setQualitySetting}
      effective={level}
      stacked={configAsSheet}
    />
  );
  const configurator = (
    <ConfiguratorPanel
      colors={colors}
      config={config}
      onChange={setConfig}
      onReset={resetConfig}
      model={showModel ? "glb" : "procedural"}
      paintable={modelInfo?.paintable ?? false}
      carbonCeramic={carbonCeramic}
      display={configAsSheet ? display : undefined}
    />
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        fullscreen.active && "fixed inset-0 z-(--z-overlay) flex h-dvh flex-col bg-void",
        className,
      )}
    >
      {/* ---------------------------------------------------------------- Stage */}
      <div
        ref={stageRef}
        data-viewer-ready={ready ? "true" : "false"}
        className={cn(
          "relative w-full overflow-hidden border border-line bg-surface-1",
          fullscreen.active
            ? "min-h-0 flex-1"
            : "aspect-[4/3] sm:aspect-[16/9] lg:aspect-[2/1]",
        )}
      >
        <div
          role="img"
          aria-label={`Interactive ${representation} of the ${title}`}
          aria-describedby={instructionsId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="absolute inset-0 focus-visible:-outline-offset-2"
        >
          {canvasMounted ? (
            <ModelErrorBoundary
              label="viewer"
              resetKeys={[attempt, stableKey(build), model?.url ?? null]}
              fallback={
                <ViewerFallback
                  build={build}
                  title={title}
                  posterUrl={posterUrl ?? model?.posterUrl ?? null}
                  reason="The 3D view could not start on this device."
                  onRetry={retry}
                />
              }
            >
              <ViewerCanvas
                key={attempt}
                build={build}
                model={canvasModel}
                running={running}
                quality={quality}
                adaptive={qualitySetting === "auto"}
                lighting={lighting}
                preset={preset}
                exploded={exploded}
                xray={xray}
                emphasis={emphasis}
                selectedGroup={selected}
                appearance={appearance}
                dimensions={dimensions}
                autoRotate={toggles.autoRotate}
                controlsEnabled={controlsEnabled}
                panMode={toggles.panMode}
                reducedMotion={reducedMotion}
                bridge={bridge}
                onSelectGroup={openGroup}
                onReady={handleReady}
                onProgress={handleProgress}
                onModelLoaded={handleModelLoaded}
                onModelError={handleModelError}
                onContextLost={handleContextLost}
                onPerformance={handlePerformance}
                onInteract={handleInteract}
              />
            </ModelErrorBoundary>
          ) : null}
        </div>

        {/* Overlays, positioned by the canvas every frame. */}
        {canvasMounted && ready ? (
          <>
            {showDimensions ? (
              <DimensionOverlay measurements={measurements} bridge={bridge} />
            ) : null}
            {xray ? <EngineeringCallouts callouts={callouts} bridge={bridge} /> : null}
            {toggles.hotspots && controlsEnabled ? (
              <HotspotMarkers hotspots={hotspots} bridge={bridge} onOpen={openGroup} />
            ) : null}
            <HoverTooltip bridge={bridge} />
          </>
        ) : null}

        {showHud && canvasMounted && ready ? (
          <TechnicalHud
            entries={hud}
            mode={modeLabel}
            bridge={bridge}
            className={cn(visible ? "opacity-100" : "opacity-0")}
          />
        ) : null}

        {/* Honest badging: which kind of model is on screen, and whose it is. */}
        <div className="pointer-events-none absolute top-3 left-3 flex max-w-[78%] flex-col items-start gap-1.5">
          <div className="pointer-events-auto flex items-center gap-1">
            <Badge
              tone={exact ? "gold" : "neutral"}
              // Tighter letter-spacing on phones leaves the top-right corner
              // for the touch "Done" button.
              className="bg-void/70 max-sm:tracking-wide"
            >
              {exact ? "Exact 3D model" : "3D representation"}
            </Badge>
            <InfoHint label="About this 3D model" side="bottom">
              {exact
                ? "A 3D model of this exact car."
                : showModel
                  ? "A 3D model standing in for this car; it may differ in detail."
                  : "Generated by AURIX from this variant's published dimensions, engine and drivetrain layout. A representation, not a likeness."}
            </InfoHint>
          </div>
          {showModel && model ? (
            <p className="pointer-events-auto rounded-xs bg-void/75 px-2 py-1 font-mono text-micro text-ink-300">
              {[model.credit ?? model.author, model.license]
                .filter(Boolean)
                .join(" · ") || "Third-party model"}
              {model.sourceUrl ? (
                <>
                  {" · "}
                  <a
                    href={model.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-line-strong underline-offset-2 hover:text-gold-300"
                  >
                    Source
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {hasModel && anatomy ? (
            <p className="rounded-xs bg-void/75 px-2 py-1 font-mono text-micro text-ink-300">
              Anatomy views use the procedural representation
            </p>
          ) : null}
          {/* Phones: the mode badges sit under the model badge, keeping the
              top-right corner clear for the touch "Done" button. */}
          {modeBadges ? <div className="flex gap-1.5 sm:hidden">{modeBadges}</div> : null}
          {glbFailed ? (
            <p
              role="status"
              className="rounded-xs bg-void/80 px-2 py-1 text-xs text-signal-negative"
            >
              The 3D model could not be loaded — showing the procedural representation.
            </p>
          ) : null}
        </div>

        {modeBadges ? (
          <div className="pointer-events-none absolute top-3 right-3 flex gap-1.5 max-sm:hidden">
            {modeBadges}
          </div>
        ) : null}

        {canvasMounted &&
        ready &&
        controlsEnabled &&
        (toggles.autoRotate || !interacted) ? (
          <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-void/60 px-3 py-1 font-mono text-micro tracking-hud whitespace-nowrap text-ink-300 uppercase max-sm:bottom-2">
            {coarse
              ? "Drag to rotate · pinch to zoom"
              : "Drag to rotate · scroll to zoom"}
          </p>
        ) : null}

        <ViewerLoader progress={progress} visible={loaderVisible} />

        {webgl === false ? (
          <ViewerFallback
            build={build}
            title={title}
            posterUrl={posterUrl ?? model?.posterUrl ?? null}
            reason="This browser or device does not provide WebGL, which the 3D view needs."
          />
        ) : contextLost ? (
          <ViewerFallback
            build={build}
            title={title}
            posterUrl={posterUrl ?? model?.posterUrl ?? null}
            reason="The graphics context was lost, usually because the device ran short of GPU memory."
            onRetry={retry}
          />
        ) : null}

        {/* Touch: the stage starts scroll-safe; the page scrolls through it
            until the visitor asks for the 3D controls. */}
        {coarse && !touchActive && canvasMounted && !contextLost ? (
          <button
            type="button"
            onClick={() => {
              setTouchActive(true);
              setInteracted(false);
            }}
            className="absolute inset-0 flex touch-pan-y items-end justify-center pb-6"
            aria-label={`Explore the ${title} in 3D`}
          >
            <span className="rounded-full border border-gold-600 bg-void/80 px-5 py-3 font-display text-micro tracking-button text-gold-200 uppercase backdrop-blur-sm">
              Tap to explore in 3D
            </span>
          </button>
        ) : null}
        {coarse && touchActive ? (
          <button
            type="button"
            onClick={() => setTouchActive(false)}
            className="absolute top-2 right-2 flex min-h-11 items-center gap-1 rounded-full border border-line-strong bg-void/80 px-3 font-display text-micro tracking-button text-ink-100 uppercase backdrop-blur-sm"
          >
            <X className="size-3.5" aria-hidden="true" />
            Done
          </button>
        ) : null}
      </div>

      {/* -------------------------------------------------------------- Controls */}
      <div className="border-x border-b border-line bg-surface-1">
        <CarControls
          toggles={{ ...toggles, hud: showHud }}
          onToggle={setToggle}
          onZoom={zoom}
          onReset={reset}
          autoRotateBlocked={reducedMotion}
          dimensionsAvailable={measurements.length > 0}
          hudAvailable={hud.length > 0}
          fullscreen={fullscreen.active}
          onFullscreen={toggleFullscreen}
          configOpen={configOpen}
          onConfig={toggleConfig}
        />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line-subtle px-3 py-2.5">
          <PresetBar presets={presets} value={preset.id} onChange={choosePreset} />
          {configAsSheet ? null : <div className="ml-auto">{display}</div>}
        </div>
      </div>

      {configOpen && !configAsSheet ? (
        <div className="border-x border-b border-line bg-surface-1 px-4 py-5 sm:px-6">
          {configurator}
        </div>
      ) : null}
      {configAsSheet ? (
        <Sheet
          open={configOpen}
          onClose={closeConfig}
          title="Configure"
          description="Paint, wheels, brakes and display."
          side={isMobile ? "bottom" : "right"}
        >
          {configurator}
        </Sheet>
      ) : null}

      {fullscreen.active ? null : (
        <div className="mt-4">
          <ComponentIndex hotspots={hotspots} groups={groups} onOpen={openGroup} />
        </div>
      )}

      <PartPanel
        group={selected}
        parts={selectedParts}
        partDetails={partDetails}
        note={selected ? groupNotes[selected] : undefined}
        onClose={closePanel}
        side={isMobile ? "bottom" : "right"}
      />

      <p id={instructionsId} className="sr-only">
        {`Interactive 3D view. When focused, the arrow keys orbit the car, shift and the arrow keys pan, plus and minus zoom, R resets the view and F toggles fullscreen. The same controls are in the toolbar below, and every component is listed under "Inspect a subsystem".`}
      </p>
    </div>
  );
}
