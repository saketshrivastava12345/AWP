"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { CarBuild } from "@/lib/car-build";
import type { TourStop } from "@/lib/anatomy-tour";
import type { TourProgress } from "./StageDirector";

/**
 * The anatomy tour: a scroll-driven walk through one car's systems.
 *
 * Layout is CSS, not a scroll library: the 3D stage is `position: sticky` for
 * the height of the section while the text cards scroll over it in normal
 * flow. So the cards are ordinary server-rendered HTML — readable without
 * JavaScript, by screen readers, and by search engines — and the canvas is
 * scenery layered behind them.
 *
 * The stage is dynamically imported with ssr:false (three.js touches
 * `window`), mounts only as the section nears the viewport, and stops
 * rendering whenever it scrolls out of view.
 */

const ShowcaseStage = dynamic(
  () => import("./ShowcaseStage").then((m) => m.ShowcaseStage),
  {
    ssr: false,
  },
);

function Stats({ stats }: { stats: TourStop["stats"] }) {
  if (stats.length === 0) return null;
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-line-subtle pt-4">
      {stats.map(({ label, value }, index) => (
        <div key={label} className={cn("min-w-0", index >= 4 && "max-sm:hidden")}>
          <dt className="text-label text-[8px]">{label}</dt>
          <dd
            className="tabular mt-1 truncate font-mono text-[13px] text-ink-50"
            title={value}
          >
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StopCard({
  stop,
  index,
  total,
}: {
  stop: TourStop;
  index: number;
  total: number;
}) {
  return (
    <article className="w-full max-w-md border border-line bg-void/80 p-5 backdrop-blur-md sm:p-7">
      <p className="text-label text-gold-400">
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")} — {stop.label}
      </p>
      <h2 className="mt-3 font-display text-lg leading-snug tracking-[0.04em] text-ink-50 sm:text-2xl">
        {stop.title}
      </h2>
      {/* On phones the card shares the screen with the car, so it is kept to
          the essentials; the full specification is further down the page. */}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-300 max-sm:line-clamp-3 sm:text-sm">
        {stop.body}
      </p>

      <Stats stats={stop.stats} />

      {stop.features.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-line-subtle pt-4">
          {stop.features.map((feature, position) => (
            <li
              key={feature.name}
              className={cn(
                "flex gap-2.5 text-xs leading-relaxed",
                position >= 2 && "max-sm:hidden",
              )}
            >
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

      {stop.components.length > 0 ? (
        <ul className="mt-5 space-y-3 border-t border-line-subtle pt-4">
          {stop.components.map((component, position) => (
            <li key={component.slug} className={cn(position >= 1 && "max-sm:hidden")}>
              <Link
                href={`/parts/${component.slug}`}
                className="font-display text-[10px] tracking-[0.14em] text-gold-300 uppercase transition-colors hover:text-gold-200"
              >
                {component.name} →
              </Link>
              {component.note ? (
                <p className="mt-1 text-xs leading-relaxed text-ink-100">
                  <span className="text-gold-400">This car: </span>
                  {component.note}
                </p>
              ) : component.summary ? (
                <p className="mt-1 text-xs leading-relaxed text-ink-400 max-sm:hidden">
                  {component.summary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function CarShowcase({
  build,
  stops,
  intro,
  label,
}: {
  build: CarBuild;
  stops: TourStop[];
  /** The page header, shown over the opening shot. */
  intro: ReactNode;
  /** Accessible name, e.g. "Porsche 911 GT3". */
  label: string;
}) {
  const isMobile = useIsMobile();
  const reducedMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const centers = useRef<number[]>([]);
  const progress = useRef<TourProgress>({ beat: 0 });
  const activeRef = useRef(0);

  const [active, setActive] = useState(0);
  const [near, setNear] = useState(false);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  // Map the scroll position onto the stops: beat 2.5 means halfway between
  // the second and third card, measured at the middle of the viewport.
  const update = useCallback(() => {
    const section = sectionRef.current;
    const points = centers.current;
    if (!section || points.length === 0) return;
    const probe = -section.getBoundingClientRect().top + window.innerHeight / 2;
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
  }, []);

  const measure = useCallback(() => {
    centers.current = stepRefs.current.map((step) =>
      step ? step.offsetTop + step.offsetHeight / 2 : 0,
    );
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

  // Mount the 3D stage just before it is needed, and only render while the
  // section is actually on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const mount = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: "300px" },
    );
    const visible = new IntersectionObserver((entries) => {
      // A batch can hold several stale entries for one target; the last is
      // the current state.
      const entry = entries.at(-1);
      if (entry) setRunning(entry.isIntersecting);
    });
    mount.observe(section);
    visible.observe(section);
    return () => {
      mount.disconnect();
      visible.disconnect();
    };
  }, []);

  const jumpTo = (index: number) => {
    stepRefs.current[index]?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });
  };

  const total = stops.length;

  return (
    <section ref={sectionRef} className="relative" aria-label={`Anatomy tour: ${label}`}>
      {/* ------------------------------------------------ Sticky 3D stage */}
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-void" aria-hidden="true">
        {/* Poster until the first frame: a pool of light where the car will be. */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            ready ? "opacity-0" : "opacity-100",
          )}
        >
          <div className="absolute top-[42%] left-[62%] size-[36rem] -translate-1/2 rounded-full bg-gold-800/15 blur-[120px] max-md:left-1/2" />
          <p className="absolute top-[48%] left-[62%] -translate-1/2 font-display text-[9px] tracking-[0.24em] text-ink-500 uppercase max-md:left-1/2">
            Preparing 3D model
          </p>
        </div>

        {near ? (
          <div className="absolute inset-0">
            <ShowcaseStage
              build={build}
              stops={stops}
              progressRef={progress}
              active={active}
              reducedMotion={reducedMotion}
              lowDetail={isMobile}
              running={running}
              onReady={() => setReady(true)}
            />
          </div>
        ) : null}

        {/* Legibility: darken behind the text column and at the bottom. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/85 via-void/20 to-transparent max-md:bg-gradient-to-t max-md:from-void/90 max-md:via-void/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-void to-transparent" />
      </div>

      {/* ------------------------------------------------ Progress rail */}
      <nav
        aria-label="Tour stops"
        className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden lg:block"
      >
        <ol className="pointer-events-auto sticky top-[50vh] mr-6 -translate-y-1/2 space-y-3.5 py-6 xl:mr-10">
          {["Overview", ...stops.map((stop) => stop.label)].map((name, index) => (
            <li key={name}>
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

      {/* Phones: a hairline progress bar under the navbar. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 bottom-0 z-20 lg:hidden"
        aria-hidden="true"
      >
        <div className="sticky top-16 h-px bg-line">
          <div
            className="h-px bg-gold-500 transition-[width] duration-500"
            style={{ width: `${(active / Math.max(1, total)) * 100}%` }}
          />
        </div>
      </div>

      {/* ------------------------------------------------ Cards */}
      <div ref={stepsRef} className="relative z-10 -mt-[100svh]">
        <div
          ref={(node) => {
            stepRefs.current[0] = node;
          }}
          className="flex min-h-[100svh] items-end pt-24 pb-10 md:items-center md:pb-16"
        >
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
            <div className="max-w-xl">{intro}</div>
            <button
              type="button"
              onClick={() => jumpTo(1)}
              className="mt-10 flex items-center gap-3 text-label transition-colors hover:text-gold-300"
            >
              <span className="flex size-8 items-center justify-center rounded-full border border-line-strong">
                <ChevronDown
                  className="size-3.5 motion-safe:animate-bounce"
                  aria-hidden="true"
                />
              </span>
              Scroll to explore the anatomy
            </button>
          </div>
        </div>

        {stops.map((stop, index) => (
          <div
            key={stop.id}
            ref={(node) => {
              stepRefs.current[index + 1] = node;
            }}
            className="flex min-h-[100svh] items-end pt-24 pb-10 md:items-center md:pb-0"
          >
            <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
              <StopCard stop={stop} index={index + 1} total={total} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
