"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { renderArbiter } from "@/lib/viewer-arbiter";
import { probeWebGL } from "@/lib/viewer-webgl";

/**
 * When a canvas should exist, and when it may draw.
 *
 *   mounted    — near the viewport: mount at half a screen away, unmount only
 *                when more than a screen and a half away. The gap between the
 *                two is deliberate: scrolling back and forth near the edge must
 *                not destroy and rebuild a WebGL context every time.
 *   visible    — actually on screen.
 *   canRender  — visible AND holding the page's render slot: when two scenes
 *                are on screen at once only the more visible one draws.
 */
export function useSceneLifecycle(
  ref: RefObject<HTMLElement | null>,
  id: string,
  { mountMargin = "50%", unmountMargin = "150%" } = {},
): { mounted: boolean; visible: boolean; canRender: boolean } {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    // A batch can hold several stale entries for one target; the last is
    // the current state.
    const near = new IntersectionObserver(
      (entries) => {
        if (entries.at(-1)?.isIntersecting) setMounted(true);
      },
      { rootMargin: `${mountMargin} 0px` },
    );
    const far = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry && !entry.isIntersecting) setMounted(false);
      },
      { rootMargin: `${unmountMargin} 0px` },
    );
    const seen = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        setVisible(entry.isIntersecting);
        const { width, height } = entry.intersectionRect;
        renderArbiter.report(id, entry.isIntersecting ? width * height : 0);
      },
      { threshold: Array.from({ length: 21 }, (_, index) => index / 20) },
    );
    near.observe(element);
    far.observe(element);
    seen.observe(element);
    return () => {
      near.disconnect();
      far.disconnect();
      seen.disconnect();
      renderArbiter.remove(id);
    };
  }, [ref, id, mountMargin, unmountMargin]);

  const winner = useSyncExternalStore(
    renderArbiter.subscribe,
    renderArbiter.winner,
    () => null,
  );
  return { mounted, visible, canRender: visible && winner === id };
}

const noSubscribe = () => () => {};

/**
 * Whether WebGL is available: null during server rendering and hydration,
 * then the answer from a one-off probe.
 */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore(
    noSubscribe,
    () => probeWebGL().supported,
    () => null,
  );
}
