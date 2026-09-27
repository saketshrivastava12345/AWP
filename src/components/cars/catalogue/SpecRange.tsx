import { formatNumber } from "@/lib/format";
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
 * One figure's spread across a model's variants. Only rendered from published
 * figures; with none, it says so rather than disappearing, so a row of these
 * does not silently lose a column.
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
  /** e.g. "3 of 4 variants publish this". */
  note?: string;
  className?: string;
}) {
  return (
    <div className={cn("edge-light bg-surface-1/70 px-4 py-5 sm:px-5", className)}>
      <dt className="text-label">{label}</dt>
      <dd className="mt-3">
        {range ? (
          <p className="tabular font-display text-lg leading-none text-ink-50 sm:text-2xl">
            <span className="whitespace-nowrap">{formatRange(range, decimals)}</span>
            <span className="ml-1.5 font-sans text-xs text-ink-400">{unit}</span>
          </p>
        ) : (
          <p className="text-sm leading-none text-ink-500 italic">Not available</p>
        )}
        {note ? <p className="mt-2 text-[11px] text-ink-500">{note}</p> : null}
      </dd>
    </div>
  );
}
