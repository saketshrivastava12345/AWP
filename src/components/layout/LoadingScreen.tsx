"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { siteConfig } from "@/lib/site-config";
import { BOOT_SESSION_KEY } from "@/lib/boot-script";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { LOADING_SCREEN_ID } from "./loading-screen-shared";
import styles from "./chrome.module.css";

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
 * When the CSS failsafe in chrome.module.css starts hiding the screen on its
 * own (its animation-delay). If the app only hydrates after that, the visitor
 * has already been shown the page and the screen must not come back.
 */
const FAILSAFE_MS = 6000;

let hydratedLate: boolean | null = null;
/** Decided once, at first read, so the snapshot below stays stable. */
function isLateHydration(): boolean {
  if (hydratedLate === null) hydratedLate = performance.now() >= FAILSAFE_MS;
  return hydratedLate;
}

const noSubscription = () => () => {};

/**
 * Whether the loading screen should be skipped: it already played this
 * session (the pre-paint inline script set `data-booted`), or hydration came
 * so late that the CSS failsafe has already revealed the page.
 *
 * Read through useSyncExternalStore rather than state populated in an effect,
 * so the value is right on the first client render with no extra pass. The
 * server cannot know, so it assumes a first visit and renders the screen; the
 * CSS rule for `data-booted` hides it before paint when that is wrong.
 */
function useSkipScreen(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => document.documentElement.hasAttribute("data-booted") || isLateHydration(),
    () => false,
  );
}

function rememberBooted() {
  try {
    sessionStorage.setItem(BOOT_SESSION_KEY, "1");
  } catch {
    // Private mode: the screen simply plays again on the next full load.
  }
}

export function LoadingScreen() {
  const skip = useSkipScreen();
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetRef = useRef(0);
  const shownRef = useRef(0);
  const screenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skip) {
      // A late hydration still counts as the intro having played.
      if (!document.documentElement.hasAttribute("data-booted")) rememberBooted();
      return;
    }

    // React owns the exit from here: stand the CSS failsafe down. Written to
    // the DOM directly — it is not render output, and must not re-render.
    screenRef.current?.setAttribute("data-hydrated", "");

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

    // Ease the displayed number toward whatever the real signals have reached.
    // Time-based, not per-frame: a fixed fraction per FRAME converges four
    // times slower at 15fps than at 60, so a slow device would watch the
    // counter crawl. Using elapsed milliseconds takes the same ~0.6s anywhere.
    const SPEED_PER_SECOND = 6;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const deltaSeconds = Math.min((now - lastTime) / 1000, 0.25);
      lastTime = now;
      const target = targetRef.current;
      const eased =
        shownRef.current +
        (target - shownRef.current) * (1 - Math.exp(-SPEED_PER_SECOND * deltaSeconds));
      // Snap once within half a percent, so the counter lands on a whole
      // number instead of approaching it forever.
      const next = target - eased < 0.5 ? target : eased;
      shownRef.current = next;
      setProgress(next);
      // The loop ends with the counter: nothing keeps ticking once it is full.
      frame = next < 100 ? window.requestAnimationFrame(tick) : 0;
    };
    frame = window.requestAnimationFrame(tick);

    // --- guarantee the screen always finishes ------------------------------
    // requestAnimationFrame is PAUSED, not merely throttled, while a tab is
    // hidden. Relying on it alone once left a visitor who switched tabs
    // mid-load facing a counter frozen at 99% behind an opaque overlay.
    // Timers keep firing when hidden, so completion is driven by them too.
    const finish = () => {
      targetRef.current = 100;
      shownRef.current = 100;
      setProgress(100);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) finish();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (document.hidden) finish();

    const ceiling = window.setTimeout(finish, MAX_VISIBLE_MS);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearTimeout(ceiling);
    };
  }, [skip]);

  const rounded = Math.min(100, Math.round(progress));

  // Derived rather than stored: the exit begins exactly when the counter is
  // full, so keeping it in state would only duplicate `progress`.
  const leaving = rounded >= 100;

  useEffect(() => {
    if (!leaving) return;
    rememberBooted();
    const timer = window.setTimeout(() => setFinished(true), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (skip || finished) return null;

  return (
    <div
      ref={screenRef}
      id={LOADING_SCREEN_ID}
      data-leaving={leaving ? "1" : undefined}
      className={cn(
        "grain fixed inset-0 z-(--z-loading) flex flex-col items-center justify-center bg-void",
        styles.loadingFailsafe,
      )}
    >
      {/* Screen readers hear the start and the finish, not every percent. */}
      <p role="status" className="sr-only">
        {leaving ? `${siteConfig.name} is ready.` : `Loading ${siteConfig.name}…`}
      </p>

      <div aria-hidden="true" className="relative z-10 w-full max-w-md px-8 text-center">
        <BrandMark className="mx-auto size-7" />
        <p className="mt-6 font-display text-2xl tracking-[0.42em] text-ink-50 sm:text-3xl">
          AURIX
        </p>
        <p className="mt-5 text-label">{siteConfig.tagline}</p>

        <div className="relative mt-12 h-px w-full overflow-hidden bg-surface-3">
          <div
            className="absolute inset-y-0 left-0 bg-gold-500"
            style={{ width: `${rounded}%` }}
          />
        </div>

        <div className="mt-5 flex items-baseline justify-between font-mono text-micro">
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
