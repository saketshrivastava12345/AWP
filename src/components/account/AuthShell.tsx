import { type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { cn } from "@/lib/utils";

/*
 * The frame for sign-in, sign-up and password screens, split like a car
 * maker's owner portal: an editorial panel on the left (the heading, a
 * drawing on a plain ground, a few lines of why), the form on the right.
 * On phones the heading sits above the form and the drawing is left out.
 * Server-safe.
 */

/** A mid-engine coupé's side elevation: a body-style drawing, not a likeness. */
const DRAWING = carSilhouette("coupe", "combustion", "mid");

function Drawing() {
  return (
    <figure className="w-full">
      <svg
        viewBox={DRAWING.viewBox}
        className="w-full max-w-xl overflow-visible"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={DRAWING.body}
          className="fill-surface-2 stroke-ink-500"
          strokeWidth={2}
        />
        {DRAWING.glass ? <path d={DRAWING.glass} className="fill-void/70" /> : null}
        {DRAWING.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-500"
              strokeWidth={2}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-ink-400"
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-4 text-caption">
        Mid-engine coupé · body-style drawing
      </figcaption>
    </figure>
  );
}

export function AuthShell({
  overline,
  title,
  description,
  aside,
  children,
  className,
}: {
  /** An optional eyebrow above the heading. */
  overline?: string;
  title: string;
  description?: ReactNode;
  /** Extra copy under the drawing (large screens only). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // overflow-x-clip: the editorial panel's ground reaches the viewport's
    // left edge through a pseudo-element; clip (not hidden) keeps this from
    // becoming a scroll container.
    <div className={cn("flex flex-1 flex-col overflow-x-clip", className)}>
      <Container className="grid flex-1 lg:min-h-[calc(100svh-var(--nav-h))] lg:grid-cols-2">
        <div
          className={cn(
            "relative isolate flex flex-col pt-12 pb-10 sm:pt-16",
            // The plain ground of the editorial half, bled to the left edge.
            "lg:justify-between lg:gap-16 lg:py-20 lg:pr-16",
            "lg:before:absolute lg:before:inset-y-0 lg:before:right-0 lg:before:-left-[100vw]",
            "lg:before:-z-10 lg:before:bg-surface-1 lg:before:content-['']",
          )}
        >
          <div className="max-w-xl">
            {overline ? <p className="mb-5 text-eyebrow">{overline}</p> : null}
            <h1 className="text-h1">{title}</h1>
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
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </Container>
    </div>
  );
}

/** Same footprint as AuthShell with a form, while the dynamic part streams in. */
export function AuthShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip" aria-hidden="true">
      <Container className="grid flex-1 lg:min-h-[calc(100svh-var(--nav-h))] lg:grid-cols-2">
        <div
          className={cn(
            "relative isolate pt-12 pb-10 sm:pt-16 lg:py-20 lg:pr-16",
            "lg:before:absolute lg:before:inset-y-0 lg:before:right-0 lg:before:-left-[100vw]",
            "lg:before:-z-10 lg:before:bg-surface-1 lg:before:content-['']",
          )}
        >
          <Skeleton className="h-11 w-72 max-w-full" />
          <Skeleton className="mt-6 h-5 w-full max-w-sm" />
          <Skeleton className="mt-2 h-5 w-64 max-w-full" />
        </div>
        <div className="flex items-start justify-center pb-20 lg:items-center lg:py-20 lg:pl-16">
          <div className="w-full max-w-[26rem]">
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
        "rounded-card border-l-2 bg-surface-1 px-4 py-3 text-body-s text-ink-100",
        tone === "error" && "border-signal-negative",
        tone === "success" && "border-signal-positive",
        tone === "info" && "border-ink-400 text-ink-200",
        className,
      )}
    >
      {children}
    </p>
  );
}
