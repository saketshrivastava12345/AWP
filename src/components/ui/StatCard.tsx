import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";

export type StatCardProps = {
  /** Small caps label, e.g. "0–100 KM/H". */
  label: string;
  /** Pre-formatted value, or null when the figure is not published. */
  value: string | null;
  /** Unit shown smaller beside the value, e.g. "SEC". */
  unit?: string;
  /** Optional provenance/caveat, surfaced as a tooltip. */
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
  const isAvailable = value !== null;

  return (
    <div className={cn("edge-light bg-surface-1/60 px-5 py-6", className)}>
      <p className="text-label" title={hint}>
        {label}
      </p>

      {isAvailable ? (
        <p
          className={cn(
            "tabular mt-3 font-display leading-none text-ink-50",
            VALUE_SIZES[size],
          )}
        >
          {value}
          {unit ? <span className="ml-2 text-xs text-ink-400">{unit}</span> : null}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-none text-ink-500 italic">{NOT_AVAILABLE}</p>
      )}
    </div>
  );
}

/**
 * A row of stats separated by hairlines. Uses a one-pixel gap over a bordered
 * container so the dividers are true hairlines at any device pixel ratio.
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
