import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind, type BodyType, type FuelType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a car without a usable photograph: a side elevation of its
 * body style, drawn from the same profiles as the 3D model, on a quiet
 * ground. It is labelled as a drawing so it is never mistaken for the car
 * itself.
 */
export function Silhouette({
  bodyType,
  fuelType,
  label = true,
  className,
  drawingClassName,
}: {
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  /** The "Drawing · no photograph" caption. Keep it wherever a photo could be expected. */
  label?: boolean;
  className?: string;
  /** Width of the drawing within the frame (default 64%, capped at 18rem). */
  drawingClassName?: string;
}) {
  const shape = carSilhouette(bodyType, powertrainKind(fuelType));

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden",
        "bg-[radial-gradient(ellipse_at_50%_62%,var(--color-surface-3)_0%,var(--color-surface-2)_48%,var(--color-surface-1)_100%)]",
        className,
      )}
    >
      <svg
        viewBox={shape.viewBox}
        className={cn("relative w-[64%] max-w-72 overflow-visible", drawingClassName)}
        aria-hidden="true"
        fill="none"
      >
        <path
          d={shape.body}
          className="fill-surface-3 stroke-ink-500"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/60" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-500"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-ink-400"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      {label ? (
        <span className="relative text-caption text-ink-400">
          Drawing · no photograph
        </span>
      ) : (
        <span className="sr-only">Drawing, no photograph</span>
      )}
    </div>
  );
}
