import type { ReactNode } from "react";
import { CarCard } from "./CarCard";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { cn } from "@/lib/utils";
import { catalogueYear } from "./catalogue/catalogue-year";
import { getVariantModelFiles } from "@/lib/queries/models";
import { carDisplayName } from "@/lib/format";
import { FavoriteToggle } from "./FavoriteButton";

export type GridColumns = "two" | "three" | "catalogue";

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
const LAYOUTS: Record<GridColumns, { grid: string; sizes: string; firstRow: number }> = {
  two: {
    grid: "sm:grid-cols-2",
    sizes: "(min-width: 1280px) 620px, (min-width: 640px) 50vw, 100vw",
    firstRow: 2,
  },
  three: {
    grid: "sm:grid-cols-2 lg:grid-cols-3",
    sizes:
      "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
    firstRow: 3,
  },
  // Beside the /cars filter rail: 1 / 2 / 3 columns, and 4 on very wide screens.
  catalogue: {
    grid: "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
    sizes:
      "(min-width: 1536px) 340px, (min-width: 1280px) 30vw, (min-width: 640px) 50vw, 100vw",
    firstRow: 4,
  },
};

/**
 * A grid of car cards.
 *
 * The staggered reveal is a CSS animation with a per-item delay rather than a
 * GSAP timeline: the grid is server-rendered, and a client component just to
 * animate entry would cost more than it is worth. The delay is capped so a
 * full page never feels slow to settle.
 *
 * `aboveFold` makes the first card's photograph a preload and the rest of the
 * first row eager; every other grid loads its photographs lazily.
 */
export async function CarGrid({
  cars,
  className,
  columns = "three",
  aboveFold = false,
  actions,
}: {
  cars: readonly CatalogCardRow[];
  className?: string;
  columns?: GridColumns;
  aboveFold?: boolean;
  /**
   * Per-card controls layered above the card link. Defaults to a favourite
   * toggle; pass `() => null` for none.
   */
  actions?: (car: CatalogCardRow) => ReactNode;
}) {
  const layout = LAYOUTS[columns];
  const withModels = cars
    .filter((car) => car.has_glb && car.variant_id)
    .map((car) => car.variant_id as string);
  const [currentYear, modelFiles] = await Promise.all([
    catalogueYear(),
    getVariantModelFiles(withModels),
  ]);

  return (
    <ul className={cn("grid grid-cols-1 gap-4 sm:gap-5", layout.grid, className)}>
      {cars.map((car, index) => (
        <li
          key={car.variant_id}
          className="animate-rise-in"
          style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
        >
          <CarCard
            car={car}
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
          />
        </li>
      ))}
    </ul>
  );
}
