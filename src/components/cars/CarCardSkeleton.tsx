import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";
import type { GridColumns } from "./CarGrid";

/** Matches CarCard's proportions so the grid does not reflow when data lands. */
export function CarCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface-1">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-2 h-3.5 w-24" />
        <Skeleton className="mt-3 h-2.5 w-36" />
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-2 w-10" />
              <Skeleton className="mt-2.5 h-3.5 w-12" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-line-subtle pt-4">
          <div>
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="mt-2 h-2.5 w-24" />
          </div>
          <Skeleton className="h-2.5 w-10" />
        </div>
      </div>
    </div>
  );
}

const GRID: Record<GridColumns, string> = {
  two: "sm:grid-cols-2",
  three: "sm:grid-cols-2 lg:grid-cols-3",
  catalogue: "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
};

export function CarGridSkeleton({
  count = 12,
  columns = "three",
  className,
}: {
  count?: number;
  columns?: GridColumns;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid grid-cols-1 gap-4 sm:gap-5", GRID[columns], className)}
    >
      {Array.from({ length: count }, (_, index) => (
        <CarCardSkeleton key={index} />
      ))}
    </div>
  );
}
