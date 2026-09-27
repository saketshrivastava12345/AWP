import { cn } from "@/lib/utils";
import { CarGrid } from "@/components/cars/CarGrid";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { DetailHeading } from "./DetailHeading";

/**
 * Cars related to this one, as the standard card grid.
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
export function RelatedVehicles({
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
  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow="Keep exploring"
        title="Related vehicles"
        meta={`${cars.length} from the catalogue`}
        description={`Other ${modelName} variants first, then more from the ${categoryName} category, then cars within 15% of its power.`}
      />
      <CarGrid cars={cars} className="mt-8" />
    </section>
  );
}
