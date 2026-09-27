/**
 * The FX runtime: ONE set of listeners that drives every motion-kit effect
 * on the page, so the kit's components can stay server components that only
 * emit data attributes.
 *
 * - `[data-reveal]` / `[data-reveal-stagger]`: one IntersectionObserver sets
 *   `data-shown` (CSS does the animation), then `data-settled` once the
 *   transition is over so the element's own transitions take over again.
 * - `[data-countup]`, `[data-scramble]`: animated when first in view, by
 *   writing into an aria-hidden overlay span React renders empty — React's
 *   own text nodes are never touched.
 * - `[data-parallax]`: scroll-linked `translate`, only while near the view.
 * - `[data-tilt]`, `[data-spotlight]`, `[data-magnetic]`, `[data-cursor-glow]`:
 *   one delegated pointermove, coalesced to one rAF per frame.
 * - A MutationObserver picks up elements that arrive later (streamed
 *   Suspense content, client navigations).
 *
 * Under prefers-reduced-motion everything is shown at once and nothing moves.
 * Imported only by FxRuntime.tsx (a client component).
 */

import { formatCount, type Grouping } from "./count-format";

const REVEAL = "[data-reveal],[data-reveal-stagger]";
const COUNT = "[data-countup]";
const SCRAMBLE = '[data-scramble="view"],[data-scramble="both"]';
const PARALLAX = "[data-parallax]";
const WATCHED = `${REVEAL},${COUNT},${SCRAMBLE},${PARALLAX}`;

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
      live.textContent =
        prefix + formatCount(target * easeOutExpo(t), decimals, grouping) + suffix;
      if (t < 1) {
        const id = window.requestAnimationFrame(tick);
        frames.add(id);
      } else {
        el.removeAttribute("data-counting");
        live.textContent = "";
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
        layer.textContent = "";
        el.removeAttribute("data-scrambling");
        scrambling.delete(el);
        return;
      }
      if (now - last > 40) {
        last = now;
        layer.textContent = chars
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
    for (const el of parallaxVisible) {
      const speed = Number(el.dataset.parallax) || 0;
      const current = parallaxOffset.get(el) ?? 0;
      const rect = el.getBoundingClientRect();
      const center = rect.top - current + rect.height / 2 - vh / 2;
      const offset = Math.max(-240, Math.min(240, -center * speed));
      parallaxOffset.set(el, offset);
      el.style.translate = `0 ${offset.toFixed(1)}px`;
    }
  };
  const requestParallax = () => {
    if (parallaxFrame === 0 && parallaxVisible.size > 0)
      parallaxFrame = window.requestAnimationFrame(updateParallax);
  };

  // --- Observers ----------------------------------------------------------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) {
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

  const register = (el: HTMLElement) => {
    if (el.matches(REVEAL)) {
      if (reduce) {
        el.setAttribute("data-shown", "");
        el.setAttribute("data-settled", "");
      } else revealObserver.observe(el);
    }
    if (!reduce && (el.matches(COUNT) || el.matches(SCRAMBLE))) onceObserver.observe(el);
    if (!reduce && el.matches(PARALLAX)) parallaxObserver.observe(el);
  };
  const unregister = (el: HTMLElement) => {
    revealObserver.unobserve(el);
    onceObserver.unobserve(el);
    parallaxObserver.unobserve(el);
    parallaxVisible.delete(el);
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
  });

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

      if (glow) glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      const nextTilt = target?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (tilt && tilt !== nextTilt) resetTilt(tilt);
      tilt = nextTilt;
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const px = (x - r.left) / r.width;
        const py = (y - r.top) / r.height;
        const max = Number(tilt.dataset.tilt) || 6;
        tilt.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        tilt.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        tilt.style.setProperty("--rx", `${((0.5 - py) * max * 2).toFixed(2)}deg`);
        tilt.style.setProperty("--ry", `${((px - 0.5) * max * 2).toFixed(2)}deg`);
        tilt.setAttribute("data-tilting", "");
      }

      const spot = target?.closest<HTMLElement>("[data-spotlight]") ?? null;
      if (spot && spot !== tilt) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", `${(x - r.left).toFixed(0)}px`);
        spot.style.setProperty("--my", `${(y - r.top).toFixed(0)}px`);
      }

      const nextMagnet = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnet && magnet !== nextMagnet) resetMagnet(magnet);
      magnet = nextMagnet;
      if (magnet) {
        const [ox, oy] = magnetOffset.get(magnet) ?? [0, 0];
        const r = magnet.getBoundingClientRect();
        const cx = r.left - ox + r.width / 2;
        const cy = r.top - oy + r.height / 2;
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
