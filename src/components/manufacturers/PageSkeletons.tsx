import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Loading states for the encyclopedia pages (manufacturers, countries,
 * parts), shaped like what replaces them so nothing jumps when data arrives.
 */

function CardSkeleton() {
  return (
    <div className="border border-line bg-surface-1/60 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 shrink-0" />
        <div className="flex-1 pt-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-6 h-3 w-full" />
      <Skeleton className="mt-2.5 h-3 w-4/5" />
      <div className="mt-6 border-t border-line-subtle pt-4">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

/** Hero, filter bar and a card grid: /manufacturers, /countries, /parts. */
export function IndexPageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <div className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-6 h-10 w-full max-w-lg" />
          <Skeleton className="mt-6 h-3.5 w-full max-w-2xl" />
          <Skeleton className="mt-2.5 h-3.5 w-3/4 max-w-xl" />
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px border-t border-line pt-px lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="bg-surface-1/60 px-5 py-6">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="mt-4 h-6 w-12" />
              </div>
            ))}
          </div>
        </Container>
      </div>
      <Container className="py-12 sm:py-16">
        <div className="border-y border-line py-5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-10 w-full max-w-xl" />
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

/** Breadcrumb, title block with a side panel, stats and a grid: the [slug] pages. */
export function DetailPageSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading {label}…</span>
      <div className="border-b border-line">
        <Container className="pt-8 pb-14 sm:pt-10 sm:pb-20">
          <Skeleton className="h-3 w-40" />
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div>
              <Skeleton className="h-3 w-36" />
              <Skeleton className="mt-6 h-12 w-full max-w-md" />
              <Skeleton className="mt-7 h-3.5 w-full max-w-2xl" />
              <Skeleton className="mt-2.5 h-3.5 w-5/6 max-w-xl" />
              <div className="mt-8 flex gap-3">
                <Skeleton className="h-11 w-44" />
                <Skeleton className="h-11 w-36" />
              </div>
            </div>
            <Skeleton className="aspect-[16/10] w-full" />
          </div>
        </Container>
      </div>
      <Container className="py-14 sm:py-16">
        <div className="grid grid-cols-2 gap-px border-t border-line pt-px lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-surface-1/60 px-5 py-6">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-4 h-6 w-14" />
            </div>
          ))}
        </div>
        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
