import { CarCard } from "./CarCard";
import type { CatalogCar } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * The collection grid.
 *
 * The staggered reveal is a CSS animation with a per-item delay rather than a
 * GSAP timeline: the grid is server-rendered, and a client component just to
 * animate entry would cost more than it is worth. The delay is capped so a
 * full page never feels slow to settle.
 */
export function CarGrid({
  cars,
  className,
  columns = "three",
}: {
  cars: CatalogCar[];
  className?: string;
  columns?: "two" | "three";
}) {
  return (
    <ul
      className={cn(
        "grid gap-px",
        columns === "three" ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {cars.map((car, index) => (
        <li
          key={car.variant_id}
          className="animate-rise-in"
          style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
        >
          <CarCard car={car} priority={index < 3} />
        </li>
      ))}
    </ul>
  );
}
