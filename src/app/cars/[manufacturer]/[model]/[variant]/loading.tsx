import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * A car page loading: the same anatomy as the page's opening screen — the
 * breadcrumb, the name column (maker, nameplate, meta line, badge, lead,
 * price and actions) beside the 3D stage, and the key-figure row across the
 * full width — so nothing jumps when the page replaces it. On phones the name
 * comes first, then the stage, as it does on the page.
 */
export default function VariantLoading() {
  return (
    <Container className="pt-6 pb-16 lg:pt-8">
      <p role="status" className="sr-only">
        Loading the car…
      </p>

      <div aria-hidden="true">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-14" />
        </div>

        <div className="mt-8 flex flex-col gap-10 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 xl:gap-x-16">
          {/* ------------------------------------------------ Name column */}
          <div className="lg:col-span-5 lg:row-start-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-4 h-20 w-3/5 sm:h-24" />
            <Skeleton className="mt-3 h-12 w-2/5" />
            <Skeleton className="mt-7 h-4 w-4/5" />
            <Skeleton className="mt-5 h-6 w-20 rounded-pill" />
            <Skeleton className="mt-7 h-5 w-full" />
            <Skeleton className="mt-2.5 h-5 w-3/4" />
          </div>

          {/* ---------------------------------------------------- 3D stage */}
          <div className="order-2 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
            <div className="aspect-[4/3] w-full rounded-card bg-surface-1 sm:aspect-[16/9] lg:aspect-auto lg:h-[560px]" />
          </div>

          {/* ------------------------------------------------ Key figures */}
          <div className="order-3 grid grid-cols-2 gap-y-8 border-t border-line pt-6 lg:order-none lg:col-span-12 lg:row-start-3 lg:grid-cols-4 lg:pt-10">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="pr-5 lg:pr-8">
                <Skeleton className="h-12 w-24 lg:h-16" />
                <Skeleton className="mt-3 h-4 w-20" />
              </div>
            ))}
          </div>

          {/* ----------------------------------------- Price and actions */}
          <div className="order-4 lg:order-none lg:col-span-5 lg:row-start-2 lg:self-end">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
            <div className="mt-8 flex gap-3">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-28" />
              <Skeleton className="size-12 rounded-pill lg:w-28 lg:rounded-control" />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
