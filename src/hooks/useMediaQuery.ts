"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribe to a CSS media query.
 *
 * Uses `useSyncExternalStore` rather than `useState` + `useEffect`: a media
 * query is an external mutable source, and reading it into state inside an
 * effect causes an extra render pass on every mount (which React's
 * `set-state-in-effect` rule correctly flags).
 *
 * `serverValue` is what to assume during server rendering and hydration, where
 * no media query can be evaluated. Choose the safe default for the caller —
 * see useReducedMotion for a case where that is deliberately `true`.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
