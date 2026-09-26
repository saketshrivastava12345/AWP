"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const HeroScene = dynamic(() => import("./HeroScene").then((m) => m.HeroScene), {
  ssr: false,
});

/**
 * The home page's pinned scroll sequence.
 *
 * GSAP ScrollTrigger pins the hero and drives the camera through six beats.
 * The camera target is held in a plain object that the R3F scene reads on each
 * frame — tweening a ref rather than React state keeps sixty updates a second
 * out of the render cycle entirely.
 *
 * Fully disabled when the visitor prefers reduced motion: the section then
 * renders as a normal, un-pinned stack of captions, which is the honest
 * fallback rather than a degraded animation.
 */

export type StoryBeat = {
  id: string;
  label: string;
  title: string;
  body: string;
  /** Camera position for this beat. */
  camera: [number, number, number];
  target: [number, number, number];
};

const BEATS: StoryBeat[] = [
  {
    id: "front",
    label: "01 — Front",
    title: "It starts with the face",
    body: "Intakes, splitter and lighting are the first thing you read, and the first constraint the engineers work against: everything the radiators and brakes need has to pass through here.",
    camera: [0, 1.2, 6.6],
    target: [0, 0.6, 0.6],
  },
  {
    id: "engine",
    label: "02 — Engine",
    title: "The source",
    body: "Displacement, aspiration and layout set the character long before the numbers do. A flat-six sits low and changes the whole centre of gravity.",
    camera: [2.1, 2.0, 3.4],
    target: [0, 0.8, 1.5],
  },
  {
    id: "interior",
    label: "03 — Interior",
    title: "Where it is driven from",
    body: "Seat position, wheel size and pedal geometry decide how much of the car actually reaches the driver.",
    camera: [0.1, 1.5, -0.3],
    target: [0, 1.0, 2.2],
  },
  {
    id: "brakes",
    label: "04 — Brakes",
    title: "Stopping is the harder problem",
    body: "Accelerating is limited by power. Stopping is limited by heat — which is why disc diameter, venting and pad compound matter more than they look.",
    camera: [2.5, 0.6, 1.9],
    target: [0.9, 0.35, 1.35],
  },
  {
    id: "rear",
    label: "05 — Rear",
    title: "What the air leaves behind",
    body: "The diffuser and wing manage the wake. Downforce is bought with drag, and the exchange rate is the central compromise of fast-car design.",
    camera: [0, 1.4, -6.4],
    target: [0, 0.6, -0.5],
  },
  {
    id: "whole",
    label: "06 — The whole",
    title: "Engineered as one system",
    body: "No part of a car is designed alone. Every figure in this catalogue is the result of these decisions resolving against each other.",
    camera: [6.4, 1.8, 7.0],
    target: [0, 0.5, 0],
  },
];

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
};

export function HeroStory({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // The camera value the scene reads every frame. A ref, not state: sixty
  // React renders a second to move a camera would be absurd.
  const cameraRef = useRef<CameraState>({
    position: BEATS[0]?.camera ?? [6, 2, 7],
    target: BEATS[0]?.target ?? [0, 0.5, 0],
  });

  useEffect(() => {
    if (reducedMotion || isMobile) return;
    const container = containerRef.current;
    if (!container) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top",
          end: `+=${BEATS.length * 70}%`,
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            const index = Math.min(
              BEATS.length - 1,
              Math.floor(self.progress * BEATS.length),
            );
            setActive(index);
          },
        },
      });

      // One tween per transition, chained. Tweening the ref's contents means
      // the scene picks the change up on its next frame with no re-render.
      for (let index = 1; index < BEATS.length; index += 1) {
        const beat = BEATS[index];
        if (!beat) continue;
        timeline.to(cameraRef.current.position, {
          0: beat.camera[0],
          1: beat.camera[1],
          2: beat.camera[2],
          duration: 1,
          ease: "power2.inOut",
        });
        timeline.to(
          cameraRef.current.target,
          {
            0: beat.target[0],
            1: beat.target[1],
            2: beat.target[2],
            duration: 1,
            ease: "power2.inOut",
          },
          "<",
        );
      }
    }, container);

    return () => context.revert();
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
        <HeroScene cameraRef={cameraRef} lowDetail={false} />
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
