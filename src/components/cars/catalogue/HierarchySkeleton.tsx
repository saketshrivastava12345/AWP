import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { CarGridSkeleton } from "@/components/cars/CarCardSkeleton";

/**
 * Loading states for the maker and model pages, shaped like the pages: a
 * breadcrumb, the title block with its side panel, then a grid of cards.
 */
export function HierarchySkeleton({ variant }: { variant: "manufacturer" | "model" }) {
  return (
    <Container className="pt-10 pb-20 sm:pt-12">
      <div role="status" aria-live="polite">
        <span className="sr-only">Loading…</span>
        <Skeleton className="h-3 w-40" />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center">
          <div>
            <Skeleton className="h-3 w-48" />
            <Skeleton className="mt-6 h-10 w-64 max-w-full" />
            <Skeleton className="mt-6 h-3 w-full max-w-xl" />
            <Skeleton className="mt-2.5 h-3 w-5/6 max-w-lg" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-11 w-44" />
              <Skeleton className="h-11 w-36" />
            </div>
          </div>
          {variant === "model" ? (
            <Skeleton className="aspect-[16/10] w-full rounded-md" />
          ) : (
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className={index === 4 ? "col-span-2 p-4" : "p-4"}>
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="mt-3 h-3.5 w-20" />
                </div>
              ))}
            </div>
          )}
        </div>

        {variant === "model" ? (
          <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="px-5 py-5">
                <Skeleton className="h-2 w-16" />
                <Skeleton className="mt-4 h-6 w-24" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-16 border-b border-line pb-4">
          <Skeleton className="h-3 w-32" />
        </div>
        <CarGridSkeleton count={3} className="mt-8" />
      </div>
    </Container>
  );
}
