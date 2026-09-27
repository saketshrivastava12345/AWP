"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A tooltip that works for mouse, keyboard AND touch — unlike the native
 * `title` attribute this replaces, which keyboard and touch users never see.
 *
 * Shown on hover and on focus of the trigger; a tap focuses the trigger, so
 * touch works too. Content is short text: this is not a popover for
 * interactive UI.
 *
 * Two details matter:
 *
 *   - The bubble is `display: none` while hidden, not merely transparent. An
 *     invisible absolutely-positioned box still counts towards the page's
 *     scrollable area, so a tooltip opening towards the edge made narrow
 *     screens scroll sideways. It fades in with `@starting-style`.
 *   - The trigger is described by the tooltip through `aria-describedby`,
 *     set on the first focusable element inside the wrapper after mount. That
 *     works whatever the child is — including an element rendered by a server
 *     component, which cannot be cloned with new props on the client.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const id = useId();
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [focused, setFocused] = useState(false);
  // Escape hides the bubble without moving focus or hover (WCAG 1.4.13).
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const trigger = wrapperRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    if (!trigger) return;
    const previous = trigger.getAttribute("aria-describedby");
    const ids = new Set((previous ?? "").split(/\s+/).filter(Boolean));
    ids.add(id);
    trigger.setAttribute("aria-describedby", [...ids].join(" "));
    return () => {
      if (previous === null) trigger.removeAttribute("aria-describedby");
      else trigger.setAttribute("aria-describedby", previous);
    };
  }, [id]);

  return (
    <span
      ref={wrapperRef}
      className={cn("group/tip relative inline-flex", className)}
      // Focus events bubble in React, so this sees focus on any trigger.
      onFocus={() => {
        setFocused(true);
        setDismissed(false);
      }}
      onBlur={() => setFocused(false)}
      onMouseEnter={() => setDismissed(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !dismissed) {
          setDismissed(true);
          event.stopPropagation();
        }
      }}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-(--z-raised) hidden w-max max-w-[min(16rem,calc(100vw-2rem))]",
          "rounded-control border border-cyan-400/30 bg-surface-2/95 px-3 py-2 text-left text-[13px] leading-snug",
          "font-sans font-normal tracking-normal text-ink-200 normal-case shadow-overlay backdrop-blur-sm",
          "transition-[opacity,display] transition-discrete duration-(--duration-fast) starting:opacity-0",
          "group-hover/tip:block",
          focused && "block",
          side === "top" && "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          side === "bottom" && "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          side === "left" && "top-1/2 right-[calc(100%+6px)] -translate-y-1/2",
          side === "right" && "top-1/2 left-[calc(100%+6px)] -translate-y-1/2",
          // Last, so it wins over both the hover and the focus rule.
          dismissed && "hidden group-hover/tip:hidden",
        )}
      >
        {content}
      </span>
    </span>
  );
}

/**
 * A small "i" affordance that explains a figure: its source, formula or
 * caveat. Focusable, so the explanation is reachable without a mouse.
 */
export function InfoHint({
  label = "More information",
  children,
  side = "top",
  className,
}: {
  label?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <Tooltip content={children} side={side} className={className}>
      <button
        type="button"
        aria-label={label}
        className="relative inline-grid size-5 place-items-center rounded-full text-ink-400 transition-colors after:absolute after:-inset-3 after:content-[''] hover:text-ink-50 focus-visible:text-ink-50"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
