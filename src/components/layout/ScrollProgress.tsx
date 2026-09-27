"use client";

import { useEffect, useRef } from "react";
import { readScrollProgress } from "@/hooks/useScrollPosition";
import { cn } from "@/lib/utils";
import styles from "./chrome.module.css";

/**
 * A glowing cyan→violet rule that fills as the page scrolls. Used along the
 * navbar's bottom edge and by SubNav's `progress` option.
 *
 * It never re-renders React. Browsers with scroll-driven animations run it
 * entirely in CSS (see chrome.module.css); elsewhere a passive, rAF-coalesced
 * listener writes the transform straight to the element.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()"))
      return;

    let frame = 0;
    const paint = () => {
      frame = 0;
      bar.style.transform = `scaleX(${readScrollProgress()})`;
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    // Streamed sections and late images change the page height, and with it
    // the progress, without any scroll event.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-0.5",
        "bg-[linear-gradient(90deg,var(--color-cyan-500),var(--color-cyan-300)_70%,var(--color-violet-400))]",
        "shadow-[0_0_8px_oklch(0.8_0.14_210/70%)]",
        styles.progress,
        className,
      )}
    />
  );
}
