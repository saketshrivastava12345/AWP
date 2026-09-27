"use client";

import { useEffect, useRef } from "react";
import { formatFigure } from "@/lib/detail/figures";

/**
 * A figure that counts up once, the first time it scrolls into view.
 *
 * The server renders the FINAL value, so the number is correct with no
 * JavaScript, to search engines and to screen readers (which only ever get the
 * static copy — the animated digits are hidden from them). The client animates
 * only a figure that starts below the viewport: one already on screen at load
 * is left alone, because resetting it to zero would be a visible flash. Under
 * reduced motion it never animates.
 *
 * Digits are written straight to the DOM through a ref, so an animation costs
 * no React renders. Progress is measured in elapsed time, not frames, so it
 * takes the same ~1.1 s at any frame rate.
 *
 * Props:
 *   value      the final figure
 *   decimals   decimal places (1 for "3.4")
 *   durationMs animation length
 */
export function CountUp({
  value,
  decimals = 0,
  durationMs = 1100,
  className,
}: {
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = formatFigure(value, decimals);

  useEffect(() => {
    const element = ref.current;
    if (!element || !Number.isFinite(value)) return;
    const target = formatFigure(value, decimals);
    // The digits are written imperatively below, so re-assert the current
    // value first: a changed `value` must never leave an old figure showing.
    element.textContent = target;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already visible (or scrolled past): leave the final value alone.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    // Width is held by the invisible final value underneath, so writing
    // shorter digits during the count never shifts the layout.
    element.textContent = formatFigure(0, decimals);
    let frame = 0;

    const run = () => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        element.textContent = formatFigure(value * eased, decimals);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        // The last entry is the current state (see CLAUDE.md, Phase 10 bugs).
        const entry = entries[entries.length - 1];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(element);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      // Never leave a half-counted number behind.
      element.textContent = target;
    };
  }, [value, decimals, durationMs]);

  return (
    <span className={className}>
      <span className="relative inline-block tabular-nums">
        {/* Reserves the final width; invisible. */}
        <span aria-hidden="true" className="invisible">
          {final}
        </span>
        <span ref={ref} aria-hidden="true" className="absolute inset-0 text-right">
          {final}
        </span>
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
