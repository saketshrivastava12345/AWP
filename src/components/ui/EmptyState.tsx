import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shown when a query returns nothing, or when the data source is unreachable.
 *
 * Deliberately a normal part of the design system rather than an afterthought:
 * the quality requirements call for every list to have a real empty state, and
 * Supabase being unconfigured must render this instead of crashing.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-card hud-panel",
        "px-6 py-16 text-center sm:py-20",
        className,
      )}
    >
      <span aria-hidden="true" className="hud-brackets -m-px" />
      {icon ? (
        <div className="mb-5 text-cyan-300 drop-shadow-[0_0_10px_oklch(0.8_0.14_210/50%)]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-h4">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-body-s text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
