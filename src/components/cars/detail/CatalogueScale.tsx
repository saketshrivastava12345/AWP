import { cn } from "@/lib/utils";
import { formatFigure, ordinal } from "@/lib/detail/figures";
import { scaleEnds, type CatalogueStanding } from "@/lib/detail/performance";

/**
 * A car's place in the catalogue on one figure, drawn as a distribution strip:
 * every faint tick is a catalogued car that publishes the figure, the gold
 * marker is this car, and "better" is always to the right (the scale is
 * flipped for lower-is-better figures such as 0–100 times).
 *
 * The strip is decorative for assistive technology; the same facts are in the
 * visible caption and a screen-reader sentence.
 *
 * Props:
 *   standing   from catalogueStanding() — never null here (omit the bar instead)
 *   label      the figure's name, e.g. "Power"
 *   unit       unit printed on the scale ends, e.g. "hp"
 *   decimals   decimals for the scale ends
 *   noun       what the population is, e.g. "cars that publish power"
 *   better     plain reading of the right-hand end, e.g. "More powerful"
 */
export function CatalogueScale({
  standing,
  label,
  unit,
  decimals = 0,
  noun,
  better,
  className,
}: {
  standing: CatalogueStanding;
  label: string;
  unit: string;
  decimals?: number;
  noun: string;
  better: string;
  className?: string;
}) {
  const ends = scaleEnds(standing);
  const at = (position: number) =>
    `${(Math.min(1, Math.max(0, position)) * 100).toFixed(2)}%`;
  const value = `${formatFigure(standing.value, decimals)} ${unit}`;

  return (
    <div className={cn("w-full", className)}>
      <p className="sr-only">
        {label} {value}: ranked {ordinal(standing.rank)} of {standing.count} catalogued{" "}
        {noun} ({ordinal(standing.percentile)} percentile). Catalogue range{" "}
        {formatFigure(ends.left, decimals)} to {formatFigure(ends.right, decimals)} {unit}
        .
      </p>

      <div aria-hidden="true" className="relative h-9">
        {/* Track, with the share this car meets or beats filled in. */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong" />
        <div
          className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 bg-gradient-to-r from-gold-800 via-gold-700 to-gold-500"
          style={{ width: at(standing.position) }}
        />

        {/* One tick per catalogued car. Overlapping ticks read as density. */}
        {standing.distribution.map((position, index) => (
          <span
            key={index}
            className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-300/35"
            style={{ left: at(position) }}
          />
        ))}

        {/* This car. */}
        <span
          className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
          style={{ left: at(standing.position) }}
        >
          <span className="size-1.5 rotate-45 bg-gold-300" />
          <span className="h-4 w-[2px] bg-gold-400 shadow-[0_0_0_3px_var(--color-void)]" />
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-3 font-mono text-micro text-ink-500 tabular-nums">
        <span>
          {formatFigure(ends.left, decimals)} {unit}
        </span>
        <span className="hidden truncate text-ink-600 sm:inline">{better} →</span>
        <span>
          {formatFigure(ends.right, decimals)} {unit}
        </span>
      </div>
    </div>
  );
}
