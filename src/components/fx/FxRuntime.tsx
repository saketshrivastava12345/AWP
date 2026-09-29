"use client";

import { useEffect } from "react";
import { startFxRuntime } from "./fx-runtime";

/**
 * Mounts the FX runtime once, from the root layout. Renders nothing.
 *
 * Every motion-kit component (Reveal, CountUp, ScrambleText, TiltCard,
 * Magnetic, Parallax, Spotlight, CursorGlow) is a server component that only
 * emits data attributes; this one client component brings them all to life
 * with one set of observers and listeners. See fx-runtime.ts.
 */
export function FxRuntime() {
  useEffect(() => startFxRuntime(), []);
  return null;
}
