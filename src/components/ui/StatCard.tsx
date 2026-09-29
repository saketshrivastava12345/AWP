import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { EM_DASH } from "@/lib/format";
import { InfoHint } from "@/components/ui/Tooltip";
import { CountUp } from "@/components/fx/CountUp";

export type StatCardProps = {
  /** Sentence-case label shown under the figure, e.g. "0–100 km/h". */
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Unit set smaller beside the value, e.g. "s" or "hp". */
  unit?: string;
  /** Provenance or caveat, shown by an "i" hint reachable by keyboard and touch. */
  hint?: string;
  /**
   * `md` (default) and `lg` set the value in text-figure-xl — the key-figure
   * row of a hero. `sm` sets it in text-figure for dense contexts.
   */
  size?: "sm" | "md" | "lg";
  /**
   * Count up from zero to `value` when first scrolled into view. The server
   * HTML and the resting state always show the real `value` (see fx/CountUp).
   */
  countUp?: boolean;
  /** Accent of the tick and glow: cyan (default), gold for a "best" figure. */
  tone?: "cyan" | "gold";
  className?: string;
};

/**
 * A key figure, telemetry style: a lit tick, a large glowing Michroma
 * number and a small mono label beneath it. No box — figures sit on the
 * page ground, separated by the hairlines that StatRow draws.
 *
 * It is one term–description pair, so it must sit inside a <StatRow> (a <dl>):
 * the label is the <dt> and the figure the <dd>, which is what lets a screen
 * reader announce "Power, 650 PS" as a pair. The DOM keeps <dt> first; the
 * figure is lifted above the label visually with flex-col-reverse.
 *
 * When `value` is null the figure is an em dash in ink-400 (read out as "Not
 * available") and the label says "not published" — an absent figure is
 * information, and silently dropping it would make the row jump around.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  size = "md",
  countUp = false,
  tone = "cyan",
  className,
}: StatCardProps) {
  const dense = size === "sm";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-2",
        // The lit tick above the figure (a pseudo-element: a <dl> group may
        // only hold <dt>/<dd>).
        "before:order-last before:mb-1 before:block before:h-0.5 before:w-6 before:content-['']",
        value === null
          ? "before:bg-ink-600"
          : tone === "gold"
            ? "before:bg-gold-400 before:shadow-[0_0_8px_var(--color-gold-400)]"
            : "before:bg-cyan-400 before:shadow-[0_0_8px_var(--color-cyan-400)]",
        className,
      )}
    >
      <dt
        className={cn(
          "flex min-w-0 items-start gap-1 font-mono tracking-[0.12em] text-ink-400 uppercase",
          dense ? "text-[11px] leading-snug" : "text-xs leading-snug",
        )}
      >
        <span className="min-w-0">
          {label}
          {value === null ? <span className="text-ink-400"> · not published</span> : null}
        </span>
        {hint ? (
          <InfoHint label={`About ${label}`} side="bottom" className="-my-0.5 shrink-0">
            {hint}
          </InfoHint>
        ) : null}
      </dt>

      {value !== null ? (
        <dd
          className={cn(
            "flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-ink-50",
            tone === "gold" ? "glow-text-gold" : "glow-text",
            dense ? "text-figure" : "text-figure-xl",
          )}
        >
          <span className="min-w-0">{countUp ? <CountUp value={value} /> : value}</span>
          {unit ? (
            <span
              className={cn(
                "font-mono tracking-normal [text-shadow:none]",
                tone === "gold" ? "text-gold-300" : "text-cyan-200",
                dense ? "text-xs" : "text-sm",
              )}
            >
              {unit}
            </span>
          ) : null}
        </dd>
      ) : (
        <dd className={cn("text-ink-400", dense ? "text-figure" : "text-figure-xl")}>
          <span aria-hidden="true">{EM_DASH}</span>
          <span className="sr-only">Not available</span>
        </dd>
      )}
    </div>
  );
}

/** The key-figure name the redesign spec uses; the same component. */
export const KeyFigure = StatCard;

/**
 * A row of two to four key figures, the <dl> that StatCards belong in.
 *
 * Below `lg` the figures sit in a 2×2 grid with hairlines between the
 * columns and rows; from `lg` they run in a single row with vertical
 * hairlines between them. Pass `lg:grid-cols-3` (or similar) through
 * `className` to fix the column count; by default every child gets an
 * equal column.
 */
export function StatRow({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"dl">) {
  return (
    <dl
      className={cn(
        // Layout and hairlines live in the stat-row utility (globals.css).
        "stat-row",
        className,
      )}
      {...rest}
    >
      {children}
    </dl>
  );
}
