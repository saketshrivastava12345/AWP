import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { GridColumns } from "./CarGrid";
import type { CarCardVariant } from "./CarCard";

/** Matches CarCard's proportions so the grid does not reflow when data lands. */
export function CarCardSkeleton({ variant = "default" }: { variant?: CarCardVariant }) {
  if (variant === "compact") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-card bg-surface-1">
        <Skeleton className="aspect-[16/10] rounded-none" />
        <div className="px-4 pt-3.5 pb-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card bg-surface-1">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-2 h-5 w-36" />
        <Skeleton className="mt-2.5 h-3.5 w-44" />
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-5 w-14" />
              <Skeleton className="mt-2 h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const GRID: Record<Exclude<GridColumns, "carousel">, string> = {
  two: "md:grid-cols-2",
  three: "sm:grid-cols-2 lg:grid-cols-3",
  catalogue: "md:grid-cols-2 xl:grid-cols-3",
};

export function CarGridSkeleton({
  count = 12,
  columns = "three",
  variant = "default",
  className,
}: {
  count?: number;
  columns?: GridColumns;
  variant?: CarCardVariant;
  className?: string;
}) {
  if (columns === "carousel") {
    return (
      <div
        aria-hidden="true"
        className={cn("flex gap-4 overflow-hidden sm:gap-6", className)}
      >
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className={cn(
              "shrink-0",
              variant === "compact"
                ? "w-[70%] sm:w-[calc((100%-3rem)/3.2)] lg:w-[calc((100%-4.5rem)/4)]"
                : "w-[82%] sm:w-[calc((100%-1.5rem)/2.2)] lg:w-[calc((100%-3rem)/3)]",
            )}
          >
            <CarCardSkeleton variant={variant} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn("grid grid-cols-1 gap-4 sm:gap-6", GRID[columns], className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <CarCardSkeleton key={index} variant={variant} />
      ))}
    </div>
  );
}
