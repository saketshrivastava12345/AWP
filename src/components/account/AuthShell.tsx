import { type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GlowOrbs,
  GridBackground,
  Scanlines,
  ScrambleText,
  HudFrame,
} from "@/components/fx";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { cn } from "@/lib/utils";

/*
 * The frame for sign-in, sign-up and password screens: an "access terminal".
 * A HUD hero on the left (eyebrow, decoding heading, a wireframe car with a
 * light running along its outline, a few lines of why) over a perspective
 * floor grid; the form on the right inside a bracketed glass panel with a
 * scanning beam. On phones the heading sits above the panel and the drawing
 * is left out. Server-safe: every layer is CSS, every effect is gated by the
 * FX runtime, and the forms are in the static HTML.
 */

/** A mid-engine coupé's side elevation: a body-style drawing, not a likeness. */
const DRAWING = carSilhouette("coupe", "combustion", "mid");

function Drawing() {
  return (
    <figure className="w-full">
      <svg
        viewBox={DRAWING.viewBox}
        className="w-full max-w-xl overflow-visible drop-shadow-[0_0_18px_oklch(0.8_0.14_210/28%)]"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={DRAWING.body}
          className="fill-surface-1/70 stroke-cyan-300/45"
          strokeWidth={1.5}
        />
        {/* A light running along the outline (stroke-dashoffset only). */}
        <path
          d={DRAWING.body}
          className="animate-hud-dash stroke-cyan-200"
          strokeWidth={2}
          strokeDasharray="14 110"
          strokeLinecap="round"
        />
        {DRAWING.glass ? <path d={DRAWING.glass} className="fill-cyan-400/10" /> : null}
        {DRAWING.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-cyan-300/60"
              strokeWidth={1.5}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="animate-hud-dash stroke-cyan-200/80"
              strokeWidth={1.5}
              strokeDasharray="6 10"
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-4 flex items-center gap-3 text-hud">
        <span
          aria-hidden="true"
          className="size-1.5 animate-pulse-glow rounded-full bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
        />
        Mid-engine coupé · body-style drawing
      </figcaption>
    </figure>
  );
}

export function AuthShell({
  overline = "Access terminal",
  code = "SYS.01",
  title,
  description,
  aside,
  children,
  className,
}: {
  /** The eyebrow above the heading. */
  overline?: string;
  /** Decorative HUD code after the eyebrow (aria-hidden). */
  code?: string;
  title: string;
  description?: ReactNode;
  /** Extra copy under the drawing (large screens only). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // overflow-x-clip: the glow layers reach past the container; clip (not
    // hidden) keeps this from becoming a scroll container.
    <div
      className={cn("relative isolate flex flex-1 flex-col overflow-x-clip", className)}
    >
      <GlowOrbs tone="cyan" />
      <GridBackground variant="floor" size={56} />
      <Scanlines />
      <Container className="relative grid flex-1 lg:min-h-[calc(100svh-var(--nav-h))] lg:grid-cols-2">
        <div className="flex flex-col pt-12 pb-10 sm:pt-16 lg:justify-between lg:gap-16 lg:py-20 lg:pr-16">
          <div className="max-w-xl">
            <p className="flex items-center gap-3 text-eyebrow">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
              />
              <span className="min-w-0">{overline}</span>
              <span aria-hidden="true" className="hud-label text-ink-600">
                {"// "}
                {code}
              </span>
            </p>
            <h1 className="mt-5 text-h1">
              <ScrambleText text={title} />
            </h1>
            {description ? (
              <div className="mt-5 max-w-[34rem] text-lead">{description}</div>
            ) : null}
          </div>
          <div className="hidden lg:block">
            <Drawing />
            {aside ? <div className="mt-12">{aside}</div> : null}
          </div>
        </div>

        <div className="flex items-start justify-center pb-20 lg:items-center lg:py-20 lg:pl-16">
          <HudFrame
            as="div"
            label="AUTH // TERMINAL"
            code={code}
            padded={false}
            className="isolate w-full max-w-[26rem] p-6 [--hud-l:18px] sm:p-8"
          >
            {/* The panel's own slow scanning beam (the layer clips itself). */}
            <Scanlines beam className="rounded-card opacity-80 [--scan-speed:9s]" />
            <div className="relative">{children}</div>
          </HudFrame>
        </div>
      </Container>
    </div>
  );
}

/** Same footprint as AuthShell with a form, while the dynamic part streams in. */
export function AuthShellSkeleton() {
  return (
    <div
      className="relative isolate flex flex-1 flex-col overflow-x-clip"
      aria-hidden="true"
    >
      <GlowOrbs tone="cyan" />
      <GridBackground variant="floor" size={56} />
      <Container className="relative grid flex-1 lg:min-h-[calc(100svh-var(--nav-h))] lg:grid-cols-2">
        <div className="pt-12 pb-10 sm:pt-16 lg:py-20 lg:pr-16">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-6 h-11 w-72 max-w-full" />
          <Skeleton className="mt-6 h-5 w-full max-w-sm" />
          <Skeleton className="mt-2 h-5 w-64 max-w-full" />
        </div>
        <div className="flex items-start justify-center pb-20 lg:items-center lg:py-20 lg:pl-16">
          <div className="relative w-full max-w-[26rem] rounded-card p-6 hud-panel sm:p-8">
            <span aria-hidden="true" className="hud-brackets -m-px [--hud-l:18px]" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-12 w-full" />
            <Skeleton className="mt-6 h-3 w-20" />
            <Skeleton className="mt-3 h-12 w-full" />
            <Skeleton className="mt-8 h-12 w-full" />
          </div>
        </div>
      </Container>
    </div>
  );
}

/** A form-level message: an error (role=alert) or a confirmation (role=status). */
export function FormMessage({
  tone,
  children,
  className,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "relative flex items-start gap-3 rounded-card border border-line bg-surface-1/80 px-4 py-3 text-body-s text-ink-100",
        "before:mt-[7px] before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
        tone === "error" &&
          "border-signal-negative/40 before:bg-signal-negative before:shadow-[0_0_8px_var(--color-signal-negative)]",
        tone === "success" &&
          "border-signal-positive/40 before:bg-signal-positive before:shadow-[0_0_8px_var(--color-signal-positive)]",
        tone === "info" &&
          "border-cyan-700/60 text-ink-200 before:bg-cyan-300 before:shadow-[0_0_8px_var(--color-cyan-300)]",
        className,
      )}
    >
      <span className="min-w-0">{children}</span>
    </p>
  );
}
