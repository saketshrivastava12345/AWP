import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind, type BodyType, type FuelType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * Stand-in for a car without a usable photograph: a side elevation of its
 * body style, drawn from the same profiles as the 3D model, over a faint
 * engineering grid. It is labelled as a drawing so it is never mistaken for
 * the car itself.
 */
export function Silhouette({
  bodyType,
  fuelType,
  className,
}: {
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  className?: string;
}) {
  const shape = carSilhouette(bodyType, powertrainKind(fuelType));

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-hidden",
        "bg-[radial-gradient(ellipse_at_50%_60%,var(--color-surface-3)_0%,var(--color-surface-1)_70%)]",
        className,
      )}
    >
      <div aria-hidden="true" className="absolute inset-0 tech-grid opacity-60" />
      <svg
        viewBox={shape.viewBox}
        className="relative w-[64%] max-w-72 overflow-visible"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={shape.body}
          className="fill-surface-3 stroke-ink-600"
          strokeWidth={2.5}
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/70" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-600"
              strokeWidth={2.5}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-gold-700"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      <span className="relative text-hud text-ink-500">
        Body-style drawing · no photograph
      </span>
    </div>
  );
}
