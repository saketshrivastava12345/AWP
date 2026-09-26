"use client";

import { useEffect, useState } from "react";

export type ScrollPosition = {
  /** Distance scrolled from the top, in pixels. */
  y: number;
  /** Fraction of the scrollable height covered, 0 to 1. */
  progress: number;
  /** True once scrolled past a small threshold — used to solidify the navbar. */
  isScrolled: boolean;
};

const SCROLLED_THRESHOLD = 24;

/**
 * Scroll position and progress, sampled on animation frames.
 *
 * The listener is passive and coalesced into one rAF per frame, so it cannot
 * block scrolling however often the browser fires the event.
 */
export function useScrollPosition(): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    y: 0,
    progress: 0,
    isScrolled: false,
  });

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const y = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setPosition({
        y,
        progress: scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0,
        isScrolled: y > SCROLLED_THRESHOLD,
      });
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return position;
}
