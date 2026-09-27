import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AnyComponent } from "./polymorphic";

/**
 * Pointer-driven 3D tilt (≤ `max` degrees, default 6) with a moving glare,
 * for cards. The FX runtime sets --rx/--ry/--mx/--my while the mouse is over
 * it; on leave the transform is removed entirely (nothing lingers). No tilt
 * on touch or under reduced motion.
 *
 * Polymorphic: `as={Link}` + `href` makes the whole card a link (it is a
 * server component, so any component can be passed). `--mx/--my` are also
 * available to children for their own spotlight effects.
 *
 * Traps: it applies a transform while tilting — never put sticky/fixed
 * content inside, and don't make the same element a Reveal (wrap instead).
 */
export function TiltCard({
  as,
  max = 6,
  glare = true,
  className,
  style,
  children,
  ...rest
}: {
  as?: ElementType;
  /** Maximum tilt in degrees (keep ≤ 8). */
  max?: number;
  /** A soft light that follows the pointer. */
  glare?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Record<string, unknown>) {
  const Component = (as ?? "div") as AnyComponent;
  return (
    <Component
      {...rest}
      data-tilt={Math.min(8, Math.max(1, max))}
      className={cn("relative", className)}
      style={style}
    >
      {children}
      {glare ? <span aria-hidden="true" className="fx-tilt-glare" /> : null}
    </Component>
  );
}
