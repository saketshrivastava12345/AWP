import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The standard section header: a tracked overline above a display-face title,
 * with optional supporting copy and a trailing action.
 */
export function SectionHeading({
  overline,
  title,
  description,
  action,
  className,
}: {
  overline?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {overline ? <p className="mb-3 text-label">{overline}</p> : null}
        <h2 className="font-display text-xl tracking-[0.06em] text-ink-50 sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-300">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
