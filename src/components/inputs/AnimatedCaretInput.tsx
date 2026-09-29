"use client";

import { useEffect, useRef, type ComponentPropsWithRef, type Ref } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import { CARET_SPRING, isSettled, stepSpring, type SpringState } from "./caret-spring";
import { fontShorthand, letterSpacingPx, measureTextWidth } from "./text-measure";

export type AnimatedCaretInputProps = ComponentPropsWithRef<"input"> & {
  /** Classes for the caret bar (colour, width, glow). */
  caretClassName?: string;
  /** Classes for the positioning wrapper around the input. */
  wrapperClassName?: string;
};

/** How long after the last movement the caret starts blinking. */
const IDLE_BLINK_MS = 560;
/** The caret's height as a multiple of the font size. */
const CARET_HEIGHT_EM = 1.2;
/**
 * The most time one animation frame may advance the spring. A frame that
 * arrives late (a busy main thread, a throttled tab) then slows the glide
 * instead of skipping it to the end.
 */
const MAX_FRAME_MS = 100;

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/**
 * A real `<input>` whose caret is a glowing bar that glides to the cursor
 * instead of jumping. The native caret is made transparent; the bar is an
 * absolutely-positioned sibling placed by measuring the text before the
 * cursor on an offscreen canvas in the input's own font, and moved with a
 * small damped spring (caret-spring.ts). It blinks once idle, hides while a
 * range is selected or the input is blurred, and follows the input's own
 * horizontal scrolling on long text.
 *
 * Every input prop and the ref pass straight through, so it is a drop-in
 * replacement. Under `prefers-reduced-motion: reduce` it renders the
 * native caret and nothing else. Left-aligned LTR text only.
 */
export function AnimatedCaretInput({
  ref,
  className,
  caretClassName,
  wrapperClassName,
  ...props
}: AnimatedCaretInputProps) {
  const reduced = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || !caret) return;

    let font = "";
    let spacing = 0;
    let paddingLeft = 0;
    let paddingRight = 0;
    let target = 0;
    let state: SpringState = { position: 0, velocity: 0 };
    let frame = 0;
    let lastTime = 0;
    let shown = false;
    let idleTimer = 0;

    const readMetrics = () => {
      const style = getComputedStyle(input);
      font = fontShorthand(style);
      spacing = letterSpacingPx(style);
      paddingLeft = parseFloat(style.paddingLeft) || 0;
      paddingRight = parseFloat(style.paddingRight) || 0;
      const fontSize = parseFloat(style.fontSize) || 16;
      const height = fontSize * CARET_HEIGHT_EM;
      caret.style.height = `${height}px`;
      caret.style.top = `${input.offsetTop + (input.offsetHeight - height) / 2}px`;
    };

    const paint = (x: number) => {
      caret.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    const hide = () => {
      shown = false;
      caret.classList.remove("animate-blink");
      caret.style.opacity = "0";
      window.clearTimeout(idleTimer);
    };

    const wake = () => {
      shown = true;
      caret.classList.remove("animate-blink");
      caret.style.opacity = "1";
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        if (shown) caret.classList.add("animate-blink");
      }, IDLE_BLINK_MS);
    };

    const tick = (time: number) => {
      const dt = lastTime ? Math.min(time - lastTime, MAX_FRAME_MS) : 1000 / 60;
      lastTime = time;
      state = stepSpring(state, target, CARET_SPRING, dt);
      if (isSettled(state, target)) {
        state = { position: target, velocity: 0 };
        paint(target);
        frame = 0;
        return;
      }
      paint(state.position);
      frame = requestAnimationFrame(tick);
    };

    const moveTo = (x: number, immediate: boolean) => {
      target = x;
      if (immediate) {
        cancelAnimationFrame(frame);
        frame = 0;
        state = { position: x, velocity: 0 };
        paint(x);
      } else if (!frame) {
        lastTime = 0;
        frame = requestAnimationFrame(tick);
      }
    };

    const update = (immediate = false) => {
      if (document.activeElement !== input) {
        hide();
        return;
      }
      const start = input.selectionStart;
      const end = input.selectionEnd;
      if (start === null || end === null || start !== end) {
        hide();
        return;
      }
      const before = input.value.slice(0, start);
      const x = paddingLeft + measureTextWidth(before, font, spacing) - input.scrollLeft;
      const visibleRight = input.clientWidth - paddingRight + 1;
      if (x < paddingLeft - 1 || x > visibleRight) {
        hide();
        return;
      }
      const wasShown = shown;
      wake();
      moveTo(x, immediate || !wasShown);
    };

    const onFocus = () => {
      readMetrics();
      update(true);
    };
    const onInput = () => update();
    const onScroll = () => update(true);
    const onSelectionChange = () => update();

    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", hide);
    input.addEventListener("input", onInput);
    input.addEventListener("scroll", onScroll);
    document.addEventListener("selectionchange", onSelectionChange);

    const resize = new ResizeObserver(() => {
      readMetrics();
      update(true);
    });
    resize.observe(input);

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (cancelled) return;
      readMetrics();
      update(true);
    });

    readMetrics();
    if (document.activeElement === input) update(true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      resize.disconnect();
      input.removeEventListener("focus", onFocus);
      input.removeEventListener("blur", hide);
      input.removeEventListener("input", onInput);
      input.removeEventListener("scroll", onScroll);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [reduced]);

  return (
    <span className={cn("relative block", wrapperClassName)}>
      <input
        {...props}
        ref={(node) => {
          inputRef.current = node;
          assignRef(ref, node);
        }}
        className={cn(className, !reduced && "caret-transparent")}
      />
      {!reduced ? (
        <span
          ref={caretRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-0 left-0 w-0.5 rounded-full bg-cyan-300 opacity-0",
            "shadow-[0_0_2px_var(--color-cyan-200),0_0_10px_var(--color-cyan-400)]",
            caretClassName,
          )}
        />
      ) : null}
    </span>
  );
}
