import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import { InfoHint } from "@/components/ui/Tooltip";
import { Reveal } from "@/components/fx/Reveal";

export type SpecRow = {
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Provenance or caveat, shown as an info hint beside the label. */
  hint?: string | null;
};

/**
 * A titled data panel of label/value rows, telemetry style: a HUD panel with
 * corner brackets, mono labels, and a lit segment beside every published
 * figure (a dim one beside an absent figure — the segment is a status light,
 * not a measurement, so it never claims a magnitude).
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
  const published = rows.filter((row) => row.value !== null).length;
  if (published === 0 && !alwaysShow && !children) return null;
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn("pt-10 first:pt-0", className)}
    >
      <div className="relative rounded-card p-5 hud-panel sm:p-6">
        <span aria-hidden="true" className="hud-brackets -m-px" />
        <span
          aria-hidden="true"
          className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
        >
          Data // {id.replace(/-/g, " ")}
        </span>

        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Heading id={`${id}-heading`} className="text-h3">
            {title}
          </Heading>
          {rows.length > 0 ? (
            <p className="font-mono text-[11px] tracking-hud text-ink-400 uppercase tabular-nums">
              <span className="text-cyan-200">{published}</span> / {rows.length} published
            </p>
          ) : null}
        </div>

        {rows.length > 0 ? (
          <Reveal
            as="dl"
            variant="fade"
            stagger={40}
            className="mt-5 border-t border-line"
          >
            {rows.map((row) => {
              const unavailable = row.value === null;
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1 border-b border-line-subtle py-3 sm:grid-cols-[auto_minmax(0,17rem)_1fr] sm:gap-x-4"
                >
                  {/* The status segment: lit for a published figure. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mb-px inline-block h-2 w-1.5 self-center",
                      unavailable
                        ? "bg-ink-600/60"
                        : "bg-cyan-400 shadow-[0_0_6px_var(--color-cyan-400)]",
                    )}
                  />
                  <dt className="flex min-w-0 items-center gap-1 font-mono text-[12px] tracking-[0.08em] text-ink-300 uppercase">
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
          </Reveal>
        ) : null}

        {children}

        {note ? <p className="mt-4 max-w-[72ch] text-caption">{note}</p> : null}
      </div>
    </section>
  );
}
