import Link from "next/link";
import { type ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { Parallax } from "@/components/fx/Parallax";
import { GlowOrbs, GridBackground, Scanlines } from "@/components/fx/Backgrounds";
import { powertrainKind, type BodyType, type FuelType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * The hero of a brand-level page (a maker, and the countries that share its
 * layout): breadcrumbs, a large sentence-case name, one line of support, a
 * meta line and the actions on the left; the brand's best photograph on the
 * right, running off the edge of the page; key figures underneath.
 *
 * On phones the name comes first and the photograph follows it at full
 * width, so the heading is never pushed below the fold by an image.
 *
 * Nothing here is invented: the photograph is a catalogued car's own and is
 * captioned with that car; without one the hero shows a body-style drawing
 * labelled as a drawing (desktop only, where it balances the layout), or
 * nothing at all.
 *
 * Shared with the maker's catalogue page (/cars/[make]), which may import it
 * as it is.
 */

/** Right-hand bleed on desktop: the Container's gutter plus the space beside it. */
const BLEED_RIGHT =
  "lg:-mr-[calc(3rem_+_max(0px,_(100vw_-_1360px)_/_2))] min-[1440px]:-mr-[calc(4rem_+_max(0px,_(100vw_-_1360px)_/_2))]";

/** A catalogued car's photograph for the hero, with who it shows. */
export type BrandHeroPhoto = {
  src: string;
  /** Names the car pictured, e.g. "Porsche 911 Turbo S". */
  alt: string;
  /** The car's page, linked from the caption. */
  href?: string;
  /** Body style for the drawing shown if the file fails to load. */
  bodyType: BodyType | null;
  fuelType: FuelType | null;
};

/** The body style drawn when no photograph exists. */
export type BrandHeroDrawing = {
  bodyType: BodyType | null;
  fuelType: FuelType | null;
};

export function BrandHero({
  crumbs,
  eyebrow,
  title,
  lead,
  meta = [],
  actions,
  photo,
  drawing,
  media,
  children,
  className,
}: {
  crumbs: Crumb[];
  /** Optional line above the name, e.g. a flag and "Automotive nation". Never gold. */
  eyebrow?: ReactNode;
  /** The page's h1: the brand or country name, as recorded. */
  title: string;
  /** One sentence of support. */
  lead?: ReactNode;
  /** Short facts joined with " · ": "Germany", "Founded 1931", "Stuttgart". */
  meta?: readonly (ReactNode | null | undefined | false)[];
  actions?: ReactNode;
  photo?: BrandHeroPhoto | null;
  drawing?: BrandHeroDrawing | null;
  /** Anything else for the right-hand column (a locator map); wins over photo/drawing. */
  media?: ReactNode;
  /** Under the split: the key-figure row. */
  children?: ReactNode;
  className?: string;
}) {
  const facts = meta.filter(
    (item): item is Exclude<typeof item, null | undefined | false> =>
      item !== null && item !== undefined && item !== false && item !== "",
  );

  const visual =
    media ??
    (photo ? (
      <HeroPhoto photo={photo} />
    ) : drawing ? (
      <HeroDrawing drawing={drawing} />
    ) : null);

  return (
    <section
      className={cn(
        // Clipped sideways only: the photograph deliberately runs past the
        // container, and 100vw includes a desktop scrollbar's width.
        "relative isolate overflow-x-clip border-b border-line-subtle",
        className,
      )}
    >
      {/* Decorative ground: orbs, a drifting grid and scan lines. The beam
          is left out — the section is only clipped sideways. */}
      <GlowOrbs tone="cyan" />
      <GridBackground size={56} className="[mask-image:linear-gradient(to_bottom,black_30%,transparent)]" />
      <Scanlines />
      <Container className="relative pt-6 lg:pt-8">
        <Breadcrumbs items={crumbs} />

        <div
          className={cn(
            "mt-8 grid gap-10 lg:mt-6 lg:min-h-[min(60svh,36rem)] lg:items-center lg:gap-12",
            visual ? "lg:grid-cols-12" : null,
          )}
        >
          <div className={cn("min-w-0 lg:py-10", visual ? "lg:col-span-5" : "max-w-3xl")}>
            {eyebrow ? (
              <div className="mb-4 flex items-center gap-3 text-eyebrow">
                <span
                  aria-hidden="true"
                  className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
                />
                {eyebrow}
              </div>
            ) : null}
            <h1 className="text-display-l hyphens-auto">
              <ScrambleText text={title} />
            </h1>
            {lead ? <div className="mt-6 max-w-[60ch] text-lead">{lead}</div> : null}
            {facts.length > 0 ? (
              <p className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs tracking-hud text-ink-400 uppercase">
                {facts.map((fact, index) => (
                  <span key={index} className="inline-flex items-center gap-2">
                    {index > 0 ? (
                      <span aria-hidden="true" className="text-ink-500">
                        ·
                      </span>
                    ) : null}
                    {fact}
                  </span>
                ))}
              </p>
            ) : null}
            {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          {visual ? <div className="min-w-0 lg:col-span-7">{visual}</div> : null}
        </div>

        {children ? (
          <div className="mt-12 pb-10 lg:mt-10 lg:pb-14">
            {children}
            <div aria-hidden="true" className="mt-8 h-2.5 w-full hud-ticks opacity-70" />
          </div>
        ) : null}
        {!children ? <div className="pb-12 lg:pb-16" /> : null}
      </Container>
    </section>
  );
}

/**
 * The photograph: full width on phones, bleeding off the right edge on
 * desktop, drifting on a slow parallax inside its masked frame (the layer
 * is oversized so its edges never show) under faint scan lines.
 */
function HeroPhoto({ photo }: { photo: BrandHeroPhoto }) {
  return (
    <figure className="-mx-5 sm:-mx-8 lg:mx-0">
      <div
        className={cn(
          "relative aspect-[16/9] overflow-hidden bg-surface-1 lg:aspect-[2/1]",
          // Fade into the ground at the bottom (and on desktop, the left),
          // so the photograph sits in the page rather than on it.
          "[mask-image:linear-gradient(to_top,transparent,black_22%)]",
          "lg:[mask-image:linear-gradient(to_top,transparent,black_22%),linear-gradient(to_right,transparent,black_12%)] lg:[mask-composite:intersect]",
          BLEED_RIGHT,
        )}
      >
        <Parallax speed={-0.1} className="absolute inset-x-0 -inset-y-[12%]">
          <CarPhoto
            src={photo.src}
            alt={photo.alt}
            sizes="(min-width: 1024px) 62vw, 100vw"
            loading="preload"
            fallback={<DrawingArt bodyType={photo.bodyType} fuelType={photo.fuelType} />}
          />
        </Parallax>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(180deg,oklch(0.9_0.05_220/4%)_0_1px,transparent_1px_4px)]"
        />
      </div>
      <figcaption className="mt-3 px-5 font-mono text-[11px] tracking-hud text-ink-400 uppercase sm:px-8 lg:px-0 lg:text-right">
        Pictured:{" "}
        {photo.href ? (
          <Link
            href={photo.href}
            className="fx-link text-ink-200 transition-colors duration-(--duration-fast) hover:text-cyan-100"
          >
            {photo.alt}
          </Link>
        ) : (
          <span className="text-ink-200">{photo.alt}</span>
        )}
      </figcaption>
    </figure>
  );
}

/** No photograph: a large, faint body-style drawing, labelled. Desktop only. */
function HeroDrawing({ drawing }: { drawing: BrandHeroDrawing }) {
  return (
    <div className="relative hidden aspect-[16/9] lg:block">
      <DrawingArt bodyType={drawing.bodyType} fuelType={drawing.fuelType} />
    </div>
  );
}

function DrawingArt({
  bodyType,
  fuelType,
}: {
  bodyType: BodyType | null;
  fuelType: FuelType | null;
}) {
  const shape = carSilhouette(bodyType, powertrainKind(fuelType));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
      <svg
        viewBox={shape.viewBox}
        className="w-[86%] overflow-visible opacity-70"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={shape.body}
          className="fill-surface-2 stroke-cyan-400/60"
          strokeWidth={2}
          strokeDasharray="8 5"
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
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-ink-600"
              strokeWidth={1.5}
            />
          </g>
        ))}
      </svg>
      <p className="text-caption">Drawing · no photograph</p>
    </div>
  );
}
