import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { CarGridSkeleton } from "@/components/cars/CarCardSkeleton";

/**
 * Loading states for the brand and model pages, shaped like them: a
 * full-bleed hero with its content at the bottom-left, the sub-nav bar, then
 * a section title and a grid of cards.
 */
export function HierarchySkeleton({ variant }: { variant: "manufacturer" | "model" }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div
        aria-hidden="true"
        className="bleed-under-nav flex min-h-[34rem] flex-col justify-end bg-surface-1 lg:min-h-[70svh]"
      >
        <Container className="w-full pt-16 pb-12 lg:pb-16">
          <Skeleton className="h-3 w-40" />
          <Skeleton
            className={
              variant === "model"
                ? "mt-8 h-20 w-48 max-w-full sm:h-28"
                : "mt-6 h-14 w-72 max-w-full"
            }
          />
          <Skeleton className="mt-6 h-5 w-full max-w-xl" />
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-6 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index}>
                <Skeleton className="h-12 w-24" />
                <Skeleton className="mt-3 h-3.5 w-16" />
              </div>
            ))}
          </div>
        </Container>
      </div>
      <div aria-hidden="true" className="h-(--subnav-h) border-b border-line-subtle" />
      <Container aria-hidden="true" className="py-16 lg:py-24">
        <Skeleton className="h-9 w-48" />
        <CarGridSkeleton
          count={variant === "model" ? 3 : 2}
          columns={variant === "model" ? "three" : "two"}
          className="mt-10"
        />
      </Container>
    </div>
  );
}
