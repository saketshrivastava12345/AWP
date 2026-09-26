import { Skeleton } from "@/components/ui/Skeleton";

/** Matches CarCard's proportions so the grid does not reflow when data lands. */
export function CarCardSkeleton() {
  return (
    <div className="border border-line bg-surface-1/50">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-5">
        <Skeleton className="h-2 w-20" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className="mt-2 h-3 w-24" />
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-2 w-10" />
              <Skeleton className="mt-2 h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CarGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CarCardSkeleton key={index} />
      ))}
    </div>
  );
}
