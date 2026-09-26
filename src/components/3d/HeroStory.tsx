"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { TourProgress } from "./StageDirector";
import type { StoryShotId } from "./tour-cameras";

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
});

/**
 * The home page's pinned scroll sequence.
 *
 * GSAP ScrollTrigger pins the section and turns the scroll into a continuous
 * beat (0 = first beat, 1 = the next, …) held in a ref. The scene reads it on
 * every frame and flies the camera through shots framed from the car's own
 * layout — the same Director the anatomy tour on a car's page uses. Writing a
 * ref rather than React state keeps sixty updates a second out of the render
 * cycle entirely.
 *
 * Fully disabled when the visitor prefers reduced motion: the section then
 * renders as a normal, un-pinned stack of captions, which is the honest
 * fallback rather than a degraded animation.
 */

export type StoryBeat = {
  /** Also names the camera shot (see storyShots). */
  id: StoryShotId;
  label: string;
  title: string;
  body: string;
};

const BEATS: StoryBeat[] = [
  {
    id: "front",
    label: "01 — Front",
    title: "It starts with the face",
    body: "Intakes, splitter and lighting are the first thing you read, and the first constraint the engineers work against: everything the radiators and brakes need has to pass through here.",
  },
  {
    id: "engine",
    label: "02 — Engine",
    title: "The source",
    body: "Displacement, aspiration and layout set the character long before the numbers do. Where the engine sits — ahead of the cabin, behind it or over the rear axle — decides how the whole car balances.",
  },
  {
    id: "interior",
    label: "03 — Interior",
    title: "Where it is driven from",
    body: "Seat position, wheel size and pedal geometry decide how much of the car actually reaches the driver.",
  },
  {
    id: "brakes",
    label: "04 — Brakes",
    title: "Stopping is the harder problem",
    body: "Accelerating is limited by power. Stopping is limited by heat — which is why disc diameter, venting and pad compound matter more than they look.",
  },
  {
    id: "rear",
    label: "05 — Rear",
    title: "What the air leaves behind",
    body: "The diffuser and wing manage the wake. Downforce is bought with drag, and the exchange rate is the central compromise of fast-car design.",
  },
  {
    id: "whole",
    label: "06 — The whole",
    title: "Engineered as one system",
    body: "No part of a car is designed alone. Every figure in this catalogue is the result of these decisions resolving against each other.",
  },
];

/** Stable across renders, so the scene builds its shots once. */
const BEAT_IDS = BEATS.map((beat) => beat.id);

export function HeroStory({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Mount the scene only once the story is close, and render only while it
  // is on screen: the home page should not pay for WebGL it is not showing.
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);

  // The scroll position the scene reads every frame. A ref, not state: sixty
  // React renders a second to move a camera would be absurd.
  const progressRef = useRef<TourProgress>({ beat: 0 });

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: container,
        start: "top top",
        end: `+=${BEATS.length * 70}%`,
        pin: true,
        // Explicit, because ScrollTrigger turns pin spacing OFF by default
        // when the pinned element's parent is a flex container — which the
        // page wrapper is. Without the spacer the sections after the story
        // scroll straight over the top of it.
        pinSpacing: true,
        onUpdate: (self) => {
          const count = BEATS.length;
          // Each beat owns an equal slice of the scroll, and the camera
          // arrives at a beat's shot in the middle of its slice.
          progressRef.current.beat = Math.min(
            count - 1,
            Math.max(0, self.progress * count - 0.5),
          );
          setActive(Math.min(count - 1, Math.floor(self.progress * count)));
        },
      });
    }, container);

    return () => context.revert();
  }, [reducedMotion, isMobile]);

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const container = containerRef.current;
    if (!container) return;
    // Read the LAST entry of a batch. Creating the pin re-parents the section,
    // so the first callback arrives with a stale zero-size entry ahead of the
    // real one — reading entries[0] left the scene unmounted for good.
    const approach = new IntersectionObserver(
      (entries) => {
        if (entries.at(-1)?.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    const onScreen = new IntersectionObserver((entries) => {
      const entry = entries.at(-1);
      if (entry) setVisible(entry.isIntersecting);
    });
    approach.observe(container);
    onScreen.observe(container);
    return () => {
      approach.disconnect();
      onScreen.disconnect();
    };
  }, [reducedMotion, isMobile]);

  // --- Reduced motion / mobile: a plain stack, no pinning, no canvas -------
  if (reducedMotion || isMobile) {
    return (
      <section className={cn("border-t border-line py-20", className)}>
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <p className="text-label">Anatomy of a drive</p>
          <ol className="mt-10 space-y-12">
            {BEATS.map((beat) => (
              <li
                key={beat.id}
                className="border-b border-line-subtle pb-10 last:border-0"
              >
                <p className="text-label">{beat.label}</p>
                <h3 className="mt-4 font-display text-lg tracking-[0.04em] text-ink-50">
                  {beat.title}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-400">
                  {beat.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const beat = BEATS[active] ?? BEATS[0];

  return (
    <section
      ref={containerRef}
      className={cn("relative h-screen overflow-hidden border-t border-line", className)}
      aria-label="Scroll story: anatomy of a car"
    >
      {/* HeroScene is dynamically imported with ssr:false, so no mounted flag
          is needed — it simply does not exist during server rendering. */}
      <div className="absolute inset-0">
        {near ? (
          <HeroScene
            beats={BEAT_IDS}
            progressRef={progressRef}
            active={active}
            running={visible}
          />
        ) : null}
      </div>

      {/* Caption panel */}
      <div className="pointer-events-none relative z-10 flex h-full items-end pb-16 sm:items-center sm:pb-0">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <div className="max-w-md">
            <p className="text-label">{beat?.label}</p>
            <h3
              key={beat?.id}
              className="mt-4 animate-rise-in font-display text-xl tracking-[0.04em] text-ink-50 sm:text-2xl"
            >
              {beat?.title}
            </h3>
            <p
              key={`${beat?.id}-body`}
              className="mt-4 animate-rise-in text-sm leading-relaxed text-ink-300"
            >
              {beat?.body}
            </p>

            {/* Progress rail */}
            <ol className="mt-10 flex gap-1.5" aria-hidden="true">
              {BEATS.map((entry, index) => (
                <li
                  key={entry.id}
                  className={cn(
                    "h-px flex-1 transition-colors duration-500",
                    index <= active ? "bg-gold-500" : "bg-surface-4",
                  )}
                />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
