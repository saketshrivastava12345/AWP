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
        "flex flex-col items-center justify-center rounded-md border border-line",
        "border-dashed px-6 py-20 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-5 text-ink-500">{icon}</div> : null}
      <h3 className="font-display text-sm tracking-[0.14em] text-ink-100 uppercase">
        {title}
      </h3>
      {description ? (
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-7">{action}</div> : null}
    </div>
  );
}
