import { Skeleton } from "@/components/ui/Skeleton";
import { CarGridSkeleton } from "@/components/cars/CarCardSkeleton";

/**
 * Placeholder for /cars while it streams in: the heading and lead, the
 * filter rail, the toolbar and a page of cards — laid out exactly like the
 * real thing so nothing jumps when it lands.
 */
export function CatalogueBodySkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading the catalogue…</span>
      <div aria-hidden="true">
        <Skeleton className="h-10 w-56 max-w-full sm:h-12" />
        <Skeleton className="mt-5 h-5 w-80 max-w-full" />
      </div>

      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-12">
        <div className="hidden lg:block" aria-hidden="true">
          <div className="flex min-h-11 items-center border-b border-line pb-3">
            <Skeleton className="h-5 w-20" />
          </div>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-4 border-b border-line-subtle py-4">
              <Skeleton className="h-4 w-24" />
              {index < 2
                ? Array.from({ length: 4 }, (_, row) => (
                    <Skeleton key={row} className="h-4 w-full" />
                  ))
                : null}
            </div>
          ))}
        </div>

        <div className="min-w-0" aria-hidden="true">
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-line-subtle py-2.5">
            <Skeleton className="h-11 w-28 lg:hidden" />
            <Skeleton className="hidden h-4 w-32 lg:block" />
            <Skeleton className="h-11 w-52" />
          </div>
          <CarGridSkeleton columns="catalogue" count={6} className="mt-6" />
        </div>
      </div>
    </div>
  );
}
