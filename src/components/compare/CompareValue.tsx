import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EM_DASH } from "@/lib/format";
import type { CompareCell, CompareRow } from "@/lib/compare-rows";

/**
 * One car's value in one row, in pieces the desktop table and the mobile
 * cards arrange differently: the figure (ValueText), its secondary line
 * (ValueNote) and its bar (CompareBar). `CompareValue` stacks all three.
 *
 * Both layouts say exactly the same thing. "Best" is marked in words as well
 * as colour, and the three kinds of absence read differently: a dash is "not
 * published", a feature's dash is "not catalogued", "n/a" is "does not apply".
 */
export function ValueText({
  row,
  cell,
  className,
}: {
  row: CompareRow;
  cell: CompareCell;
  className?: string;
}) {
  if (cell.state === "not-applicable") {
    return (
      <span className={cn("font-mono text-xs text-ink-600", className)}>
        <span aria-hidden="true">n/a</span>
        <span className="sr-only">Not applicable to this powertrain</span>
      </span>
    );
  }

  if (cell.state === "missing") {
    return (
      <span className={cn("font-mono text-sm text-ink-600", className)}>
        <span aria-hidden="true">{EM_DASH}</span>
        <span className="sr-only">
          {row.kind === "feature" ? "Not catalogued" : "Not published"}
        </span>
      </span>
    );
  }

  if (row.kind === "feature") {
    return (
      <span className={cn("inline-flex", className)}>
        <Check className="size-4 text-gold-400" aria-hidden="true" />
        <span className="sr-only">Catalogued</span>
      </span>
    );
  }

  const isText = row.kind === "text";
  return (
    <span
      className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}
    >
      <span
        className={cn(
          isText
            ? "text-[13px] leading-snug text-ink-100"
            : "tabular font-mono text-[13px] leading-tight text-ink-50",
          row.kind === "price" && "text-gold-200",
          cell.isBest && "text-signal-positive",
        )}
      >
        {cell.display}
      </span>
      {cell.isBest ? (
        <span className="font-display text-nano tracking-hud text-signal-positive uppercase">
          Best
        </span>
      ) : null}
    </span>
  );
}

export function ValueNote({
  cell,
  className,
}: {
  cell: CompareCell;
  className?: string;
}) {
  if (cell.state !== "value" || !cell.note) return null;
  return (
    <span className={cn("block text-micro leading-snug text-ink-500", className)}>
      {cell.note}
    </span>
  );
}

/** Stagger for a bar's entrance, by its row and column. */
export function barDelay(rowIndex: number, carIndex: number): number {
  return Math.min(rowIndex, 8) * 45 + carIndex * 70;
}

/**
 * A figure's share of its row's scale. Grows in once when its group scrolls
 * into view (CompareShell arms and reveals it), and re-scales smoothly when
 * the set of cars changes. Server-rendered at full length, so it is correct
 * without JavaScript.
 */
export function CompareBar({
  row,
  cell,
  delay,
  className,
}: {
  row: CompareRow;
  cell: CompareCell;
  delay: number;
  className?: string;
}) {
  if (!row.hasBars || cell.bar === null) return null;

  const style = {
    "--bar": cell.bar.toFixed(4),
    "--bar-delay": `${delay}ms`,
  } as CSSProperties;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "block h-[3px] w-full overflow-hidden rounded-full bg-line",
        className,
      )}
    >
      <span
        style={style}
        className={cn(
          "block h-full origin-left scale-x-(--bar) rounded-full",
          "transition-[scale] delay-(--bar-delay) duration-(--duration-cinematic) ease-cinematic motion-reduce:delay-0",
          "group-data-[bars=armed]/bars:scale-x-0",
          cell.isBest
            ? "bg-signal-positive"
            : row.better !== "none"
              ? "bg-gold-600/80"
              : "bg-ink-500/70",
        )}
      />
    </span>
  );
}

/** Figure, note and bar, stacked — the desktop table cell. */
export function CompareValue({
  row,
  cell,
  rowIndex,
  carIndex,
}: {
  row: CompareRow;
  cell: CompareCell;
  rowIndex: number;
  carIndex: number;
}) {
  return (
    <span className="block min-w-0">
      <ValueText row={row} cell={cell} />
      <ValueNote cell={cell} className="mt-1" />
      <CompareBar
        row={row}
        cell={cell}
        delay={barDelay(rowIndex, carIndex)}
        className="mt-2"
      />
    </span>
  );
}
