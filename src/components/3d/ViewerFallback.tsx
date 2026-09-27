import Image from "next/image";
import { RotateCcw } from "lucide-react";
import type { CarBuild } from "@/lib/car-build";
import { carSilhouette } from "@/components/cars/car-silhouette";

/**
 * What the viewer shows when there can be no 3D: no WebGL, a lost graphics
 * context, or a scene that failed to start. The car's photograph when there
 * is one, otherwise its body-style silhouette — never a broken canvas.
 */
export function ViewerFallback({
  build,
  title,
  posterUrl,
  reason,
  onRetry,
}: {
  build: CarBuild;
  title: string;
  posterUrl: string | null;
  reason: string;
  onRetry?: () => void;
}) {
  const silhouette = posterUrl
    ? null
    : carSilhouette(build.bodyType, build.powertrain, build.enginePosition);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-surface-1 p-6 text-center">
      {posterUrl ? (
        <div className="absolute inset-0">
          <Image
            src={posterUrl}
            alt={`${title} — photograph`}
            fill
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="object-cover opacity-45"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/60 to-transparent" />
        </div>
      ) : silhouette ? (
        <svg
          viewBox={silhouette.viewBox}
          className="w-[min(28rem,70%)] text-ink-600"
          role="img"
          aria-label={`Silhouette of the body style — a placeholder, not a likeness of the ${title}`}
        >
          <path d={silhouette.body} className="fill-surface-3" />
          <path d={silhouette.glass} className="fill-surface-4" />
          {silhouette.wheels.map((wheel, index) => (
            <circle
              key={index}
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-surface-4"
              strokeWidth={4}
            />
          ))}
        </svg>
      ) : null}
      <div className="relative">
        <p className="font-display text-xs tracking-hud text-ink-100 uppercase">
          3D model unavailable
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-400">
          {reason}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto mt-4 flex min-h-11 items-center gap-2 rounded-xs border border-line-strong px-4 font-display text-micro tracking-button text-ink-100 uppercase transition-colors hover:border-gold-500 hover:text-gold-300"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}
