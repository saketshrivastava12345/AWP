"use client";

import { useMediaQuery } from "./useMediaQuery";

/** Matches Tailwind's `md` breakpoint. */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * True on small viewports. Used to lower 3D detail and to swap side panels for
 * bottom sheets. Assumes desktop during server rendering.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY, false);
}
