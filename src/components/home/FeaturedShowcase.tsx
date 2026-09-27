import { carDisplayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { getVariantModelFiles } from "@/lib/queries/models";
import { CarCard } from "@/components/cars/CarCard";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { catalogueYear } from "@/components/cars/catalogue/catalogue-year";
import { Reveal, TiltCard } from "@/components/fx";

/**
 * The home page's featured cars as a showcase: the site's own CarCard, each
 * on a tilting HUD plate that lights its corner brackets, lifts and glows
 * cyan under the pointer, and the row revealed card by card.
 *
 * Phones get a swipeable snap row (the next card peeks in); from `sm` it is
 * a grid so every card is whole. The card itself is untouched — this only
 * wraps it — so a car here reads exactly as it does in the catalogue.
 */

const SIZES =
  "(min-width: 1360px) 420px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 82vw";

export async function FeaturedShowcase({
  cars,
  label,
  className,
}: {
  cars: readonly CatalogCardRow[];
  /** Accessible name of the list. */
  label: string;
  className?: string;
}) {
  const withModels = cars
    .filter((car) => car.has_glb && car.variant_id)
    .map((car) => car.variant_id as string);
  const [currentYear, modelFiles] = await Promise.all([
    catalogueYear(),
    getVariantModelFiles(withModels),
  ]);

  return (
    <Reveal
      as="ul"
      stagger
      aria-label={label}
      className={cn(
        "-mx-5 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-4",
        "sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:p-0 lg:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {cars.map((car, index) => (
        <li
          key={car.variant_id ?? String(index)}
          className="w-[82%] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none"
        >
          <TiltCard
            data-spotlight=""
            className="group/tilt fx-card h-full rounded-card border border-line-subtle bg-surface-1"
          >
            <span
              aria-hidden="true"
              className="hud-brackets z-20 opacity-0 transition-opacity duration-(--duration-base) [--hud-l:18px] group-focus-within/tilt:opacity-100 group-hover/tilt:opacity-100"
            />
            <CarCard
              car={car}
              sizes={SIZES}
              currentYear={currentYear}
              loading={index < 3 ? "eager" : "lazy"}
              actions={
                car.variant_id ? (
                  <FavoriteToggle
                    appearance="icon"
                    variantId={car.variant_id}
                    carName={carDisplayName(
                      car.manufacturer_name,
                      car.model_name,
                      car.variant_name,
                    )}
                  />
                ) : null
              }
              model={car.variant_id ? modelFiles.get(car.variant_id) : undefined}
              className="h-full bg-transparent focus-within:bg-transparent hover:bg-transparent"
            />
          </TiltCard>
        </li>
      ))}
    </Reveal>
  );
}
