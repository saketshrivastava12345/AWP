import { cn } from "@/lib/utils";
import { carSilhouette } from "@/components/cars/car-silhouette";
import type { PowertrainKind } from "@/types/domain";

/**
 * Side elevation of a body style, for a car without a usable photograph.
 *
 * Drawn from the same profiles as the 3D car and the catalogue cards, and
 * labelled for what it is — a drawing of the body style, not a likeness of
 * the car.
 */
export function CarSilhouette({
  bodyType,
  powertrain,
  caption = false,
  className,
}: {
  bodyType: string | null;
  powertrain: PowertrainKind;
  /** Show the "Drawing · no photograph" caption (too small to read on thumbnails). */
  caption?: boolean;
  className?: string;
}) {
  const shape = carSilhouette(bodyType, powertrain);
  return (
    <div
      className={cn(
        "@container absolute inset-0 flex flex-col items-center justify-center gap-2",
        "bg-surface-2",
        className,
      )}
    >
      <svg
        viewBox={shape.viewBox}
        className="w-[70%] max-w-64 overflow-visible"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={shape.body}
          className="fill-surface-3 stroke-ink-500"
          strokeWidth={2.5}
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/70" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-500"
              strokeWidth={2.5}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-ink-400"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      {caption ? (
        <span className="text-caption whitespace-nowrap">
          <span className="sr-only @min-[11rem]:not-sr-only">
            Drawing · no photograph
          </span>
        </span>
      ) : (
        <span className="sr-only">Drawing · no photograph</span>
      )}
    </div>
  );
}
