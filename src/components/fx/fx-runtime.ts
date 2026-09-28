/**
 * The FX runtime: ONE set of listeners that drives every motion-kit effect
 * on the page, so the kit's components can stay server components that only
 * emit data attributes.
 *
 * - `[data-reveal]` / `[data-reveal-stagger]`: one IntersectionObserver sets
 *   `data-shown` (CSS does the animation), then `data-settled` once the
 *   transition is over so the element's own transitions take over again.
 * - `[data-countup]`, `[data-scramble]`: animated when first in view, by
 *   writing a `data-text` ATTRIBUTE on an aria-hidden overlay span, shown
 *   with `content: attr(data-text)`. Never child nodes: the runtime can run
 *   before a Suspense boundary hydrates, and an extra text node there would
 *   fail hydration, while an extra attribute is covered by
 *   suppressHydrationWarning.
 * - `[data-parallax]`: scroll-linked `translate`, only while near the view.
 * - `[data-tilt]`, `[data-spotlight]`, `[data-magnetic]`, `[data-cursor-glow]`:
 *   one delegated pointermove, coalesced to one rAF per frame.
 * - Ambient loops (drifting grids and orbs, beams, breathing dots, dashed
 *   flows, the marquee): paused while off screen and while the tab is
 *   hidden. A page carries dozens of these infinite CSS animations and most
 *   are out of view at any moment, yet each running one keeps the browser
 *   restyling, repainting and compositing every frame.
 * - Lite mode (fx-lite.ts): if the page cannot hold its frame rate at rest
 *   shortly after load, `html.fx-lite` stops the ambient loops for the rest
 *   of the session. (The boot script already set it for low-power devices.)
 * - A MutationObserver picks up elements that arrive later (streamed
 *   Suspense content, client navigations).
 *
 * Under prefers-reduced-motion everything is shown at once and nothing moves.
 * Imported only by FxRuntime.tsx (a client component).
 */

import { formatCount, type Grouping } from "./count-format";
import {
  FX_LITE_CLASS,
  FX_LITE_SESSION_KEY,
  FX_MODE_STORAGE_KEY,
  framesTooSlow,
} from "./fx-lite";

const REVEAL = "[data-reveal],[data-reveal-stagger]";
const COUNT = "[data-countup]";
const SCRAMBLE = '[data-scramble="view"],[data-scramble="both"]';
const PARALLAX = "[data-parallax]";
/**
 * Elements carrying an infinite ambient animation (globals.css). Paused and
 * resumed through the Web Animations API, so the runtime never writes an
 * attribute onto markup React may not have hydrated yet. Nothing in CSS
 * toggles these animations' play state, so taking it over is safe.
 */
const AMBIENT = [
  ".animate-grid-drift",
  ".animate-orb-drift",
  ".animate-scan-beam",
  ".animate-pulse-glow",
  ".animate-hud-dash",
  ".animate-flow",
  ".animate-spin-slow",
  ".animate-float",
  // Tailwind's own bounce, used behind a variant (motion-safe:animate-bounce).
  '[class*="animate-bounce"]',
  ".fx-glitch",
].join(",");
/**
 * The marquee's play state IS driven by CSS (hover, focus and its pause
 * toggle), which a Web Animations play() would override for good; it is
 * paused through a `data-fx-offscreen` attribute instead (Marquee renders
 * that element with suppressHydrationWarning).
 */
const MARQUEE = ".fx-marquee";
const WATCHED = `${REVEAL},${COUNT},${SCRAMBLE},${PARALLAX},${AMBIENT},${MARQUEE}`;

/** Measure frame times at rest this long after the load event... */
const SAMPLE_DELAY_MS = 1500;
/** ...for this long. */
const SAMPLE_MS = 2000;

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/\\";

function ms(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

export function startFxRuntime(): () => void {
  const html = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  const frames = new Set<number>();

  html.setAttribute("data-fx", "on");
  cleanups.push(() => html.removeAttribute("data-fx"));

  const later = (fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
  };

  // --- Reveal -------------------------------------------------------------
  const show = (el: HTMLElement) => {
    if (el.hasAttribute("data-shown")) return;
    el.setAttribute("data-shown", "");
    const style = getComputedStyle(el);
    const delay = ms(style.getPropertyValue("--reveal-delay"), 0);
    const step = ms(style.getPropertyValue("--reveal-step"), 80);
    const count = el.hasAttribute("data-reveal-stagger")
      ? Math.min(el.children.length, 13)
      : 1;
    later(
      () => {
        if (el.hasAttribute("data-shown")) el.setAttribute("data-settled", "");
      },
      delay + Math.max(0, count - 1) * step + 1000,
    );
  };

  const hide = (el: HTMLElement) => {
    el.removeAttribute("data-shown");
    el.removeAttribute("data-settled");
  };

  // --- CountUp ------------------------------------------------------------
  const countUp = (el: HTMLElement) => {
    const live = el.querySelector<HTMLElement>(":scope > .fx-count-live");
    const target = Number(el.dataset.countup);
    if (!live || !Number.isFinite(target) || reduce) return;
    const decimals = Number(el.dataset.decimals ?? 0) || 0;
    const grouping = (el.dataset.group ?? "none") as Grouping;
    const prefix = el.dataset.prefix ?? "";
    const suffix = el.dataset.suffix ?? "";
    const duration = Number(el.dataset.duration ?? 1400) || 1400;
    const start = performance.now();
    el.setAttribute("data-counting", "");
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      live.dataset.text =
        prefix + formatCount(target * easeOutExpo(t), decimals, grouping) + suffix;
      if (t < 1) {
        const id = window.requestAnimationFrame(tick);
        frames.add(id);
      } else {
        el.removeAttribute("data-counting");
        delete live.dataset.text;
      }
    };
    frames.add(window.requestAnimationFrame(tick));
  };

  // --- ScrambleText ---------------------------------------------------------
  const scrambling = new WeakSet<HTMLElement>();
  const scramble = (el: HTMLElement) => {
    if (reduce || scrambling.has(el)) return;
    const text = el.querySelector(":scope > .fx-scramble-text")?.textContent ?? "";
    const layer = el.querySelector<HTMLElement>(":scope > .fx-scramble-layer");
    if (!text || !layer) return;
    scrambling.add(el);
    const chars = [...text];
    const duration =
      Number(el.dataset.scrambleDuration) || Math.min(1400, 450 + chars.length * 26);
    const resolveAt = chars.map(
      (_, i) => (i / chars.length) * duration * 0.7 + Math.random() * duration * 0.3,
    );
    const start = performance.now();
    let last = 0;
    el.setAttribute("data-scrambling", "");
    const tick = (now: number) => {
      const t = now - start;
      if (t >= duration) {
        delete layer.dataset.text;
        el.removeAttribute("data-scrambling");
        scrambling.delete(el);
        return;
      }
      if (now - last > 40) {
        last = now;
        layer.dataset.text = chars
          .map((ch, i) =>
            ch.trim() === "" || t >= (resolveAt[i] ?? 0)
              ? ch
              : (GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? ch),
          )
          .join("");
      }
      frames.add(window.requestAnimationFrame(tick));
    };
    frames.add(window.requestAnimationFrame(tick));
  };

  // --- Parallax -----------------------------------------------------------
  const parallaxVisible = new Set<HTMLElement>();
  const parallaxOffset = new WeakMap<HTMLElement, number>();
  let parallaxFrame = 0;
  const updateParallax = () => {
    parallaxFrame = 0;
    const vh = window.innerHeight;
    // Every read before any write: interleaving them would force a style
    // recalculation per element.
    const next: Array<[HTMLElement, number]> = [];
    for (const el of parallaxVisible) {
      const speed = Number(el.dataset.parallax) || 0;
      const current = parallaxOffset.get(el) ?? 0;
      const rect = el.getBoundingClientRect();
      const center = rect.top - current + rect.height / 2 - vh / 2;
      next.push([el, Math.max(-240, Math.min(240, -center * speed))]);
    }
    for (const [el, offset] of next) {
      parallaxOffset.set(el, offset);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    }
  };
  const requestParallax = () => {
    if (parallaxFrame === 0 && parallaxVisible.size > 0)
      parallaxFrame = window.requestAnimationFrame(updateParallax);
  };

  // --- Ambient loops: run only while on screen and the tab is visible ------
  const ambientOnScreen = new Set<Element>();
  // Only animations this runtime paused are ever resumed by it.
  const pausedHere = new WeakSet<Animation>();
  const syncAmbient = (el: Element) => {
    const run = ambientOnScreen.has(el) && !document.hidden;
    if (el.matches(MARQUEE)) {
      if (run) el.removeAttribute("data-fx-offscreen");
      else el.setAttribute("data-fx-offscreen", "");
      return;
    }
    // The glitch draws on its ::before/::after, which only `subtree` reaches.
    const animations = el.getAnimations({ subtree: el.matches(".fx-glitch") });
    for (const animation of animations) {
      if (run) {
        if (pausedHere.has(animation)) {
          pausedHere.delete(animation);
          animation.play();
        }
      } else if (
        animation.playState === "running" &&
        animation.effect?.getComputedTiming().iterations === Infinity
      ) {
        animation.pause();
        pausedHere.add(animation);
      }
    }
  };

  // --- Observers ----------------------------------------------------------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        // An element already scrolled past (the runtime mounted late, or the
        // page opened at an anchor) will never intersect again: show it at
        // once rather than leave a hole above the visitor.
        const passed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        if (entry.isIntersecting || (passed && !el.hasAttribute("data-reveal-repeat"))) {
          show(el);
          if (!el.hasAttribute("data-reveal-repeat")) revealObserver.unobserve(el);
        } else if (
          el.hasAttribute("data-reveal-repeat") &&
          el.hasAttribute("data-shown")
        ) {
          hide(el);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );

  const onceObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        onceObserver.unobserve(el);
        if (el.matches(COUNT)) countUp(el);
        if (el.matches(SCRAMBLE)) scramble(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0 },
  );

  const parallaxObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) parallaxVisible.add(el);
        else parallaxVisible.delete(el);
      }
      requestParallax();
    },
    { rootMargin: "25% 0px 25% 0px" },
  );

  // A little margin, so a loop is already moving as it scrolls into view.
  const ambientObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) ambientOnScreen.add(entry.target);
        else ambientOnScreen.delete(entry.target);
        syncAmbient(entry.target);
      }
    },
    { rootMargin: "10% 0px 10% 0px" },
  );

  const register = (el: HTMLElement) => {
    if (el.matches(REVEAL)) {
      if (reduce) {
        el.setAttribute("data-shown", "");
        el.setAttribute("data-settled", "");
      } else revealObserver.observe(el);
    }
    if (!reduce && (el.matches(COUNT) || el.matches(SCRAMBLE))) onceObserver.observe(el);
    if (!reduce && el.matches(PARALLAX)) parallaxObserver.observe(el);
    // Under reduced motion the CSS backstop has already stopped them.
    if (!reduce && (el.matches(AMBIENT) || el.matches(MARQUEE)))
      ambientObserver.observe(el);
  };
  const unregister = (el: HTMLElement) => {
    revealObserver.unobserve(el);
    onceObserver.unobserve(el);
    parallaxObserver.unobserve(el);
    parallaxVisible.delete(el);
    ambientObserver.unobserve(el);
    ambientOnScreen.delete(el);
  };

  const scan = (root: ParentNode, fn: (el: HTMLElement) => void) => {
    if (root instanceof HTMLElement && root.matches(WATCHED)) fn(root);
    for (const el of root.querySelectorAll<HTMLElement>(WATCHED)) fn(el);
  };

  scan(document, register);

  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes)
        if (node instanceof HTMLElement) scan(node, register);
      for (const node of record.removedNodes)
        if (node instanceof HTMLElement) scan(node, unregister);
    }
  });
  mutations.observe(document.body, { childList: true, subtree: true });
  cleanups.push(() => {
    mutations.disconnect();
    revealObserver.disconnect();
    onceObserver.disconnect();
    parallaxObserver.disconnect();
    ambientObserver.disconnect();
  });

  // A hidden tab: hold every on-screen loop until the visitor comes back.
  const onVisibility = () => {
    for (const el of ambientOnScreen) syncAmbient(el);
  };
  document.addEventListener("visibilitychange", onVisibility);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

  // --- Lite mode from measured frame times ----------------------------------
  // After load, with the page at rest, can this device hold its frame rate
  // with the ambient loops running? If not, stop them for the session.
  let fxOverride: string | null = null;
  try {
    fxOverride = localStorage.getItem(FX_MODE_STORAGE_KEY);
  } catch {
    // Storage blocked: detect as usual.
  }
  if (!reduce && fxOverride !== "full" && !html.classList.contains(FX_LITE_CLASS)) {
    const sample = () => {
      if (document.hidden) return;
      const intervals: number[] = [];
      let first = -1;
      let last = -1;
      const tick = (now: number) => {
        // A hidden tab stops frames; that says nothing about the device.
        if (document.hidden) return;
        if (last >= 0) intervals.push(now - last);
        else first = now;
        last = now;
        if (now - first < SAMPLE_MS) {
          frames.add(window.requestAnimationFrame(tick));
        } else if (framesTooSlow(intervals)) {
          html.classList.add(FX_LITE_CLASS);
          try {
            sessionStorage.setItem(FX_LITE_SESSION_KEY, "1");
          } catch {
            // Not remembered; the next load measures again.
          }
        }
      };
      frames.add(window.requestAnimationFrame(tick));
    };
    const begin = () => later(sample, SAMPLE_DELAY_MS);
    if (document.readyState === "complete") begin();
    else {
      window.addEventListener("load", begin, { once: true });
      cleanups.push(() => window.removeEventListener("load", begin));
    }
  }

  if (!reduce) {
    window.addEventListener("scroll", requestParallax, { passive: true });
    window.addEventListener("resize", requestParallax, { passive: true });
    cleanups.push(() => {
      window.removeEventListener("scroll", requestParallax);
      window.removeEventListener("resize", requestParallax);
      if (parallaxFrame) window.cancelAnimationFrame(parallaxFrame);
    });

    // Hover/focus-triggered scrambles, delegated.
    const onEnter = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const host = target.closest("a,button,[data-scramble]");
      if (!host) return;
      const own = host.matches('[data-scramble="hover"],[data-scramble="both"]')
        ? [host]
        : [];
      for (const el of [
        ...own,
        ...host.querySelectorAll('[data-scramble="hover"],[data-scramble="both"]'),
      ])
        scramble(el as HTMLElement);
    };
    document.addEventListener("pointerover", onEnter, { passive: true });
    document.addEventListener("focusin", onEnter);
    cleanups.push(() => {
      document.removeEventListener("pointerover", onEnter);
      document.removeEventListener("focusin", onEnter);
    });
  }

  // --- Pointer effects (desktop only) -------------------------------------
  if (!reduce && finePointer) {
    const glow = document.querySelector<HTMLElement>("[data-cursor-glow]");
    let pending: PointerEvent | null = null;
    let frame = 0;
    let tilt: HTMLElement | null = null;
    let magnet: HTMLElement | null = null;
    const magnetOffset = new WeakMap<HTMLElement, [number, number]>();
    const layers = new WeakMap<HTMLElement, HTMLElement>();
    const spotlightLayer = (host: HTMLElement): HTMLElement => {
      let layer = layers.get(host);
      if (!layer) {
        layer =
          host.querySelector<HTMLElement>(":scope > [data-spotlight-layer]") ?? host;
        layers.set(host, layer);
      }
      return layer;
    };

    const resetTilt = (el: HTMLElement) => {
      el.removeAttribute("data-tilting");
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    };
    const resetMagnet = (el: HTMLElement) => {
      el.removeAttribute("data-magnet-active");
      el.style.translate = "";
      magnetOffset.delete(el);
    };

    const process = () => {
      frame = 0;
      const event = pending;
      pending = null;
      if (!event) return;
      const { clientX: x, clientY: y } = event;
      const target = event.target instanceof Element ? event.target : null;
      // Lite mode keeps the direct feedback (tilt, magnet) and drops the
      // ambient light: the cursor glow is hidden in CSS and spotlights rest.
      const lite = html.classList.contains(FX_LITE_CLASS);
      const nextTilt = target?.closest<HTMLElement>("[data-tilt]") ?? null;
      const spot = lite
        ? null
        : (target?.closest<HTMLElement>("[data-spotlight]") ?? null);
      const nextMagnet = target?.closest<HTMLElement>("[data-magnetic]") ?? null;

      // Every layout read before any style write: a read after a write forces
      // the browser to recalculate style on the spot, once per effect.
      const tiltRect = nextTilt?.getBoundingClientRect() ?? null;
      const spotRect = spot && spot !== nextTilt ? spot.getBoundingClientRect() : null;
      const magnetRect = nextMagnet?.getBoundingClientRect() ?? null;

      if (glow && !lite) glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      if (tilt && tilt !== nextTilt) resetTilt(tilt);
      tilt = nextTilt;
      if (tilt && tiltRect) {
        const px = (x - tiltRect.left) / tiltRect.width;
        const py = (y - tiltRect.top) / tiltRect.height;
        const max = Number(tilt.dataset.tilt) || 6;
        tilt.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        tilt.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        tilt.style.setProperty("--rx", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        tilt.setAttribute("data-tilting", "");
      }

      if (spot && spotRect) {
        // A section's <Spotlight> layer takes the position itself: a custom
        // property set on the section would restyle everything inside it on
        // every pointer frame. Cards (fx-card::after) read it from the card.
        const into = spotlightLayer(spot);
        into.style.setProperty("--mx", `${(x - spotRect.left).toFixed(0)}px`);
        into.style.setProperty("--my", `${(y - spotRect.top).toFixed(0)}px`);
      }

      if (magnet && magnet !== nextMagnet) resetMagnet(magnet);
      magnet = nextMagnet;
      if (magnet && magnetRect) {
        const [ox, oy] = magnetOffset.get(magnet) ?? [0, 0];
        const cx = magnetRect.left - ox + magnetRect.width / 2;
        const cy = magnetRect.top - oy + magnetRect.height / 2;
        const strength = Number(magnet.dataset.magnetic) || 0.3;
        const dx = Math.max(-10, Math.min(10, (x - cx) * strength));
        const dy = Math.max(-8, Math.min(8, (y - cy) * strength));
        magnetOffset.set(magnet, [dx, dy]);
        magnet.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
        magnet.setAttribute("data-magnet-active", "");
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pending = event;
      if (!html.hasAttribute("data-cursor")) html.setAttribute("data-cursor", "");
      if (frame === 0) frame = window.requestAnimationFrame(process);
    };
    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      html.removeAttribute("data-cursor");
      if (tilt) resetTilt(tilt);
      if (magnet) resetMagnet(magnet);
      tilt = null;
      magnet = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });
    cleanups.push(() => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("mouseout", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      html.removeAttribute("data-cursor");
    });
  }

  return () => {
    for (const fn of cleanups) fn();
    for (const id of timers) window.clearTimeout(id);
    for (const id of frames) window.cancelAnimationFrame(id);
  };
}
