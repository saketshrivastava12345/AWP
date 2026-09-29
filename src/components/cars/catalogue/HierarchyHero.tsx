import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { Parallax } from "@/components/fx/Parallax";
import { GlowOrbs, GridBackground, Scanlines } from "@/components/fx/Backgrounds";
import { powertrainKind, type BodyType, type FuelType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * The full-bleed hero of a brand or model page in the catalogue: the best
 * catalogue photograph drifting on a slow parallax behind a scrim, or — with
 * none — glow orbs and a large, faint body-style drawing; a perspective
 * floor grid racing toward the viewer, a scan beam sweeping down, and a
 * tick ruler under the content. It starts under the transparent navbar and
 * holds its content at the bottom-left, as a maker's model page does.
 *
 * Every layer is decoration (aria-hidden, CSS only); the drawing is never
 * presented as the car. The parallax moves only the photograph layer, which
 * is oversized so its edges never show; nothing sticky lives inside.
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
            <Parallax speed={-0.12} className="absolute inset-x-0 -inset-y-[14%]">
              <CarPhoto
                src={image}
                alt={imageAlt}
                sizes="100vw"
                loading="preload"
                className="object-cover object-[center_60%]"
                fallback={drawing}
              />
            </Parallax>
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
            <GridBackground variant="floor" className="z-0 opacity-45" />
          </>
        ) : (
          <>
            {drawing}
            <GlowOrbs tone="cyan" className="z-0" />
            <GridBackground variant="floor" className="z-0" />
          </>
        )}
        <Scanlines beam className="z-0" />
      </div>
      <Container className="relative w-full pt-16 pb-10 sm:pb-12 lg:pb-14">
        {children}
        <div aria-hidden="true" className="mt-8 h-2.5 w-full hud-ticks opacity-70" />
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
        className="absolute top-[18%] right-[-12%] w-[110%] opacity-40 sm:top-[14%] sm:right-[-6%] sm:w-[78%] lg:right-[2%] lg:w-[62%]"
      >
        <path
          d={shape.body}
          className="fill-surface-2 stroke-cyan-400/60"
          strokeWidth={1.25}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/50" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-cyan-400/50"
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
