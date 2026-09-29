import type { ReactNode } from "react";
import { TiltCard } from "@/components/fx/TiltCard";
import { cn } from "@/lib/utils";

/**
 * The HUD card shell shared by the car card and the model card: a chamfered
 * plate with a luminous cyan → violet edge, corner brackets, a pointer-driven
 * 3D tilt and a spotlight that follows the cursor. Server component.
 *
 * Geometry: clip-path clips outlines and shadows, so the chamfer is never on
 * the focusable element. The article stays rectangular (it carries the focus
 * ring, drawn when any descendant link is focused) and three chamfered layers
 * sit inside it — the edge, the fill one pixel in, and the clipped content.
 * The tilt transform lives on the article, which is leaf content (never an
 * ancestor of anything sticky or fixed).
 *
 * `--mx/--my` come from the FX runtime while the mouse is over the card (as
 * percentages), so the spotlight and the glare need no script of their own.
 */
export function HudCardShell({
  as = "article",
  interactive = true,
  className,
  contentClassName,
  children,
}: {
  as?: "article" | "div" | "li";
  /** Off for skeletons and static tiles: no tilt, no spotlight, no lit edge. */
  interactive?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  const shell = (
    <>
      {/* Luminous edge, following the chamfer. */}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 transition-opacity duration-(--duration-base) ease-standard chamfer [--chamfer:14px]",
          "bg-[linear-gradient(135deg,oklch(0.83_0.13_210/60%),oklch(0.9_0.03_230/18%)_38%,oklch(0.9_0.03_230/14%)_62%,oklch(0.7_0.17_290/45%))]",
          interactive
            ? "opacity-60 group-focus-within/card:opacity-100 group-hover/card:opacity-100"
            : "opacity-40",
        )}
      />
      {/* The plate. */}
      <div
        aria-hidden="true"
        className="absolute inset-px bg-surface-1 transition-colors duration-(--duration-base) ease-standard chamfer [--chamfer:13px] group-focus-within/card:bg-surface-2 group-hover/card:bg-surface-2"
      />
      {/* Content, clipped to the plate. */}
      <div
        className={cn(
          "relative m-px flex flex-1 flex-col overflow-hidden chamfer [--chamfer:13px]",
          contentClassName,
        )}
      >
        {children}
        {interactive ? (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-(--duration-base) ease-standard",
              "group-hover/card:opacity-100",
              "bg-[radial-gradient(380px_circle_at_var(--mx,50%)_var(--my,0%),oklch(0.85_0.12_210/13%),transparent_65%)]",
            )}
          />
        ) : null}
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "hud-brackets transition-opacity duration-(--duration-base) ease-standard [--hud-l:14px]",
          interactive
            ? "opacity-50 group-focus-within/card:opacity-100 group-hover/card:opacity-100"
            : "opacity-35",
        )}
      />
    </>
  );

  const base = cn(
    "group/card relative isolate flex h-full flex-col",
    // Focus ring on the rectangular shell (a chamfered element would clip it).
    "has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-cyan-300",
    interactive &&
      "transition-shadow duration-(--duration-base) ease-standard hover:shadow-[0_24px_48px_-28px_rgb(0_0_0/0.9),0_0_36px_-14px_oklch(0.8_0.14_210/45%)]",
    className,
  );

  if (!interactive) {
    const Static = as;
    return <Static className={base}>{shell}</Static>;
  }
  return (
    <TiltCard as={as} max={5} glare={false} className={base}>
      {shell}
    </TiltCard>
  );
}

/**
 * A photograph frame inside a HUD card: faint scan lines over the image and
 * a cyan beam that sweeps down it once each time the card is hovered. Both
 * are decoration; the parent needs `relative overflow-hidden`.
 */
export function HudMediaOverlay() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 [background:repeating-linear-gradient(180deg,oklch(0.9_0.05_220/4%)_0_1px,transparent_1px_4px)]"
      />
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 [transform:translateY(-100%)]",
          "[--scan-speed:1.3s] [animation-iteration-count:1] group-hover/card:animate-scan-beam",
          "[background:linear-gradient(to_bottom,transparent_calc(100%-110px),oklch(0.83_0.13_210/9%)_calc(100%-2px),oklch(0.9_0.12_205/75%)_calc(100%-1px),transparent)]",
        )}
      />
      {/* Bottom edge fades the photograph into the plate. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-linear-to-t from-surface-1 to-transparent transition-colors duration-(--duration-base) group-hover/card:from-surface-2"
      />
    </>
  );
}
