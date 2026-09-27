import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { EM_DASH } from "@/lib/format";
import type { CompareCell, CompareRow } from "@/lib/compare-rows";

/**
 * One car's value in one row, in pieces the desktop table and the phone
 * cards arrange differently: the figure (ValueText), its secondary line
 * (ValueNote) and its bar (CompareBar). `CompareValue` stacks all three.
 *
 * Both layouts say exactly the same thing. "Best" is marked in words as well
 * as colour (gold is the one accent the page spends on it), and the kinds of
 * absence read differently: a dash is "not published" (for a feature, "not
 * catalogued"), and "Not applicable" is a figure that cannot exist for that
 * powertrain.
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
      <span className={cn("text-caption", className)}>
        Not applicable
        <span className="sr-only"> to this powertrain</span>
      </span>
    );
  }

  if (cell.state === "missing") {
    return (
      <span className={cn("text-data text-ink-400", className)}>
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
        <Check
          className="size-[18px] text-ink-100"
          strokeWidth={1.75}
          aria-hidden="true"
        />
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
          isText ? "text-body-s text-ink-50" : "text-data text-ink-50",
          cell.isBest && "text-gold-300",
        )}
      >
        {cell.display}
      </span>
      {cell.isBest ? (
        <span className="font-sans text-xs font-medium text-ink-300">Best</span>
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
  return <span className={cn("block text-caption", className)}>{cell.note}</span>;
}

/** Stagger for a bar's entrance, by its row and column. */
export function barDelay(rowIndex: number, carIndex: number): number {
  return Math.min(rowIndex, 8) * 45 + carIndex * 70;
}

/**
 * A figure's share of its row's scale, on the headline performance rows
 * only. Grows in once when its group scrolls into view (CompareShell arms
 * and reveals it), and re-scales smoothly when the set of cars changes.
 * Server-rendered at full length, so it is correct without JavaScript.
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
      className={cn("block h-0.5 w-full overflow-hidden rounded-pill bg-line", className)}
    >
      <span
        style={style}
        className={cn(
          "block h-full origin-left scale-x-(--bar) rounded-pill",
          "transition-[scale] delay-(--bar-delay) duration-(--duration-cinematic) ease-standard motion-reduce:delay-0",
          "group-data-[bars=armed]/bars:scale-x-0",
          cell.isBest ? "bg-gold-500" : "bg-ink-400",
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
        className="mt-3"
      />
    </span>
  );
}
