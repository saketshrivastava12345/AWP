import type { ReactNode } from "react";
import { Reveal } from "@/components/fx/Reveal";
import { CarCard, type CarCardVariant } from "./CarCard";
import { CardCarousel } from "./catalogue/CardCarousel";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { cn } from "@/lib/utils";
import { catalogueYear } from "./catalogue/catalogue-year";
import { getVariantModelFiles } from "@/lib/queries/models";
import { carDisplayName } from "@/lib/format";
import { FavoriteToggle } from "./FavoriteButton";

export type GridColumns = "two" | "three" | "catalogue" | "carousel";

/**
 * The default per-card control: a save heart. It needs no server state (the
 * client favourites store reads the session), so grids stay static.
 */
function favoriteAction(car: CatalogCardRow): ReactNode {
  if (!car.variant_id) return null;
  return (
    <FavoriteToggle
      appearance="icon"
      variantId={car.variant_id}
      carName={carDisplayName(car.manufacturer_name, car.model_name, car.variant_name)}
    />
  );
}

/** Column classes and the matching `sizes`, so photographs are never over-fetched. */
const LAYOUTS: Record<
  Exclude<GridColumns, "carousel">,
  { grid: string; sizes: string; firstRow: number }
> = {
  two: {
    grid: "md:grid-cols-2",
    sizes: "(min-width: 1360px) 640px, (min-width: 768px) 50vw, 100vw",
    firstRow: 2,
  },
  three: {
    grid: "sm:grid-cols-2 lg:grid-cols-3",
    sizes:
      "(min-width: 1360px) 410px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
    firstRow: 3,
  },
  // Beside the /cars filter rail: 1 / 2 / 3 columns.
  catalogue: {
    grid: "md:grid-cols-2 xl:grid-cols-3",
    sizes:
      "(min-width: 1360px) 330px, (min-width: 1280px) 26vw, (min-width: 768px) 50vw, 100vw",
    firstRow: 3,
  },
};

/**
 * Widths of a carousel item: most of a phone screen (so the next card peeks
 * in), two and a bit on tablets, three (full cards) or four (compact) on
 * desktops.
 */
const CAROUSEL_ITEM: Record<CarCardVariant, { item: string; sizes: string }> = {
  default: {
    item: "w-[82%] sm:w-[calc((100%-1.5rem)/2.2)] lg:w-[calc((100%-3rem)/3)]",
    sizes:
      "(min-width: 1360px) 410px, (min-width: 1024px) 33vw, (min-width: 640px) 45vw, 82vw",
  },
  compact: {
    item: "w-[70%] sm:w-[calc((100%-3rem)/3.2)] lg:w-[calc((100%-4.5rem)/4)]",
    sizes:
      "(min-width: 1360px) 310px, (min-width: 1024px) 25vw, (min-width: 640px) 31vw, 70vw",
  },
};

/**
 * A grid of car cards — or, with `columns="carousel"`, a snap-scrolling row
 * of them with previous/next buttons on desktop.
 *
 * The staggered reveal is the FX kit's `Reveal stagger` (a clip wipe, card by
 * card, when the grid scrolls into view) rather than a GSAP timeline: the
 * grid is server-rendered, and the one FX runtime already on the page drives
 * it. Cards past the thirteenth share the last delay, so a full page never
 * feels slow to settle; without JavaScript or under reduced motion every
 * card is simply there.
 *
 * `aboveFold` makes the first card's photograph a preload and the rest of the
 * first row eager; every other grid loads its photographs lazily.
 */
export async function CarGrid({
  cars,
  className,
  columns = "three",
  variant = "default",
  label,
  aboveFold = false,
  actions,
  countUp = true,
}: {
  cars: readonly CatalogCardRow[];
  className?: string;
  columns?: GridColumns;
  /** Card design: the full card, or the compact tile (carousels, strips). */
  variant?: CarCardVariant;
  /** Accessible name for a carousel's list. */
  label?: string;
  aboveFold?: boolean;
  /**
   * Per-card controls layered above the card link. Defaults to a favourite
   * toggle; pass `() => null` for none.
   */
  actions?: (car: CatalogCardRow) => ReactNode;
  /** Off for a grid streamed in a Suspense boundary on first load (see CarCard). */
  countUp?: boolean;
}) {
  const withModels = cars
    .filter((car) => car.has_glb && car.variant_id)
    .map((car) => car.variant_id as string);
  const [currentYear, modelFiles] = await Promise.all([
    catalogueYear(),
    getVariantModelFiles(withModels),
  ]);

  if (columns === "carousel") {
    const item = CAROUSEL_ITEM[variant];
    return (
      <CardCarousel label={label} className={className}>
        {cars.map((car, index) => (
          <li key={car.variant_id} className={cn("shrink-0 snap-start", item.item)}>
            <CarCard
              car={car}
              variant={variant}
              sizes={item.sizes}
              currentYear={currentYear}
              loading={aboveFold && index < 2 ? "eager" : "lazy"}
              actions={(actions ?? favoriteAction)(car)}
              model={car.variant_id ? modelFiles.get(car.variant_id) : undefined}
            />
          </li>
        ))}
      </CardCarousel>
    );
  }

  const layout = LAYOUTS[columns];
  return (
    <Reveal
      as="ul"
      stagger={70}
      variant="clip"
      aria-label={label}
      className={cn("grid grid-cols-1 gap-4 sm:gap-6", layout.grid, className)}
    >
      {cars.map((car, index) => (
        <li key={car.variant_id}>
          <CarCard
            car={car}
            variant={variant}
            sizes={layout.sizes}
            currentYear={currentYear}
            loading={
              !aboveFold
                ? "lazy"
                : index === 0
                  ? "preload"
                  : index < layout.firstRow
                    ? "eager"
                    : "lazy"
            }
            actions={(actions ?? favoriteAction)(car)}
            model={car.variant_id ? modelFiles.get(car.variant_id) : undefined}
            countUp={countUp}
          />
        </li>
      ))}
    </Reveal>
  );
}
