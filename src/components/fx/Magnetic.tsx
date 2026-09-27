import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a button or link so it drifts toward the cursor while hovered and
 * springs back on leave (pointer-fine devices only, never under reduced
 * motion). `strength` scales the pull (default 0.3; the drift is capped at
 * 10px so the target never runs away from the pointer).
 *
 * Buttons have this built in: `<Button magnetic>` / `<ButtonLink magnetic>`.
 */
export function Magnetic({
  strength = 0.3,
  className,
  children,
}: {
  strength?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span data-magnetic={strength} className={cn("inline-flex", className)}>
      {children}
    </span>
  );
}
