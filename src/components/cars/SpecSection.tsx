import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";

export type SpecRow = {
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Provenance or caveat, shown as a tooltip on the label. */
  hint?: string | null;
};

/**
 * A titled block of label/value rows.
 *
 * Two rules, both from the data-honesty requirement:
 *
 *   - An individual null renders "Not available". The absence of a figure is
 *     itself information, so the row stays.
 *   - A section where *every* row is null renders nothing at all. A block of
 *     six "Not available" rows tells the reader less than no block.
 *
 * `alwaysShow` overrides the second rule for sections that must appear for
 * structural reasons (the section nav links to them).
 */
export function SpecSection({
  id,
  title,
  rows,
  note,
  children,
  alwaysShow = false,
  className,
}: {
  id: string;
  title: string;
  rows: SpecRow[];
  note?: ReactNode;
  children?: ReactNode;
  alwaysShow?: boolean;
  className?: string;
}) {
  const hasAnyValue = rows.some((row) => row.value !== null);
  if (!hasAnyValue && !alwaysShow && !children) return null;

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("scroll-mt-32 pt-14", className)}
    >
      <h2
        id={`${id}-heading`}
        className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
      >
        {title}
      </h2>

      {rows.length > 0 ? (
        <dl className="mt-1">
          {rows.map((row) => {
            const unavailable = row.value === null;
            return (
              <div
                key={row.label}
                className="grid grid-cols-2 gap-4 border-b border-line-subtle py-3.5 sm:grid-cols-[minmax(0,16rem)_1fr]"
              >
                <dt className="text-sm text-ink-400" title={row.hint ?? undefined}>
                  {row.label}
                  {row.hint ? (
                    <span className="ml-1.5 text-ink-600" aria-hidden="true">
                      ⓘ
                    </span>
                  ) : null}
                </dt>
                <dd
                  className={cn(
                    "tabular text-right font-mono text-sm sm:text-left",
                    unavailable ? "font-sans text-ink-600 italic" : "text-ink-100",
                  )}
                >
                  {unavailable ? NOT_AVAILABLE : row.value}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {children}

      {note ? <p className="mt-5 text-xs leading-relaxed text-ink-500">{note}</p> : null}
    </section>
  );
}
