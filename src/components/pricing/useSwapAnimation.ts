"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A short settle-in when `key` changes (a new market's figure replacing the
 * last one), and nothing on first render or under reduced motion.
 *
 * Uses the Web Animations API with no fill, so the element is left with no
 * transform once the animation ends: a lingering transform would make it the
 * containing block for fixed descendants (see the page-enter note in
 * globals.css).
 */
export function useSwapAnimation<T extends HTMLElement>(
  key: string,
  { distance = 6, duration = 420 }: { distance?: number; duration?: number } = {},
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const previous = useRef(key);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    const element = ref.current;
    if (reducedMotion || !element || typeof element.animate !== "function") return;
    element.animate(
      [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [key, reducedMotion, distance, duration]);

  return ref;
}
