import { Skeleton } from "@/components/ui/Skeleton";
import { CarGridSkeleton } from "@/components/cars/CarCardSkeleton";

/** The /cars title block. Static, so it is part of the prerendered shell. */
export function CatalogueIntro() {
  return (
    <header>
      <p className="text-label text-gold-400">Collection</p>
      <h1 className="mt-4 font-display text-2xl leading-tight tracking-[0.05em] text-ink-50 sm:text-3xl lg:text-4xl">
        Every car in the catalogue
      </h1>
    </header>
  );
}

/**
 * Placeholder for everything below the title while the catalogue streams in:
 * the summary line, the filter rail, the toolbar and a page of cards — laid
 * out exactly like the real thing so nothing jumps when it lands.
 */
export function CatalogueBodySkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading the catalogue…</span>
      <div className="mt-6 flex items-baseline gap-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10 xl:gap-12">
        <div className="hidden lg:block" aria-hidden="true">
          <Skeleton className="h-3 w-24" />
          <div className="mt-4 space-y-5 border-t border-line pt-5">
            {Array.from({ length: 7 }, (_, index) => (
              <div key={index} className="space-y-3 border-b border-line-subtle pb-5">
                <Skeleton className="h-2.5 w-20" />
                {index < 2
                  ? Array.from({ length: 4 }, (_, row) => (
                      <Skeleton key={row} className="h-3 w-full" />
                    ))
                  : null}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-line py-3 lg:border-t">
            <Skeleton className="h-11 w-28 lg:hidden" />
            <Skeleton className="hidden h-3 w-40 lg:block" />
            <Skeleton className="h-11 w-44 xl:h-9 xl:w-[30rem]" />
          </div>
          <CarGridSkeleton columns="catalogue" count={8} className="mt-6" />
        </div>
      </div>
    </div>
  );
}
