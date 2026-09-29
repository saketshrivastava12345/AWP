import { cn } from "@/lib/utils";
import type { Silhouette } from "@/components/cars/car-silhouette";

/**
 * A body-style drawing used where a photograph is missing — the same
 * profiles as the card placeholder and the 3D car. It is a drawing of the kind
 * of car, never presented as a likeness. No hooks: server or client.
 */
export function SilhouetteArt({
  shape,
  className,
}: {
  shape: Silhouette;
  className?: string;
}) {
  return (
    <svg
      viewBox={shape.viewBox}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
      fill="none"
    >
      <path
        d={shape.body}
        className="fill-surface-3/70 stroke-ink-500"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {shape.glass ? <path d={shape.glass} className="fill-void/70" /> : null}
      {shape.wheels.map((wheel) => (
        <g key={wheel.cx}>
          <circle
            cx={wheel.cx}
            cy={wheel.cy}
            r={wheel.r}
            className="fill-void stroke-ink-500"
            strokeWidth={2}
          />
          <circle
            cx={wheel.cx}
            cy={wheel.cy}
            r={wheel.r * 0.62}
            className="stroke-gold-700"
            strokeWidth={1.5}
          />
        </g>
      ))}
    </svg>
  );
}
