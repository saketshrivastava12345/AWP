import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { AnyComponent } from "./polymorphic";

/**
 * Moves a layer with the scroll: `speed` −0.2 drifts it up at a fifth of the
 * scroll rate relative to the viewport centre, 0.2 down. Uses the
 * `translate` property, updated in one rAF per frame and only while near the
 * viewport; capped at ±240px. Off under reduced motion.
 *
 * Trap: `translate` makes it a containing block — never wrap sticky/fixed
 * content, and prefer it for decorative layers and images.
 */
export function Parallax({
  speed = -0.15,
  as,
  className,
  children,
}: {
  speed?: number;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}) {
  const Component = (as ?? "div") as AnyComponent;
  return (
    <Component data-parallax={speed} className={cn(className)} suppressHydrationWarning>
      {children}
    </Component>
  );
}
