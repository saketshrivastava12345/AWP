import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind, type BodyType, type FuelType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * The full-bleed hero of a brand or model page in the catalogue: the best
 * catalogue photograph behind a scrim, or — with none — a plain ground with a
 * large, faint body-style drawing. It starts under the transparent navbar and
 * holds its content at the bottom-left, as a maker's model page does.
 *
 * The drawing is decoration only (hidden from assistive technology); the
 * page never presents it as the car.
 */
export function HierarchyHero({
  image,
  imageAlt,
  bodyType,
  fuelType,
  children,
  className,
}: {
  image: string | null;
  imageAlt: string;
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  children: ReactNode;
  className?: string;
}) {
  const drawing = <HeroDrawing bodyType={bodyType} fuelType={fuelType} />;
  return (
    <section
      className={cn(
        "relative isolate bleed-under-nav flex flex-col justify-end overflow-hidden bg-surface-1",
        "min-h-[34rem] lg:min-h-[70svh]",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10">
        {image ? (
          <>
            <CarPhoto
              src={image}
              alt={imageAlt}
              sizes="100vw"
              loading="preload"
              className="object-cover object-[center_60%]"
              fallback={drawing}
            />
            {/* Text sits bottom-left over the photograph: darken from the
                bottom and the left, and keep the top clear for the navbar. */}
            <div aria-hidden="true" className="absolute inset-0 scrim-bottom" />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-t from-void via-void/60 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-linear-to-r from-void/70 via-void/20 to-transparent"
            />
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 scrim-top" />
          </>
        ) : (
          drawing
        )}
      </div>
      <Container className="relative w-full pt-16 pb-12 sm:pb-14 lg:pb-16">
        {children}
      </Container>
    </section>
  );
}

function HeroDrawing({
  bodyType,
  fuelType,
}: {
  bodyType: BodyType | null;
  fuelType: FuelType | null;
}) {
  const shape = carSilhouette(bodyType, powertrainKind(fuelType));
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_55%,var(--color-surface-2)_0%,var(--color-surface-1)_55%,var(--color-void)_100%)]"
    >
      <svg
        viewBox={shape.viewBox}
        fill="none"
        className="absolute top-[18%] right-[-12%] w-[110%] opacity-35 sm:top-[14%] sm:right-[-6%] sm:w-[78%] lg:right-[2%] lg:w-[62%]"
      >
        <path
          d={shape.body}
          className="fill-surface-2 stroke-ink-500"
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/50" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-500"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-ink-600"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>
      <div className="absolute inset-0 bg-linear-to-t from-void via-void/40 to-transparent" />
    </div>
  );
}
