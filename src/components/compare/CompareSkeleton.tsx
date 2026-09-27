import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder while the comparison resolves: the toolbar, a row of car
 * headers and a few specification rows, so the page does not jump when the
 * real table streams in.
 */
export function CompareSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex flex-col gap-4 border-y border-line py-5 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:max-w-sm">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="mt-3 h-11 w-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-11 w-40" />
          <Skeleton className="h-11 w-28" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-[9rem_repeat(3,minmax(0,1fr))] lg:grid-cols-[13rem_repeat(3,minmax(0,1fr))]">
        <div className="hidden md:block" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={index === 2 ? "hidden md:block" : undefined}>
            <Skeleton className="aspect-[16/10] w-full" />
            <Skeleton className="mt-3 h-2.5 w-16" />
            <Skeleton className="mt-2 h-3.5 w-3/4" />
          </div>
        ))}
      </div>
      <div className="mt-10 space-y-5">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-3 border-b border-line-subtle pb-4 md:grid-cols-[9rem_repeat(3,minmax(0,1fr))] lg:grid-cols-[13rem_repeat(3,minmax(0,1fr))]"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="hidden h-3 w-16 md:block" />
            <Skeleton className="hidden h-3 w-24 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
