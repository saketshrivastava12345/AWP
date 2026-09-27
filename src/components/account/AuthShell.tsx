import { type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/**
 * The frame for sign-in, sign-up and password screens: the explanation on
 * the left, the form in a card on the right (stacked on small screens).
 * Server-safe.
 */
export function AuthShell({
  overline = "Account",
  title,
  description,
  aside,
  children,
  className,
}: {
  overline?: string;
  title: string;
  description?: ReactNode;
  /** Extra copy under the description (desktop and mobile). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grain relative flex flex-1 flex-col", className)}>
      <Container className="relative z-10 grid flex-1 items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-20">
        <div className="max-w-lg">
          <p className="text-label">{overline}</p>
          <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-4 text-sm leading-relaxed text-ink-300">{description}</div>
          ) : null}
          {aside ? <div className="mt-8 hidden lg:block">{aside}</div> : null}
        </div>
        <div className="w-full rounded-md border border-line bg-surface-1/85 p-6 shadow-[0_28px_70px_-40px_rgb(0_0_0/0.9)] backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </Container>
    </div>
  );
}

/** Same footprint as AuthShell with a form, while the dynamic part streams in. */
export function AuthShellSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-hidden="true">
      <Container className="grid flex-1 items-center gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)] lg:gap-20">
        <div className="max-w-lg">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-6 h-8 w-56" />
          <Skeleton className="mt-5 h-4 w-full max-w-sm" />
        </div>
        <div className="rounded-md border border-line bg-surface-1 p-6 sm:p-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="mt-8 h-3 w-28" />
          <Skeleton className="mt-3 h-11 w-full" />
          <Skeleton className="mt-6 h-3 w-20" />
          <Skeleton className="mt-3 h-11 w-full" />
          <Skeleton className="mt-8 h-11 w-full" />
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
        "rounded-sm border px-4 py-3 text-sm leading-relaxed",
        tone === "error" && "border-signal-negative/40 bg-signal-negative/5 text-ink-100",
        tone === "success" &&
          "border-signal-positive/40 bg-signal-positive/5 text-ink-100",
        tone === "info" && "border-line-strong bg-surface-2 text-ink-200",
        className,
      )}
    >
      {children}
    </p>
  );
}
