import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import { InfoHint } from "@/components/ui/Tooltip";

export type StatCardProps = {
  /** Small caps label, e.g. "0–100 KM/H". */
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Unit shown smaller beside the value, e.g. "SEC". */
  unit?: string;
  /** Provenance or caveat, shown by an "i" hint reachable by keyboard and touch. */
  hint?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const VALUE_SIZES = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-4xl sm:text-5xl",
} as const;

/**
 * The signature numeric treatment: a small tracked label above a large display
 * figure. Digits are tabular so columns of these line up.
 *
 * It is one term–description pair, so it must sit inside a <StatRow> (a <dl>):
 * the label is the <dt> and the figure the <dd>, which is what lets a screen
 * reader announce "Power, 650 PS" as a pair.
 *
 * When `value` is null the component renders "Not available" in muted text at
 * body size rather than hiding itself — an absent figure is information, and
 * silently dropping the tile would make the row jump around.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  size = "md",
  className,
}: StatCardProps) {
  return (
    <div className={cn("edge-light bg-surface-1/60 px-5 py-6", className)}>
      {/* The 20px hint button is pulled into the 15px label line box with
          negative margin, so hinted and plain labels are the same height and
          the values beneath them line up. A long label wraps instead of
          overflowing a narrow card. */}
      <dt className="flex min-w-0 items-start gap-1.5 text-label">
        <span className="min-w-0 break-words">{label}</span>
        {hint ? (
          <InfoHint
            label={`About ${label}`}
            side="bottom"
            className="-my-[2.5px] shrink-0 font-sans"
          >
            {hint}
          </InfoHint>
        ) : null}
      </dt>

      {value !== null ? (
        <dd
          className={cn(
            "tabular mt-3 font-display leading-none text-ink-50",
            VALUE_SIZES[size],
          )}
        >
          {value}
          {unit ? <span className="ml-2 text-xs text-ink-400">{unit}</span> : null}
        </dd>
      ) : (
        <dd className="mt-3 text-sm leading-none text-ink-500 italic">{NOT_AVAILABLE}</dd>
      )}
    </div>
  );
}

/**
 * A row of stats separated by hairlines: the <dl> that StatCards belong in.
 * Uses a one-pixel gap over a bordered container so the dividers are true
 * hairlines at any device pixel ratio.
 */
export function StatRow({
  children,
  className,
  ...rest
}: ComponentPropsWithoutRef<"dl">) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px border-t border-line pt-px lg:grid-cols-4",
        className,
      )}
      {...rest}
    >
      {children}
    </dl>
  );
}
