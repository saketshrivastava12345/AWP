import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * An infinite horizontal ticker (brands, figures, words). Pure CSS.
 *
 * - The content is rendered twice; the copy is aria-hidden and inert, so a
 *   screen reader and the Tab key meet each item once.
 * - Pauses on hover and while anything inside has focus, and `controls`
 *   (default on) adds a small keyboard-reachable Pause toggle (WCAG 2.2.2).
 * - Reduced motion: no movement; the row becomes a normal scroller.
 * - `speed` is seconds per loop (default 40). `reverse` runs right-to-left.
 *
 * Pass items as children (each child is one item). Never hardcode car data
 * into a marquee — pass what a query returned, or use non-data words.
 */
export function Marquee({
  children,
  speed = 40,
  gap = "3rem",
  reverse = false,
  controls = true,
  label = "Ticker",
  className,
}: {
  children: ReactNode;
  speed?: number;
  gap?: string;
  reverse?: boolean;
  controls?: boolean;
  /** Names the pause control: "Pause {label}". */
  label?: string;
  className?: string;
}) {
  const style = {
    "--marquee-duration": `${speed}s`,
    "--marquee-gap": gap,
  } as CSSProperties;
  return (
    <div className={cn("fx-marquee-root group/marquee relative", className)}>
      <div className="fx-marquee" data-reverse={reverse ? "" : undefined} style={style}>
        <div className="fx-marquee-track">
          <div className="fx-marquee-group">{children}</div>
          <div className="fx-marquee-group" aria-hidden="true" inert>
            {children}
          </div>
        </div>
      </div>
      {controls ? (
        <label
          className={cn(
            "fx-marquee-toggle-label absolute top-1/2 right-0 z-10 flex h-8 -translate-y-1/2",
            "cursor-pointer items-center gap-1.5 bg-void/80 px-2.5 text-hud text-ink-300",
            "opacity-0 transition-opacity group-hover/marquee:opacity-100",
            "has-focus-visible:opacity-100 has-focus-visible:outline-2 has-focus-visible:outline-cyan-300",
            "has-checked:opacity-100",
          )}
        >
          <input type="checkbox" className="fx-marquee-toggle peer sr-only" />
          <span aria-hidden="true" className="peer-checked:hidden">
            ❚❚
          </span>
          <span aria-hidden="true" className="hidden peer-checked:inline">
            ▶
          </span>
          <span className="sr-only">Pause {label}</span>
        </label>
      ) : null}
    </div>
  );
}
