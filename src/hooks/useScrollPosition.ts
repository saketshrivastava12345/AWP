"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Distance, in pixels, after which the page counts as scrolled. */
export const SCROLLED_THRESHOLD = 24;

function subscribeToScroll(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange, { passive: true });
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/**
 * Whether the window has scrolled past `threshold` pixels.
 *
 * Built on useSyncExternalStore with a BOOLEAN snapshot, so the component
 * re-renders only when the threshold is crossed, not on every scroll frame.
 * (The previous hook stored the raw position in state and re-rendered the
 * whole navbar sixty times a second.) Anything that needs the continuous
 * position — the scroll progress bar — writes to the DOM instead of React.
 */
export function useScrolledPast(threshold: number = SCROLLED_THRESHOLD): boolean {
  const getSnapshot = useCallback(() => window.scrollY > threshold, [threshold]);
  return useSyncExternalStore(subscribeToScroll, getSnapshot, () => false);
}

/** Fraction of the document scrolled, 0 to 1. For imperative callers. */
export function readScrollProgress(): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return Math.min(1, Math.max(0, window.scrollY / scrollable));
}
