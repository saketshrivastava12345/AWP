import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import type { AnyComponent } from "./polymorphic";

/**
 * Text that "decodes" from random glyphs into itself — on first view, on
 * hover/focus of it (or of the link/button it sits in), or both.
 *
 * The real text is rendered on the server, stays in the layout and is what
 * assistive technology reads; the glyph layer is an empty aria-hidden span
 * the FX runtime writes into only after mount (so no hydration mismatch),
 * laid over the real text while it decodes. Reduced motion: never scrambles.
 *
 * Use inside a heading: `<h2 className="text-h2"><ScrambleText text="Top speed" /></h2>`.
 * Glyphs render in cyan-200 (override with the `--fx-scramble-color` var).
 */
export function ScrambleText({
  text,
  as,
  trigger = "view",
  duration,
  className,
}: {
  /** The final text. A plain string: it is both the display and the name. */
  text: string;
  /** Wrapper element, default span. */
  as?: ElementType;
  trigger?: "view" | "hover" | "both";
  /** Total decode time in ms (default scales with length, max 1.4s). */
  duration?: number;
  className?: string;
}) {
  const Component = (as ?? "span") as AnyComponent;
  return (
    <Component
      className={cn("fx-scramble", className)}
      data-scramble={trigger}
      data-scramble-duration={duration}
    >
      <span className="fx-scramble-text">{text}</span>
      <span className="fx-scramble-layer" aria-hidden="true" />
    </Component>
  );
}
