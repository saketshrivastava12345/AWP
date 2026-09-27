import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import { InfoHint } from "@/components/ui/Tooltip";

export type SpecRow = {
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Provenance or caveat, shown as an info hint beside the label. */
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
 * structural reasons (the section nav links to them). Hints are InfoHints —
 * reachable by keyboard and touch, unlike a `title` attribute.
 */
export function SpecSection({
  id,
  title,
  rows,
  note,
  children,
  alwaysShow = false,
  headingLevel = 3,
  className,
}: {
  id: string;
  title: string;
  rows: SpecRow[];
  note?: ReactNode;
  children?: ReactNode;
  alwaysShow?: boolean;
  /** 3 inside a page chapter (default); 2 when the section stands alone. */
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const hasAnyValue = rows.some((row) => row.value !== null);
  if (!hasAnyValue && !alwaysShow && !children) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("pt-14 first:pt-0", className)}
    >
      <Heading id={`${id}-heading`} className="text-h3">
        {title}
      </Heading>

      {rows.length > 0 ? (
        <dl className="mt-4 border-t border-line">
          {rows.map((row) => {
            const unavailable = row.value === null;
            return (
              <div
                key={row.label}
                className="grid grid-cols-2 items-baseline gap-4 border-b border-line-subtle py-3.5 sm:grid-cols-[minmax(0,18rem)_1fr]"
              >
                <dt className="flex min-w-0 items-center gap-1 text-body-s text-ink-300">
                  <span>{row.label}</span>
                  {row.hint ? (
                    <InfoHint label={`About ${row.label.toLowerCase()}`}>
                      {row.hint}
                    </InfoHint>
                  ) : null}
                </dt>
                <dd
                  className={cn(
                    "min-w-0 text-right [overflow-wrap:anywhere] sm:text-left",
                    unavailable ? "text-body-s text-ink-400" : "text-data text-ink-50",
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

      {note ? <p className="mt-4 max-w-[72ch] text-caption">{note}</p> : null}
    </section>
  );
}
