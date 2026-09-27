import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { CarCard } from "@/components/cars/CarCard";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { catalogueYear } from "@/components/cars/catalogue/catalogue-year";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { DetailHeading } from "./DetailHeading";

/**
 * Cars related to this one, as a horizontal snap carousel of the standard car
 * cards: swipe on touch, scroll or tab through on a desktop.
 *
 * Props:
 *   cars          from getRelatedCars(detail, limit) in lib/queries/related.ts —
 *                 other variants of the model first, then the same category
 *                 from other makers, then cars within ±15% of its power
 *   modelName     for the explanatory line ("Other 911 variants first…")
 *   categoryName  likewise
 *   headingLevel  default 3
 *
 * Renders nothing when there are no related cars.
 */
export async function RelatedVehicles({
  cars,
  modelName,
  categoryName,
  headingLevel = 3,
  className,
}: {
  cars: readonly CatalogCardRow[];
  modelName: string;
  categoryName: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  if (cars.length === 0) return null;
  const headingId = "related-vehicles-heading";
  const currentYear = await catalogueYear();

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title="Related cars"
        note={`${cars.length} from the catalogue`}
        description={`Other ${modelName} variants first, then more from the ${categoryName} category, then cars within 15% of its power.`}
      />
      {/* Bleeds into the page gutter on phones so the next card peeks in. */}
      <ul className="-mx-5 mt-8 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto overscroll-x-contain px-5 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0 lg:gap-6">
        {cars.map((car) => (
          <li
            key={car.variant_id}
            className="w-[80%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
          >
            <CarCard
              car={car}
              currentYear={currentYear}
              sizes="(min-width: 1280px) 320px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 80vw"
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
              className="h-full"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
