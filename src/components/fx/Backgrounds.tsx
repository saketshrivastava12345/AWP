import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/*
 * Decorative background layers. All are server components, aria-hidden,
 * pointer-events: none and absolutely positioned to fill their nearest
 * `relative` ancestor — put them first inside a `relative isolate` section
 * (with `overflow-hidden` if they must not spill), and give the content
 * `relative` so it paints above them. They animate only background-position,
 * transform or opacity, and stop under reduced motion.
 */

const LAYER = "pointer-events-none absolute inset-0 -z-10";

/**
 * An engineering grid. `flat` (default): a 48px grid fading toward the
 * edges, slowly drifting. `floor`: a perspective floor for heroes, lines
 * racing toward the viewer, fading into the horizon.
 */
export function GridBackground({
  variant = "flat",
  size = 48,
  animated = true,
  className,
}: {
  variant?: "flat" | "floor";
  /** Cell size in px. */
  size?: number;
  animated?: boolean;
  className?: string;
}) {
  const style = { "--grid-size": `${size}px` } as CSSProperties;
  if (variant === "floor") {
    return (
      <div
        aria-hidden="true"
        className={cn(LAYER, "overflow-hidden [perspective:420px]", className)}
      >
        <div
          style={{ ...style, "--grid-speed": "2.4s" } as CSSProperties}
          className={cn(
            "absolute inset-x-[-50%] top-[45%] bottom-[-60%] origin-top [transform:rotateX(62deg)]",
            "[background-image:linear-gradient(oklch(0.83_0.13_210/32%)_1px,transparent_1px),linear-gradient(90deg,oklch(0.83_0.13_210/26%)_1px,transparent_1px)]",
            "[background-size:var(--grid-size)_var(--grid-size)]",
            "[mask-image:linear-gradient(to_bottom,transparent,black_30%,black_60%,transparent)]",
            animated && "animate-grid-drift",
          )}
        />
        {/* Horizon glow where the floor meets the sky. */}
        <div className="absolute inset-x-0 top-[45%] h-40 -translate-y-1/2 bg-[radial-gradient(60%_50%_at_50%_50%,oklch(0.8_0.14_210/22%),transparent_70%)]" />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{ ...style, "--grid-speed": "6s" } as CSSProperties}
      className={cn(
        LAYER,
        "[background-image:linear-gradient(oklch(0.85_0.1_210/6%)_1px,transparent_1px),linear-gradient(90deg,oklch(0.85_0.1_210/6%)_1px,transparent_1px)]",
        "[background-size:var(--grid-size)_var(--grid-size)]",
        "[mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]",
        animated && "animate-grid-drift",
        className,
      )}
    />
  );
}

/**
 * Faint horizontal scan lines, and optionally a slow bright beam sweeping
 * down the section (`beam`). The parent needs `overflow-hidden` for the beam.
 */
export function Scanlines({
  beam = false,
  className,
}: {
  beam?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn(LAYER, "overflow-hidden", className)}>
      <div className="absolute inset-0 [background:repeating-linear-gradient(180deg,oklch(0.9_0.05_220/3.5%)_0_1px,transparent_1px_4px)]" />
      {beam ? (
        <div className="absolute inset-0 animate-scan-beam [background:linear-gradient(to_bottom,transparent_calc(100%-160px),oklch(0.83_0.13_210/7%)_calc(100%-2px),oklch(0.9_0.12_205/35%)_calc(100%-1px),transparent)]" />
      ) : null}
    </div>
  );
}

const ORB_TONES = {
  "cyan-violet": [
    "oklch(0.75 0.14 210 / 22%)",
    "oklch(0.6 0.2 290 / 18%)",
    "oklch(0.8 0.12 200 / 12%)",
  ],
  cyan: [
    "oklch(0.75 0.14 210 / 24%)",
    "oklch(0.7 0.12 225 / 16%)",
    "oklch(0.8 0.12 200 / 12%)",
  ],
  gold: [
    "oklch(0.78 0.12 80 / 18%)",
    "oklch(0.75 0.14 210 / 12%)",
    "oklch(0.7 0.1 70 / 10%)",
  ],
} as const;

/**
 * Two or three large, soft coloured glows drifting slowly behind a hero —
 * radial gradients, not blur filters, so they cost almost nothing.
 */
export function GlowOrbs({
  tone = "cyan-violet",
  className,
}: {
  tone?: keyof typeof ORB_TONES;
  className?: string;
}) {
  const [a, b, c] = ORB_TONES[tone];
  return (
    <div aria-hidden="true" className={cn(LAYER, "overflow-hidden", className)}>
      <div
        className="absolute -top-1/4 -left-1/4 size-[70vmax] max-h-[1100px] max-w-[1100px] animate-orb-drift rounded-full"
        style={{ background: `radial-gradient(circle, ${a}, transparent 62%)` }}
      />
      <div
        className="absolute -right-1/4 -bottom-1/3 size-[60vmax] max-h-[1000px] max-w-[1000px] animate-orb-drift rounded-full [--orb-speed:28s] [animation-direction:reverse]"
        style={{ background: `radial-gradient(circle, ${b}, transparent 62%)` }}
      />
      <div
        className="absolute top-1/3 left-1/2 size-[36vmax] max-h-[600px] max-w-[600px] -translate-x-1/2 animate-orb-drift rounded-full [--orb-speed:34s]"
        style={{ background: `radial-gradient(circle, ${c}, transparent 65%)` }}
      />
    </div>
  );
}

/**
 * A soft light that follows the pointer across its section. Put
 * `data-spotlight` on the section (a `relative` element) and this layer
 * inside it; the FX runtime writes --mx/--my on the section. Without a
 * pointer (touch, reduced motion) it rests at `rest` (default top centre).
 */
export function Spotlight({
  size = 520,
  color = "oklch(0.8 0.14 210 / 13%)",
  rest = "50% 0%",
  className,
}: {
  size?: number;
  color?: string;
  rest?: string;
  className?: string;
}) {
  const [rx = "50%", ry = "0%"] = rest.split(" ");
  return (
    <div
      aria-hidden="true"
      className={cn(LAYER, className)}
      style={{
        background: `radial-gradient(${size}px circle at var(--mx, ${rx}) var(--my, ${ry}), ${color}, transparent 70%)`,
      }}
    />
  );
}

/**
 * A soft glow that follows the cursor across the whole page (desktop only).
 * Rendered once by the root layout; the FX runtime moves it.
 */
export function CursorGlow() {
  return <div aria-hidden="true" data-cursor-glow="" className="fx-cursor-glow" />;
}
