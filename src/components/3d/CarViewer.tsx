"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Layers, Maximize2, RotateCcw, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Sheet } from "@/components/ui/Sheet";
import { Badge } from "@/components/ui/Badge";
import type { Part, ViewerGroup } from "@/types/domain";
import {
  CAMERA_PRESETS,
  DEFAULT_PRESET,
  GROUP_LABELS,
  type DimensionInput,
} from "./viewer-config";

/**
 * The Canvas is dynamically imported with ssr:false.
 *
 * three.js touches `window` at module scope and cannot be server-rendered, and
 * keeping it out of the initial bundle means the detail page's text content is
 * interactive long before ~400 kB of 3D code has parsed.
 */
const CarScene = dynamic(() => import("./CarScene").then((m) => m.CarScene), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-surface-1">
      <span className="font-display text-[9px] tracking-[0.2em] text-ink-500 uppercase">
        Initialising viewer
      </span>
    </div>
  ),
});

export type CarViewerProps = {
  bodyType: string | null;
  dimensions?: DimensionInput | null;
  powertrain: "combustion" | "electric" | "hybrid";
  glbUrl?: string | null;
  /** Parts keyed by viewer group, for the info panel. */
  partsByGroup?: Partial<Record<ViewerGroup, Part[]>>;
  /** Engine/battery figures shown when the engine or battery group is picked. */
  groupNotes?: Partial<Record<ViewerGroup, string>>;
  highlightGroup?: ViewerGroup | null;
  className?: string;
  /** Hides the exploded-view control, e.g. on the parts page. */
  showExplode?: boolean;
  xray?: boolean;
  /** Attribution line for a third-party model (CC-BY requires it). */
  modelCredit?: string | null;
  /** Hides the Engineering Mode toggle. */
  showEngineering?: boolean;
  /** Real dimensions, shown as labelled lines in Engineering Mode. */
  dimensionLabels?: { length?: string; width?: string; wheelbase?: string } | null;
};

export function CarViewer({
  bodyType,
  dimensions,
  powertrain,
  glbUrl,
  partsByGroup = {},
  groupNotes = {},
  highlightGroup = null,
  className,
  showExplode = true,
  xray = false,
  showEngineering = true,
  dimensionLabels,
  modelCredit,
}: CarViewerProps) {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [exploded, setExploded] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ViewerGroup | null>(null);
  const [glbFailed, setGlbFailed] = useState(false);
  const [engineering, setEngineering] = useState(false);

  // Only render while the canvas is on screen. Scrolling past a detail page
  // should not leave a WebGL loop burning battery below the fold.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setActive(entry.isIntersecting);
      },
      { rootMargin: "120px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleSelectGroup = useCallback((group: ViewerGroup) => {
    setSelectedGroup(group);
  }, []);

  const closePanel = useCallback(() => setSelectedGroup(null), []);

  const usingFallback = !glbUrl || glbFailed;
  // A real model exists, but the segmented car is on screen instead because
  // the visitor is exploding or inspecting it.
  const showingAnatomy = !usingFallback && (exploded || selectedGroup !== null);
  const selectedParts = selectedGroup ? (partsByGroup[selectedGroup] ?? []) : [];
  const selectedNote = selectedGroup ? groupNotes[selectedGroup] : undefined;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="relative aspect-[16/10] w-full overflow-hidden border border-line bg-surface-1 sm:aspect-[2/1]"
      >
        {/* Mounted only once the container is near the viewport. The observer
            uses a 120px margin so the canvas is ready by the time it is seen. */}
        {active ? (
          <CarScene
            bodyType={bodyType}
            dimensions={dimensions}
            powertrain={powertrain}
            glbUrl={glbFailed ? null : glbUrl}
            preset={preset}
            explode={exploded ? 1 : 0}
            selectedGroup={selectedGroup}
            highlightGroup={highlightGroup}
            onSelectGroup={handleSelectGroup}
            lowDetail={isMobile}
            reducedMotion={reducedMotion}
            active={active}
            xray={xray || engineering}
            onGlbFailed={() => setGlbFailed(true)}
          />
        ) : null}

        {/* Honest badging. Three distinct states, and the viewer always says
            which one it is in: no real model at all; a real model being shown;
            or a real model temporarily swapped for the segmented anatomy car
            because the visitor asked to explode or inspect it. */}
        <div className="pointer-events-none absolute top-3 left-3 flex max-w-[85%] flex-col items-start gap-1.5">
          {usingFallback ? (
            <Badge tone="neutral">
              3D model coming soon — showing concept representation
            </Badge>
          ) : showingAnatomy ? (
            <Badge tone="neutral">Anatomy model — segmented for inspection</Badge>
          ) : null}

          {!usingFallback && modelCredit ? (
            <span className="rounded-xs bg-void/70 px-2 py-1 font-mono text-[9px] text-ink-500">
              {modelCredit}
            </span>
          ) : null}
        </div>

        {exploded ? (
          <div className="pointer-events-none absolute top-3 right-3">
            <Badge tone="gold">Exploded view</Badge>
          </div>
        ) : null}

        {/* Engineering Mode overlay. The figures are the car's real published
            dimensions, so the labels are measurements rather than decoration.
            Rendered as DOM over the canvas rather than in-scene, which keeps
            the text crisp and screen-reader accessible. */}
        {engineering ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-3 right-3">
              <Badge tone="gold">Engineering mode</Badge>
            </div>

            {dimensionLabels?.length ? (
              <div className="absolute inset-x-[12%] bottom-12">
                <div className="h-px w-full bg-gold-500/60" />
                <div className="-mt-1 flex justify-between">
                  <span className="h-2 w-px bg-gold-500/60" />
                  <span className="h-2 w-px bg-gold-500/60" />
                </div>
                <p className="mt-1.5 text-center font-mono text-[10px] text-gold-300">
                  Length {dimensionLabels.length}
                </p>
              </div>
            ) : null}

            {dimensionLabels?.wheelbase ? (
              <div className="absolute inset-x-[26%] bottom-24">
                <div className="h-px w-full bg-signal-electric/50" />
                <p className="mt-1.5 text-center font-mono text-[10px] text-signal-electric">
                  Wheelbase {dimensionLabels.wheelbase}
                </p>
              </div>
            ) : null}

            {dimensionLabels?.width ? (
              <p className="absolute top-1/2 left-4 font-mono text-[10px] text-ink-300">
                Width {dimensionLabels.width}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="pointer-events-none absolute right-3 bottom-3 font-mono text-[10px] text-ink-600">
          {isMobile ? "Drag to rotate · pinch to zoom" : "Drag to orbit · scroll to zoom"}
        </p>
      </div>

      {/* --------------------------------------------------------- Controls */}
      <div className="mt-px flex flex-wrap items-center gap-2 border-x border-b border-line px-3 py-3">
        <span className="mr-1 hidden text-label sm:inline">View</span>

        {CAMERA_PRESETS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setPreset(entry.id)}
            aria-pressed={preset === entry.id}
            className={cn(
              "rounded-xs border px-2.5 py-1.5 font-display text-[10px] tracking-[0.12em] uppercase transition-colors duration-200",
              preset === entry.id
                ? "border-gold-500 bg-gold-800/20 text-gold-300"
                : "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
            )}
          >
            {entry.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {showExplode ? (
            <button
              type="button"
              onClick={() => {
                setExploded((previous) => !previous);
                setSelectedGroup(null);
              }}
              aria-pressed={exploded}
              className={cn(
                "flex items-center gap-2 rounded-xs border px-3 py-1.5 font-display text-[10px] tracking-[0.12em] uppercase transition-colors duration-200",
                exploded
                  ? "border-gold-500 bg-gold-800/20 text-gold-300"
                  : "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
              )}
            >
              <Layers className="size-3.5" aria-hidden="true" />
              Explode
            </button>
          ) : null}

          {showEngineering ? (
            <button
              type="button"
              onClick={() => setEngineering((previous) => !previous)}
              aria-pressed={engineering}
              className={cn(
                "flex items-center gap-2 rounded-xs border px-3 py-1.5 font-display text-[10px] tracking-[0.12em] uppercase transition-colors duration-200",
                engineering
                  ? "border-gold-500 bg-gold-800/20 text-gold-300"
                  : "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
              )}
            >
              <Ruler className="size-3.5" aria-hidden="true" />
              Engineering
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setPreset(DEFAULT_PRESET);
              setExploded(false);
              setSelectedGroup(null);
              setEngineering(false);
            }}
            aria-label="Reset view"
            className="rounded-xs border border-line p-1.5 text-ink-400 transition-colors duration-200 hover:border-line-strong hover:text-ink-100"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Keyboard route into the subsystems. Clicking parts in the canvas is a
          pointer-only affordance, so the same targets are exposed as buttons. */}
      {showExplode ? (
        <details className="mt-4 border border-line">
          <summary className="cursor-pointer px-4 py-3 text-label transition-colors hover:text-ink-200">
            <Info className="mr-2 inline size-3" aria-hidden="true" />
            Inspect a subsystem
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-line-subtle px-4 py-4">
            {(Object.keys(GROUP_LABELS) as ViewerGroup[]).map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className="rounded-xs border border-line px-3 py-1.5 text-xs text-ink-400 transition-colors duration-200 hover:border-gold-700 hover:text-gold-300"
              >
                {GROUP_LABELS[group]}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {/* ------------------------------------------------------- Info panel */}
      <Sheet
        open={selectedGroup !== null}
        onClose={closePanel}
        title={selectedGroup ? GROUP_LABELS[selectedGroup] : ""}
        side={isMobile ? "bottom" : "right"}
      >
        {selectedNote ? (
          <p className="mb-6 border-b border-line-subtle pb-5 text-sm leading-relaxed text-ink-200">
            {selectedNote}
          </p>
        ) : null}

        {selectedParts.length > 0 ? (
          <ul className="space-y-5">
            {selectedParts.map((part) => (
              <li key={part.id}>
                <Link
                  href={`/parts/${part.slug}`}
                  className="font-display text-[11px] tracking-[0.14em] text-gold-300 uppercase transition-colors hover:text-gold-200"
                >
                  {part.name} →
                </Link>
                {part.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink-400">
                    {part.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-relaxed text-ink-500">
            No components are catalogued for this subsystem yet.
          </p>
        )}

        <Link
          href="/parts"
          className="mt-8 flex items-center gap-2 border-t border-line pt-5 text-xs text-ink-400 transition-colors hover:text-gold-300"
        >
          <Maximize2 className="size-3" aria-hidden="true" />
          Open the full parts encyclopedia
        </Link>
      </Sheet>
    </div>
  );
}
