"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import type { CarBuild } from "@/lib/car-build";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useGpuTier } from "@/hooks/useGpuTier";
import { QUALITY_PROFILES } from "@/lib/viewer-quality";
import { beatAt, type HeroBeatId } from "@/components/home/hero-beats";
import { POSTER_NOTES, heroMode } from "@/components/home/hero-mode";
import { HeroStageContext, type HeroStageState } from "@/components/home/HeroStageStatus";
import type { HeroProgress } from "./HeroScene";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { useSceneLifecycle, useWebGLSupport } from "./useSceneLifecycle";
import { useStoredQuality } from "./useViewerStorage";

/**
 * The home page's hero and scroll story, on one sticky 3D stage.
 *
 * Layout is CSS, not a scroll library: the stage is `position: sticky` for
 * the height of the section and the content — the server-rendered hero and
 * story cards passed in as children — scrolls over it in normal flow. No
 * pinning, so no pin spacer to go wrong and nothing to recalculate on
 * resize; the cards are ordinary HTML that reads the same without
 * JavaScript, to a screen reader, and to a search engine.
 *
 * One canvas serves the hero and every beat of the story (never two WebGL
 * contexts), registered with the page-wide render arbiter like every other
 * scene. It is loaded with next/dynamic only after the page has finished
 * loading and gone idle, so the headline — the page's largest paint — never
 * waits for three.js. Until the first frame is drawn, and whenever there is
 * no scene at all (reduced motion, no WebGL, a low-power device, a failure),
 * the server-rendered still `poster` is what shows; the reason is stated.
 */

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
});

/** Content blocks the scroll position is measured against: the hero, then each card. */
const BEAT_SELECTOR = "[data-hero-beat]";

export function HeroStory({
  build,
  beats,
  railLabels,
  poster,
  children,
  className,
}: {
  /** The featured car's layout, or a generic body when there is none. */
  build: CarBuild;
  /** The story cards' beat ids, in order. */
  beats: readonly HeroBeatId[];
  /** Progress rail: one label per block, the hero first ("Overview", …). */
  railLabels: readonly { id: string; label: string }[];
  /** Server-rendered still composition, shown until (and instead of) the scene. */
  poster: ReactNode;
  /** The hero block and the story cards, each marked `data-hero-beat`. */
  children: ReactNode;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const webgl = useWebGLSupport();
  const tier = useGpuTier();
  const [setting] = useStoredQuality();
  const id = useId();

  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progress = useRef<HeroProgress>({ beat: 0 });
  const activeRef = useRef(0);
  const centers = useRef<number[]>([]);

  const [active, setActive] = useState(0);
  const [optedIn, setOptedIn] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  const { mounted, canRender } = useSceneLifecycle(stageRef, `hero${id}`);
  const mode = heroMode({
    reducedMotion,
    webgl,
    tier: tier?.level ?? null,
    setting,
    mobile: isMobile,
    optIn: optedIn,
    failed,
  });
  const showScene = mode.kind === "scene" && mounted && pageLoaded;
  // Readiness belongs to one mounted canvas: when it unmounts (scrolled far
  // away, or the mode changed) the next one must draw its own first frame
  // before the still steps aside. Adjusted during render, React's pattern
  // for resetting state when an input changes.
  const [shownBefore, setShownBefore] = useState(showScene);
  if (shownBefore !== showScene) {
    setShownBefore(showScene);
    if (!showScene) setReady(false);
  }
  const sceneVisible = showScene && ready;

  // --- after the page has loaded and gone idle --------------------------------
  useEffect(() => {
    let idle: number | null = null;
    let timer: number | null = null;
    const start = () => {
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => setPageLoaded(true), { timeout: 1500 });
      } else {
        timer = window.setTimeout(() => setPageLoaded(true), 200);
      }
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (idle !== null) window.cancelIdleCallback(idle);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  // --- scroll position -> continuous beat -------------------------------------
  const update = useCallback(() => {
    const content = contentRef.current;
    if (!content || centers.current.length === 0) return;
    const probe = -content.getBoundingClientRect().top + window.innerHeight / 2;
    const beat = beatAt(probe, centers.current);
    progress.current.beat = beat;
    const next = Math.round(beat);
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
  }, []);

  const measure = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    const top = content.getBoundingClientRect().top;
    centers.current = Array.from(
      content.querySelectorAll<HTMLElement>(BEAT_SELECTOR),
    ).map((block) => {
      const rect = block.getBoundingClientRect();
      return rect.top - top + rect.height / 2;
    });
    update();
  }, [update]);

  useEffect(() => {
    measure();
    const content = contentRef.current;
    const observer = new ResizeObserver(measure);
    if (content) observer.observe(content);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
    };
  }, [measure, update]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleFailed = useCallback(() => {
    setFailed(true);
    setReady(false);
  }, []);

  const note =
    mode.kind === "poster"
      ? POSTER_NOTES[mode.reason]
      : showScene && !ready
        ? "Preparing 3D"
        : null;
  const total = railLabels.length;
  const canOptIn = mode.kind === "poster" && mode.canOptIn;
  const quality = mode.kind === "scene" ? QUALITY_PROFILES[mode.level] : null;
  const optIn = useCallback(() => setOptedIn(true), []);
  const stageState = useMemo<HeroStageState>(
    () => ({ note, canOptIn, optIn }),
    [note, canOptIn, optIn],
  );

  return (
    <HeroStageContext value={stageState}>
      <div className={cn("relative", className)}>
        {/* ------------------------------------------------------------ Stage */}
        <div
          ref={stageRef}
          data-hero-stage={
            mode.kind === "poster" ? mode.reason : sceneVisible ? "ready" : "loading"
          }
          // The still's dimension labels step back once the story's cards
          // are over it (see HeroPoster).
          data-story={active > 0 ? "true" : "false"}
          className="group/stage sticky top-(--nav-h) h-[calc(100svh-var(--nav-h))] overflow-hidden bg-void"
          aria-hidden="true"
        >
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-(--duration-cinematic)",
              sceneVisible ? "opacity-0" : "opacity-100",
            )}
          >
            {poster}
          </div>

          {showScene && quality ? (
            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-(--duration-cinematic)",
                sceneVisible ? "opacity-100" : "opacity-0",
              )}
            >
              <ModelErrorBoundary label="hero" fallback={null} onError={handleFailed}>
                <HeroScene
                  build={build}
                  beats={beats}
                  progressRef={progress}
                  active={active}
                  running={canRender}
                  quality={quality}
                  onReady={handleReady}
                  onContextLost={handleFailed}
                />
              </ModelErrorBoundary>
            </div>
          ) : null}

          {/* Legibility: darken behind the text column (left on wide screens,
            top on phones where the headline sits above the car). */}
          <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-void/90 via-void/35 to-transparent max-md:bg-linear-to-b max-md:from-void/85 max-md:via-void/25 max-md:to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-t from-void to-transparent" />
        </div>

        {/* ------------------------------------------------ Progress (phones) */}
        {total > 1 ? (
          <div
            className="pointer-events-none absolute inset-0 z-20 lg:hidden"
            aria-hidden="true"
          >
            <div className="sticky top-(--nav-h) h-px bg-line-subtle">
              <div
                className="h-px bg-gold-500 transition-[width] duration-500"
                style={{ width: `${(active / Math.max(1, total - 1)) * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------------ Content */}
        <div ref={contentRef} className="relative z-10 -mt-[calc(100svh-var(--nav-h))]">
          {children}
        </div>

        {/* ------------------------------------------------ Progress rail */}
        {total > 1 ? (
          <nav
            aria-label="Story"
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 z-20 hidden transition-opacity duration-500 lg:block",
              // At the hero the rail would sit on the car; it belongs to the story.
              active === 0 ? "invisible opacity-0" : "visible opacity-100",
            )}
          >
            <ol className="pointer-events-auto sticky top-[calc(50vh+2rem)] mr-6 -translate-y-1/2 space-y-3.5 py-6 xl:mr-10">
              {railLabels.map((entry, index) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    aria-current={active === index ? "step" : undefined}
                    className="group flex min-h-6 w-full items-center justify-end gap-3 outline-offset-4"
                  >
                    <span
                      className={cn(
                        "text-caption transition-colors duration-300",
                        active === index
                          ? "text-ink-50"
                          : "text-ink-500 group-hover:text-ink-200",
                      )}
                    >
                      {entry.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block h-px transition-all duration-500",
                        active === index
                          ? "w-10 bg-gold-500"
                          : "w-4 bg-line-strong group-hover:w-6",
                      )}
                    />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
      </div>
    </HeroStageContext>
  );
}
