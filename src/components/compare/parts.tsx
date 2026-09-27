import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/Tooltip";
import type { CompareRow } from "@/lib/compare-rows";
import { CardHint } from "./CardHint";

/**
 * The number that ties a car's header card to its lines in the phone
 * layout, where each row lists the cars one under another. Decorative (the
 * car's name is always next to it in text) and neutral: gold is reserved for
 * the best figure.
 */
export function CarMarker({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-pill bg-surface-3",
        "font-mono text-xs leading-none text-ink-200 tabular-nums",
        className,
      )}
    >
      {index + 1}
    </span>
  );
}

/** Whether a row says which direction wins — shown under its label. */
function directionNote(row: CompareRow): string | null {
  if (row.better === "lower" && (row.hasBars || row.hasBest)) return "Lower is better";
  return null;
}

/**
 * A row's name, with what the figure means and how its bars are scaled.
 *
 * In the table the hint sits beside the label and opens to the right, into
 * the car columns. On a phone card it sits at the card's right edge and
 * opens to the left, so the tooltip never runs off a narrow screen.
 */
export function RowLabel({
  row,
  placement = "table",
  className,
}: {
  row: CompareRow;
  placement?: "table" | "card";
  className?: string;
}) {
  const explanation = [row.hint, row.scale].filter((part): part is string =>
    Boolean(part),
  );
  const content = explanation.map((part) => (
    <span key={part} className="block [&+&]:mt-1.5">
      {part}
    </span>
  ));
  const direction = directionNote(row);

  const secondary = (
    <>
      {row.sublabel ? <span className="text-caption">{row.sublabel}</span> : null}
      {direction ? <span className="text-caption">{direction}</span> : null}
    </>
  );

  if (placement === "card") {
    return (
      <span className={cn("flex items-start justify-between gap-3", className)}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body-s font-medium text-ink-100">{row.label}</span>
          {secondary}
        </span>
        {explanation.length > 0 ? (
          <CardHint label={row.label} parts={explanation} />
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      <span className="flex items-start gap-1 text-body-s text-ink-200">
        <span className="min-w-0">{row.label}</span>
        {explanation.length > 0 ? (
          <InfoHint label={`About ${row.label}`} side="right" className="mt-px">
            {content}
          </InfoHint>
        ) : null}
      </span>
      {secondary}
    </span>
  );
}

/**
 * How to read the marks in the comparison. A vertical list in the header's
 * first cell from lg; one caption line above the comparison below that.
 */
export function CompareLegend({
  layout,
  className,
}: {
  layout: "list" | "line";
  className?: string;
}) {
  if (layout === "line") {
    return (
      <p className={cn("text-caption", className)}>
        <span className="text-ink-200">—</span> not published ·{" "}
        <span className="text-ink-200">Not applicable</span> does not apply to that
        powertrain · <span className="text-gold-300">Best</span> marked only when two or
        more cars publish the figure · Prices are never converted or ranked.
      </p>
    );
  }

  return (
    <dl className={cn("space-y-3 text-caption", className)}>
      <div className="flex gap-3">
        <dt className="w-24 shrink-0 text-ink-200">
          <span aria-hidden="true">—</span>
          <span className="sr-only">A dash</span>
        </dt>
        <dd>Not published by the maker</dd>
      </div>
      <div className="flex gap-3">
        <dt className="w-24 shrink-0 text-ink-200">Not applicable</dt>
        <dd>Does not apply to that powertrain</dd>
      </div>
      <div className="flex gap-3">
        <dt className="w-24 shrink-0 text-gold-300">Best</dt>
        <dd>Marked only when two or more cars publish the figure</dd>
      </div>
      <div className="flex gap-3">
        <dt className="w-24 shrink-0 text-ink-200">Price</dt>
        <dd>As published, never converted or ranked</dd>
      </div>
    </dl>
  );
}
