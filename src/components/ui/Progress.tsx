import { cn } from "@/lib/utils";

/**
 * A hairline progress bar with its label and percentage, the way the loading
 * sequences read: MODEL ────────── 72%.
 */
export function Progress({
  label,
  value,
  className,
}: {
  label: string;
  /** 0–100, or null for "waiting" (indeterminate). */
  value: number | null;
  className?: string;
}) {
  const clamped = value === null ? null : Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="w-24 shrink-0 text-caption">{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped ?? undefined}
        className="relative h-px flex-1 overflow-hidden bg-surface-4"
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 bg-gold-500 transition-[width] duration-(--duration-normal)",
            clamped === null && "w-1/4 animate-pulse",
          )}
          style={clamped === null ? undefined : { width: `${clamped}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-mono text-micro text-ink-300 tabular-nums">
        {clamped === null ? "—" : `${clamped}%`}
      </span>
    </div>
  );
}
