"use client";

import { useEffect } from "react";

/**
 * How many overlays currently hold the lock, and the body styles to put back
 * when the last one lets go. Module-level on purpose: locks nest (the search
 * palette opens over the mobile menu; a sheet can open over a page that has
 * the palette's shortcut), and restoring per-hook would let whichever overlay
 * closed LAST put back a stale "hidden" and leave the page unscrollable.
 */
let holders = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/**
 * CSS custom property holding the width the scrollbar used to occupy while
 * the page is locked. Fixed elements (the navbar) read it so they do not
 * shift sideways when a modal opens on a desktop with classic scrollbars.
 */
export const SCROLLBAR_GAP_VAR = "--aurix-scrollbar-gap";

/**
 * Prevents the page scrolling behind an open overlay.
 *
 * Compensates for the scrollbar's width so that locking does not shift the
 * layout sideways — the usual visible glitch when a modal opens.
 */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    if (holders === 0) {
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
        documentElement.style.setProperty(SCROLLBAR_GAP_VAR, `${scrollbarWidth}px`);
      }
    }
    holders += 1;

    return () => {
      holders = Math.max(0, holders - 1);
      if (holders === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        documentElement.style.removeProperty(SCROLLBAR_GAP_VAR);
        saved = null;
      }
    };
  }, [locked]);
}
