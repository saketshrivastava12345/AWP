import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * A car page loading: the same anatomy as the page's opening screen — the
 * breadcrumb, the header column (maker, name, identity, badges, the four key
 * figures, the price, the action grid) beside the 3D stage and its toolbar —
 * so nothing jumps when the page replaces it. On phones the stage comes first,
 * as it does on the page.
 */
export default function VariantLoading() {
  return (
    <Container className="pt-6 pb-16 sm:pt-8">
      <p role="status" className="sr-only">
        Loading the car…
      </p>

      <div aria-hidden="true">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-12" />
          <Skeleton className="h-2.5 w-14" />
        </div>

        <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12">
          {/* ------------------------------------------------ Header column */}
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-20" />
              <span className="h-px w-6 bg-line-strong" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="mt-6 h-14 w-3/5 sm:h-16" />
            <Skeleton className="mt-4 h-6 w-2/5" />
            <Skeleton className="mt-6 h-3 w-4/5" />
            <div className="mt-5 flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="mt-6 h-3.5 w-full" />
            <Skeleton className="mt-2.5 h-3.5 w-3/4" />

            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="bg-void px-4 py-4">
                  <Skeleton className="h-2 w-14" />
                  <Skeleton className="mt-3.5 h-7 w-20" />
                </div>
              ))}
            </div>

            <Skeleton className="mt-6 h-8 w-36" />
            <Skeleton className="mt-2 h-3 w-24" />

            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Skeleton className="col-span-2 h-11" />
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-11" />
              ))}
            </div>
          </div>

          {/* ---------------------------------------------------- 3D stage */}
          <div className="max-lg:order-first">
            <div className="relative aspect-[4/3] w-full overflow-hidden border border-line bg-surface-1 sm:aspect-[16/9] lg:aspect-[16/10]">
              <div className="absolute inset-0 tech-grid opacity-60" />
              <div className="absolute top-1/2 left-1/2 flex -translate-1/2 flex-col items-center gap-3">
                <span className="relative block h-px w-16 overflow-hidden bg-surface-3">
                  <span className="absolute inset-y-0 left-0 w-1/2 animate-pulse bg-gold-600" />
                </span>
                <Skeleton className="h-2 w-28" />
              </div>
            </div>
            <div className="border-x border-b border-line bg-surface-1 px-3 py-3">
              <div className="flex gap-2">
                {Array.from({ length: 7 }, (_, index) => (
                  <Skeleton key={index} className="size-9 sm:size-11" />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line-subtle pt-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-8 w-16 sm:w-20" />
                ))}
              </div>
            </div>
            <Skeleton className="mt-4 h-11 w-full" />
          </div>
        </div>
      </div>
    </Container>
  );
}
