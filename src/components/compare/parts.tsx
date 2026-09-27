import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/Tooltip";
import type { CompareRow } from "@/lib/compare-rows";
import { CardHint } from "./CardHint";

/**
 * The number that ties a car's column, its mobile rows and its header card
 * together. Decorative: the car's name is always next to it in text.
 */
export function CarMarker({ index, className }: { index: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-xs border border-gold-700",
        "font-mono text-[10px] leading-none text-gold-300",
        className,
      )}
    >
      {index + 1}
    </span>
  );
}

/**
 * A row's name, with what the figure means and how its bars are scaled.
 *
 * In the table the hint sits beside the label and opens to the right, into
 * the car columns. On a mobile card it sits at the card's right edge and
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

  const text = (
    <>
      {row.sublabel ? (
        <span className="text-micro text-ink-500">{row.sublabel}</span>
      ) : null}
      {row.hasBars && row.better === "lower" ? (
        <span className="text-micro text-ink-500">Lower is better</span>
      ) : null}
    </>
  );

  if (placement === "card") {
    return (
      <span className={cn("flex items-start justify-between gap-3", className)}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm leading-snug text-ink-100">{row.label}</span>
          {text}
        </span>
        {explanation.length > 0 ? (
          <CardHint label={row.label} parts={explanation} />
        ) : null}
      </span>
    );
  }

  return (
    <span className={cn("flex flex-col gap-0.5", className)}>
      <span className="flex items-center gap-1 text-xs leading-snug text-ink-200">
        <span>{row.label}</span>
        {explanation.length > 0 ? (
          <InfoHint label={`About ${row.label}`} side="right">
            {content}
          </InfoHint>
        ) : null}
      </span>
      {text}
    </span>
  );
}
