"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/lib/site-config";
import { BOOT_SESSION_KEY } from "@/lib/boot-script";

/** Progress milestone reached once webfonts have loaded. */
const FONTS_READY_PROGRESS = 55;

/** Duration of the exit animation; must match the CSS in globals.css. */
const EXIT_MS = 700;

/**
 * Hard ceiling on how long the loading screen may stay up, regardless of what
 * the readiness signals or the frame loop are doing. A loading screen that
 * outlives its usefulness is worse than no loading screen at all.
 */
const MAX_VISIBLE_MS = 2600;

/**
 * Whether the loading screen has already played this session.
 *
 * Read from the `data-booted` attribute that the pre-paint inline script sets,
 * rather than from state populated in an effect: this way there is no extra
 * render pass, and the value is correct on the very first client render. It
 * never changes after load, so `subscribe` is a no-op.
 */
function useAlreadyBooted(): boolean {
  const subscribe = useCallback(() => () => {}, []);
  const getSnapshot = useCallback(
    () => document.documentElement.hasAttribute("data-booted"),
    [],
  );
  // The server cannot know, so it assumes a first visit and renders the
  // screen. The CSS rule hides it before paint when that turns out to be wrong.
  const getServerSnapshot = useCallback(() => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function LoadingScreen() {
  const alreadyBooted = useAlreadyBooted();
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);

  useEffect(() => {
    if (alreadyBooted) return;

    let frame = 0;

    // --- real readiness signals -------------------------------------------
    // Fonts matter here specifically: the wordmark and every stat figure use
    // Michroma, so painting before it loads would show the whole page reflow.
    void document.fonts?.ready.then(() => {
      targetRef.current = Math.max(targetRef.current, FONTS_READY_PROGRESS);
    });

    const onLoad = () => {
      targetRef.current = 100;
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    // Ease the displayed number toward whatever the real signals have reached,
    // so the counter moves smoothly rather than jumping between two values.
    //
    // The easing is deliberately time-based, not per-frame. A fixed
    // "move 8% of the remaining gap each frame" converges in a fixed number of
    // FRAMES, which means it takes four times as long at 15fps as at 60 — on a
    // throttled or slow device the visitor sits watching the counter crawl.
    // Using elapsed milliseconds makes convergence take the same ~0.6s
    // everywhere.
    const SPEED_PER_SECOND = 6;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.25);
      lastTime = now;
      const factor = 1 - Math.exp(-SPEED_PER_SECOND * deltaSeconds);

      setProgress((current) => {
        const target = targetRef.current;
        const next = current + (target - current) * factor;
        // Snap once we are within half a percent, so the counter always lands
        // on a whole number instead of asymptotically approaching it.
        return target - next < 0.5 ? target : next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);

    // --- guarantee the screen always finishes ------------------------------
    // requestAnimationFrame is PAUSED, not merely throttled, while a tab is
    // hidden or occluded. Relying on it alone means a visitor who switches tabs
    // mid-load comes back to a loading screen frozen at 99% — permanently stuck
    // behind an opaque overlay, with no way out but a reload.
    //
    // So completion is also driven by timers, which keep firing when hidden:
    //   - if the document is hidden, finish immediately (nobody is watching an
    //     animation they cannot see)
    //   - otherwise finish after a hard ceiling regardless of frame delivery
    const finish = () => setProgress(100);

    const onVisibilityChange = () => {
      if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.hidden) finish();

    const ceiling = setTimeout(finish, MAX_VISIBLE_MS);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearTimeout(ceiling);
    };
  }, [alreadyBooted]);

  const rounded = Math.min(100, Math.round(progress));

  // Derived rather than stored: the exit begins exactly when the counter is
  // full, so keeping it in state would only duplicate `progress`.
  const leaving = rounded >= 100;

  useEffect(() => {
    if (!leaving) return;

    try {
      sessionStorage.setItem(BOOT_SESSION_KEY, "1");
    } catch {
      // Private mode: the screen simply plays again on the next navigation.
    }

    const timer = setTimeout(() => setFinished(true), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (alreadyBooted || finished) return null;

  return (
    <div
      id="aurix-loading-screen"
      role="status"
      aria-live="polite"
      aria-label={`Loading, ${rounded} percent`}
      data-leaving={leaving ? "1" : undefined}
      className="grain fixed inset-0 z-[200] flex flex-col items-center justify-center bg-void"
    >
      <div className="relative z-10 w-full max-w-sm px-8 text-center">
        <p className="font-display text-2xl tracking-[0.42em] text-ink-50 sm:text-3xl">
          AURIX
        </p>
        <p className="mt-5 text-label">{siteConfig.tagline}</p>

        <div
          className="relative mt-12 h-px w-full overflow-hidden bg-surface-3"
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0 origin-left bg-gold-500"
            style={{ width: `${rounded}%` }}
          />
        </div>

        <div className="mt-5 flex items-baseline justify-between font-mono text-[10px]">
          <span className="tracking-[0.12em] text-ink-500 uppercase">
            Loading vehicle systems
          </span>
          <span className="tabular text-gold-300">
            {String(rounded).padStart(3, "0")}%
          </span>
        </div>
      </div>
    </div>
  );
}
