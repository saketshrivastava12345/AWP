import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AnyComponent } from "./polymorphic";

export type RevealVariant = "rise" | "fade" | "clip" | "scale" | "blur";

/**
 * Reveals its content when it scrolls into view: a fade and rise (default),
 * a plain fade, a left-to-right clip wipe, a scale-in, or a blur-in.
 *
 * `stagger` reveals the DIRECT CHILDREN one after another instead of the
 * wrapper (pass `true` for 80ms steps, or a step in ms) — for grids and
 * lists. Children beyond the 13th share the last delay.
 *
 * A server component: it only renders data attributes; the FX runtime and
 * globals.css do the rest. Content is hidden only under `html.js` and
 * no-preference for motion, so no-JS and reduced-motion visitors see it at
 * once, and a crashed runtime is covered by a 3s failsafe.
 *
 * Traps: the element transitions opacity/transform (and filter for "blur"),
 * so never wrap a sticky or position: fixed element in a Reveal, and put
 * hover transitions on a child rather than on the Reveal element itself.
 */
export function Reveal({
  as,
  variant = "rise",
  delay,
  stagger,
  once = true,
  className,
  style,
  children,
  ...rest
}: {
  as?: ElementType;
  variant?: RevealVariant;
  /** Delay before the reveal, in ms. */
  delay?: number;
  /** Reveal direct children in sequence: true = 80ms steps, or a step in ms. */
  stagger?: boolean | number;
  /** Reveal once (default) or every time it re-enters the viewport. */
  once?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Record<string, unknown>) {
  const Component = (as ?? "div") as AnyComponent;
  const step = typeof stagger === "number" ? stagger : stagger ? 80 : null;
  const vars: Record<string, string> = {};
  if (delay) vars["--reveal-delay"] = `${delay}ms`;
  if (step !== null) vars["--reveal-step"] = `${step}ms`;

  return (
    <Component
      {...rest}
      {...(step !== null
        ? { "data-reveal-stagger": variant }
        : { "data-reveal": variant })}
      data-reveal-repeat={once ? undefined : ""}
      // The FX runtime may mark it shown before this part of the page has
      // hydrated (selective hydration); those attributes are expected.
      suppressHydrationWarning
      className={cn(className)}
      style={{ ...vars, ...style }}
    >
      {children}
    </Component>
  );
}
