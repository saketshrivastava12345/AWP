import { formatNumber } from "@/lib/format";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";
import type { NumberRange } from "@/lib/queries/models";

/** "385–650", or a single figure when every variant publishes the same one. */
export function formatRange(range: NumberRange, decimals = 0): string {
  const format = (value: number) =>
    decimals > 0 ? value.toFixed(decimals) : formatNumber(value);
  const [min, max] = range;
  return min === max ? format(min) : `${format(min)}–${format(max)}`;
}

/**
 * One figure's spread across a model's variants, as a key figure in a
 * StatRow: "450–650 hp" over "Power". Only rendered from published figures;
 * with none, it shows a dash and "not published" rather than disappearing,
 * so a row of these does not silently lose a column.
 */
export function SpecRange({
  label,
  range,
  unit,
  decimals = 0,
  note,
  className,
}: {
  label: string;
  range: NumberRange | null;
  unit: string;
  decimals?: number;
  /** e.g. "3 of 4 variants publish this" — shown behind an info hint. */
  note?: string;
  className?: string;
}) {
  return (
    <StatCard
      label={label}
      value={range ? formatRange(range, decimals) : null}
      unit={unit}
      hint={note}
      // A range ("470–800") is twice as wide as a single figure, and Michroma
      // is a wide face: set it smaller (down to 24px two-up on a phone) and
      // never break it at the dash.
      className={cn(
        "[&_dd]:text-[clamp(1.5rem,3.2vw,3rem)] [&_dd>span:first-child]:whitespace-nowrap",
        className,
      )}
    />
  );
}
