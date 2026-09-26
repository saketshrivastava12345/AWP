"use client";

import { useMediaQuery } from "./useMediaQuery";

/**
 * Tracks `prefers-reduced-motion`.
 *
 * The server value is `true` — the still version — on purpose. If we assumed
 * "animate" and the visitor had reduced motion enabled, they would see the
 * animation begin before hydration corrected it. Assuming the other way round
 * is invisible: the animation simply starts a frame later.
 *
 * Every GSAP timeline and scroll sequence checks this. The media query in
 * globals.css is the backstop for plain CSS transitions.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)", true);
}
