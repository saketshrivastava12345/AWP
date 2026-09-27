"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import {
  BLUEPRINT_LABELS,
  createBlueprintOverlay,
  focusCardAt,
  stepGroups,
  type BlueprintStep,
} from "@/lib/blueprint";
import { DIMENSION_LABELS, publishedMeasurements } from "@/lib/viewer-dimensions";
import { formatNumber } from "@/lib/format";
import { stableKey } from "@/lib/viewer-lru";
import type { TourProgress } from "./StageDirector";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { useSceneLifecycle, useWebGLSupport } from "./useSceneLifecycle";

/**
 * The blueprint: the anatomy tour as a scroll-driven exploded drawing.
 *
 * Scroll into it and the rendered car turns into a line drawing over a grid,
 * with its published dimensions; keep scrolling and it comes apart one
 * subsystem per card, the part in motion drawn in gold and the rest stepping
 * back; the last card holds the whole car exploded with every group
 * labelled. Scrolling back puts it together again.
 *
 * Layout is CSS, not a scroll library: the 3D stage is `position: sticky`
 * for the height of the section while the cards scroll in normal flow — over
 * the stage on wide screens, beneath a shorter stage on phones. So the cards
 * are ordinary HTML, readable without JavaScript, by screen readers and by
 * search engines, and the canvas is scenery.
 *
 * The stage is dynamically imported with ssr:false (three.js touches
 * `window`), mounts as it nears the viewport and unmounts only when far away,
 * and renders only while it is on screen and holds the page's render slot.
 * Without WebGL, if the scene fails, or when the visitor prefers reduced
 * motion, the stage shows a static exploded drawing (`fallback`, rendered on
 * the server from the same layout) and the cards read as plain text.
 */

const ShowcaseStage = dynamic(
  () => import("./ShowcaseStage").then((m) => m.ShowcaseStage),
  { ssr: false },
);

/** Height of the fixed navbar, px (h-16). */
const NAV_HEIGHT = 64;

/** Phones: how far below the stage a card's top sits when it is the current one. */
const PHONE_READ = 72;

const isNarrow = () => window.matchMedia("(max-width: 767px)").matches;

function Stats({ stats }: { stats: BlueprintStep["stats"] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-line-subtle pt-4">
      {stats.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-label text-[8px]">{label}</dt>
          <dd className="tabular mt-1 font-mono text-[13px] break-words text-ink-50">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StepCard({
  step,
  index,
  total,
  legend,
}: {
  step: BlueprintStep;
  index: number;
  total: number;
  /** The groups in the order they came off: the finale's key to its labels. */
  legend: readonly ViewerGroup[];
}) {
  const headingId = `blueprint-${step.id}`;
  return (
    <article
      aria-labelledby={headingId}
      className="relative w-full max-w-md border border-line bg-void/85 p-5 backdrop-blur-md sm:p-7"
    >
      <p className="text-label text-gold-400">
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")} — {step.label}
      </p>
      <h3
        id={headingId}
        className="mt-3 font-display text-lg leading-snug tracking-[0.04em] text-ink-50 sm:text-2xl"
      >
        {step.title}
      </h3>
      {step.body ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-300 sm:text-sm">
          {step.body}
        </p>
      ) : null}

      <Stats stats={step.stats} />

      {step.features.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-line-subtle pt-4">
          {step.features.map((feature) => (
            <li key={feature.name} className="flex gap-2.5 text-xs leading-relaxed">
              <span
                className="mt-1.5 size-1 shrink-0 rounded-full bg-gold-500"
                aria-hidden="true"
              />
              <span>
                <span className="text-ink-100">{feature.name}</span>
                {feature.note ? (
                  <span className="text-ink-400"> — {feature.note}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {step.components.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-line-subtle pt-4">
          {step.components.map((component, position) => (
            <li key={component.slug}>
              <Link
                href={`/parts/${component.slug}`}
                className="inline-flex min-h-6 items-center font-display text-[10px] tracking-[0.14em] text-gold-300 uppercase transition-colors hover:text-gold-200"
              >
                {component.name} →
              </Link>
              {component.note ? (
                <p className="mt-1 text-xs leading-relaxed text-ink-100">
                  <span className="text-gold-400">This car: </span>
                  {component.note}
                </p>
              ) : component.summary ? (
                <p
                  className={cn(
                    "mt-1 text-xs leading-relaxed text-ink-400",
                    // The first two explain themselves; the rest are links.
                    position >= 2 && "hidden",
                  )}
                >
                  {component.summary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {step.kind === "finale" && legend.length > 0 ? (
        <ol className="mt-5 grid grid-cols-2 gap-x-5 gap-y-1.5 border-t border-line-subtle pt-4">
          {legend.map((group, position) => (
            <li
              key={group}
              className="flex gap-2 font-mono text-micro tracking-hud uppercase"
            >
              <span className="text-gold-500">
                {String(position + 1).padStart(2, "0")}
              </span>
              <span className="text-ink-200">{BLUEPRINT_LABELS[group]}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {step.group ? (
        // Handled by the page's viewer (DetailViewer): scrolls to it and
        // opens this subsystem. Without JavaScript it is a plain anchor.
        <a
          href="#explore-3d"
          data-inspect={step.group}
          className="mt-5 flex min-h-11 items-center justify-between gap-3 border-t border-line-subtle pt-4 font-display text-[10px] tracking-[0.16em] text-ink-200 uppercase transition-colors hover:text-gold-300"
        >
          Inspect in the 3D viewer
          <ArrowUpRight className="size-3.5 text-gold-500" aria-hidden="true" />
        </a>
      ) : null}
    </article>
  );
}

export function CarShowcase({
  build,
  steps,
  intro,
  label,
  fallback,
}: {
  build: CarBuild;
  /** The blueprint's cards (buildBlueprint), intro and finale included. */
  steps: BlueprintStep[];
  /** The chapter header, shown over the opening shot. */
  intro: ReactNode;
  /** Accessible name, e.g. "Porsche 911 GT3". */
  label: string;
  /** Static exploded drawing for reduced motion and devices without WebGL. */
  fallback?: ReactNode;
}) {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();
  const webgl = useWebGLSupport();
  const id = useId();

  const groups = useMemo(() => stepGroups(steps), [steps]);
  const measurements = useMemo(() => publishedMeasurements(build), [build]);
  const overlay = useMemo(() => createBlueprintOverlay(), []);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const centers = useRef<number[]>([]);
  const progress = useRef<TourProgress>({ beat: 0 });
  const activeRef = useRef(0);
  const focusRef = useRef(0);

  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState(0);
  const [ready, setReady] = useState(false);
  const buildKey = stableKey(build);
  // A failure belongs to the car that failed; another car gets its own try.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failed = failedKey === buildKey;
  const { mounted, canRender } = useSceneLifecycle(stageRef, `tour${id}`);
  const handleReady = useCallback(() => setReady(true), []);
  const handleFailed = useCallback(() => setFailedKey(buildKey), [buildKey]);
  // Reduced motion gets the static drawing: nothing on this stage moves.
  const still = webgl === false || failed || reducedMotion;

  /**
   * The reading position, in viewport pixels: the middle of the screen, where
   * a card's middle arrives. On phones the cards pass under a short stage, so
   * there it is just below the stage, where a card's heading arrives.
   */
  const probeY = useCallback(() => {
    const stage = stageRef.current;
    if (!isNarrow() || !stage) return window.innerHeight / 2;
    return NAV_HEIGHT + stage.offsetHeight + PHONE_READ;
  }, []);

  // Map the scroll position onto the cards: beat 2.5 means halfway between
  // the third and fourth card, measured at the reading position.
  const update = useCallback(() => {
    const section = sectionRef.current;
    const points = centers.current;
    if (!section || points.length === 0) return;
    const probe = -section.getBoundingClientRect().top + probeY();
    let beat = 0;
    if (probe >= (points.at(-1) ?? 0)) beat = points.length - 1;
    else {
      for (let index = 0; index < points.length - 1; index += 1) {
        const from = points[index] ?? 0;
        const to = points[index + 1] ?? from;
        if (probe < to) {
          beat = index + Math.max(0, (probe - from) / Math.max(1, to - from));
          break;
        }
      }
    }
    progress.current.beat = beat;
    const next = Math.round(beat);
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
    }
    const nextFocus = focusCardAt(beat, groups.length);
    if (nextFocus !== focusRef.current) {
      focusRef.current = nextFocus;
      setFocus(nextFocus);
    }
  }, [groups.length, probeY]);

  const measure = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const top = section.getBoundingClientRect().top;
    const narrow = isNarrow();
    centers.current = stepRefs.current.map((step) => {
      if (!step) return 0;
      const rect = step.getBoundingClientRect();
      return rect.top - top + (narrow ? PHONE_READ : rect.height / 2);
    });
    update();
  }, [update]);

  useEffect(() => {
    measure();
    const steps = stepsRef.current;
    const observer = new ResizeObserver(measure);
    if (steps) observer.observe(steps);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", measure);
    };
  }, [measure, update]);

  const jumpTo = (index: number) => {
    const section = sectionRef.current;
    const center = centers.current[index];
    if (!section || center === undefined) return;
    const top = window.scrollY + section.getBoundingClientRect().top + center - probeY();
    window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const cards = steps.length + 1;
  const railNames = ["Overview", ...steps.map((step) => step.label)];
  const current = railNames[active] ?? "";

  return (
    <section
      ref={sectionRef}
      className="relative"
      aria-label={`Blueprint: ${label}, taken apart system by system`}
    >
      {/* ------------------------------------------------ Sticky 3D stage */}
      <div
        ref={stageRef}
        className="sticky top-16 z-20 h-[46svh] overflow-hidden border-b border-line-subtle bg-void md:top-0 md:z-auto md:h-[100svh] md:border-b-0"
        aria-hidden="true"
      >
        {/* Poster until the first frame: a pool of light where the car will be. */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            ready && !still ? "opacity-0" : "opacity-100",
          )}
        >
          {still && fallback ? (
            <div className="absolute inset-0 flex items-center justify-center tech-grid p-4 pt-8 md:pr-16 md:pl-[42%] lg:pr-56 lg:pl-[48%]">
              {fallback}
            </div>
          ) : (
            <>
              <div className="absolute top-[42%] left-[62%] size-[36rem] -translate-1/2 rounded-full bg-gold-800/15 blur-[120px] max-md:left-1/2" />
              <p className="absolute top-[48%] left-[62%] -translate-1/2 font-display text-[9px] tracking-[0.24em] text-ink-500 uppercase max-md:left-1/2">
                {webgl === false || failed
                  ? "3D view unavailable on this device"
                  : "Preparing 3D model"}
              </p>
            </>
          )}
        </div>

        {mounted && webgl === true && !failed && !reducedMotion ? (
          <div className="absolute inset-0">
            <ModelErrorBoundary
              label="tour"
              resetKeys={[buildKey]}
              fallback={null}
              onError={handleFailed}
            >
              <ShowcaseStage
                build={build}
                groups={groups}
                progressRef={progress}
                focus={focus}
                overlay={overlay}
                reducedMotion={reducedMotion}
                lowDetail={isMobile}
                running={canRender}
                onReady={handleReady}
              />
            </ModelErrorBoundary>
          </div>
        ) : null}

        {/* The drawing's paper: a screen-space grid and a title block, faded
            in with the blueprint by the scene. */}
        {!still ? (
          <div
            ref={(node) => {
              if (node) overlay.chrome.set("grid", node);
              else overlay.chrome.delete("grid");
            }}
            className="pointer-events-none absolute inset-0 opacity-0"
          >
            <div className="absolute inset-0 tech-grid opacity-60" />
            <div className="absolute right-5 bottom-4 hidden text-right md:block lg:right-40">
              <p className="text-hud text-gold-400">Blueprint · exploded view</p>
              <p className="mt-1 text-hud text-ink-500">
                {measurements.length > 0
                  ? "Dimension lines: published figures only"
                  : "No published dimensions"}
              </p>
            </div>
          </div>
        ) : null}

        {/* Legibility: darken behind the text column (wide screens). */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/85 via-void/15 to-transparent max-md:hidden" />
        {/* …and behind the step rail. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-56 bg-gradient-to-l from-void/80 to-transparent lg:block" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void to-transparent max-md:h-10" />

        {/* Labels, positioned by the scene every frame. */}
        {!still ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {measurements.map(({ id: dimension, mm }) => (
              <div
                key={dimension}
                ref={(node) => {
                  if (node) overlay.dimensions.set(dimension, node);
                  else overlay.dimensions.delete(dimension);
                }}
                className="absolute top-0 left-0 opacity-0 will-change-transform"
              >
                <div className="flex -translate-1/2 items-baseline gap-1.5 border border-gold-700/50 bg-void/85 px-1.5 py-1 whitespace-nowrap">
                  <span className="font-mono text-micro leading-none tracking-hud text-ink-300 uppercase max-md:hidden">
                    {DIMENSION_LABELS[dimension]}
                  </span>
                  <span className="tabular font-mono text-micro leading-none text-gold-200 md:text-xs md:leading-none">
                    {formatNumber(mm)} mm
                  </span>
                </div>
              </div>
            ))}
            {groups.map((group, index) => (
              <div
                key={group}
                ref={(node) => {
                  if (node) overlay.groups.set(group, node);
                  else overlay.groups.delete(group);
                }}
                className="absolute top-0 left-0 opacity-0 will-change-transform"
              >
                {/* The point sits on the part; the scene sets the leader's
                    length (--lead) so neighbouring labels never overlap. */}
                <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center">
                  <span className="border border-gold-700/60 bg-void/85 px-1.5 py-1 font-mono text-nano leading-none tracking-hud whitespace-nowrap text-gold-200 uppercase md:text-micro md:leading-none">
                    <span className="text-gold-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {/* Phones: the number alone; the finale card is the key. */}
                    <span className="max-md:hidden"> {BLUEPRINT_LABELS[group]}</span>
                  </span>
                  <span className="h-(--lead) w-px bg-gold-500/60" />
                  <span className="-mb-[3px] size-1.5 rounded-full border border-gold-300 bg-gold-500/50" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Phones: which card this is, and a hairline progress bar. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 md:hidden">
          <p className="px-5 pb-2 text-hud text-gold-400">
            {String(active).padStart(2, "0")} / {String(cards - 1).padStart(2, "0")} ·{" "}
            {current}
          </p>
          <div className="h-px bg-line">
            <div
              className="h-px bg-gold-500 transition-[width] duration-500"
              style={{ width: `${(active / Math.max(1, cards - 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ Progress rail */}
      <nav
        aria-label="Blueprint steps"
        className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden lg:block"
      >
        {/* A viewport-tall sticky column with the list centred in it: the
            rail stays inside the section at both ends instead of hanging
            half its height over the section above (a translated list did). */}
        <ol className="sticky top-0 mr-6 flex h-[100svh] flex-col justify-center gap-3 py-20 xl:mr-10">
          {railNames.map((name, index) => (
            <li key={`${index}-${name}`} className="pointer-events-auto">
              <button
                type="button"
                onClick={() => jumpTo(index)}
                aria-current={active === index ? "step" : undefined}
                className="group flex w-full items-center justify-end gap-3"
              >
                <span
                  className={cn(
                    "font-display text-[9px] tracking-[0.2em] uppercase transition-colors duration-300",
                    active === index
                      ? "text-gold-300"
                      : "text-ink-500 group-hover:text-ink-200",
                  )}
                >
                  {name}
                </span>
                <span
                  className={cn(
                    "block h-px transition-all duration-500",
                    active === index
                      ? "w-10 bg-gold-500"
                      : "w-4 bg-line-strong group-hover:w-6",
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {/* ------------------------------------------------ Cards */}
      <div ref={stepsRef} className="relative z-10 md:-mt-[100svh]">
        <div
          ref={(node) => {
            stepRefs.current[0] = node;
          }}
          className="flex min-h-[60svh] items-start pt-8 pb-10 md:min-h-[100svh] md:items-center md:pt-24 md:pb-16"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="max-w-xl">{intro}</div>
            <button
              type="button"
              onClick={() => jumpTo(1)}
              className="mt-10 flex min-h-11 items-center gap-3 text-label transition-colors hover:text-gold-300"
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-line-strong">
                <ChevronDown
                  className="size-3.5 motion-safe:animate-bounce"
                  aria-hidden="true"
                />
              </span>
              Scroll to take it apart
            </button>
          </div>
        </div>

        {steps.map((step, index) => (
          <div
            key={step.id}
            ref={(node) => {
              stepRefs.current[index + 1] = node;
            }}
            className={cn(
              "flex items-start pt-6 pb-10 md:items-center md:pt-24 md:pb-0",
              step.kind === "group"
                ? "min-h-[64svh] md:min-h-[92svh]"
                : "min-h-[64svh] md:min-h-[100svh]",
            )}
          >
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
              <StepCard
                step={step}
                index={index + 1}
                total={steps.length}
                legend={groups}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
