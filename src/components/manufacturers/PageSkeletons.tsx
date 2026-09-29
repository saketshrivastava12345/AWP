import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading states for the encyclopedia pages (brands, countries, parts),
 * shaped like what replaces them so nothing jumps when data arrives.
 */

function CardSkeleton() {
  return (
    <div className="rounded-card bg-surface-1 p-6 sm:p-7">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="mt-3 h-3.5 w-48" />
      <Skeleton className="mt-6 h-3.5 w-full" />
      <Skeleton className="mt-2.5 h-3.5 w-4/5" />
      <Skeleton className="mt-8 h-3 w-28" />
    </div>
  );
}

function FigureRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-6 lg:flex lg:gap-16">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          <Skeleton className="h-12 w-24" />
          <Skeleton className="mt-3 h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Title, lead, the filter bar and a card grid: /manufacturers, /countries, /parts. */
export function IndexPageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <Container className="pt-12 pb-10 sm:pt-16 lg:pt-24 lg:pb-14">
        <Skeleton className="h-12 w-full max-w-sm" />
        <Skeleton className="mt-7 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-3 h-4 w-3/4 max-w-xl" />
      </Container>
      <Container className="pb-24">
        <div className="flex gap-2 border-b border-line-subtle py-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-24 shrink-0 rounded-pill" />
          ))}
        </div>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}

/** Breadcrumb, a split hero, the key-figure row and a grid: the [slug] pages. */
export function DetailPageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <div className="border-b border-line-subtle">
        <Container className="pt-6 pb-12 lg:pt-8 lg:pb-16">
          <Skeleton className="h-3.5 w-40" />
          <div className="mt-8 grid gap-10 lg:mt-6 lg:min-h-[min(60svh,36rem)] lg:grid-cols-12 lg:items-center lg:gap-12">
            <div className="lg:col-span-5">
              <Skeleton className="h-14 w-full max-w-sm" />
              <Skeleton className="mt-7 h-4 w-full max-w-md" />
              <Skeleton className="mt-3 h-4 w-4/5 max-w-sm" />
              <div className="mt-8 flex gap-3">
                <Skeleton className="h-12 w-40" />
                <Skeleton className="h-12 w-36" />
              </div>
            </div>
            <Skeleton className="aspect-[16/9] w-full lg:col-span-7 lg:aspect-[2/1]" />
          </div>
          <div className="mt-12 lg:mt-10">
            <FigureRowSkeleton />
          </div>
        </Container>
      </div>
      <Container className="py-16 lg:py-24">
        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      </Container>
    </div>
  );
}
