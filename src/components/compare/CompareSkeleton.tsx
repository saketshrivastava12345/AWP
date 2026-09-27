import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Placeholder while the comparison resolves: the picker row, a row of car
 * photographs and a few specification rows, so the page does not jump when
 * the real content streams in.
 */
export function CompareSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full md:max-w-md">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
        <div className="flex gap-5">
          <Skeleton className="h-11 w-44" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-[8rem_repeat(3,minmax(0,1fr))] md:gap-6 lg:mt-12 lg:grid-cols-[20rem_repeat(3,minmax(0,1fr))] xl:grid-cols-[23rem_repeat(3,minmax(0,1fr))]">
        <div className="hidden md:block" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={index === 2 ? "hidden md:block" : undefined}>
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="mt-6 h-3 w-16" />
            <Skeleton className="mt-2 h-4 w-3/4" />
          </div>
        ))}
      </div>
      <div className="mt-12 space-y-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-2 gap-6 border-b border-line-subtle pb-5 md:grid-cols-[8rem_repeat(3,minmax(0,1fr))] lg:grid-cols-[20rem_repeat(3,minmax(0,1fr))] xl:grid-cols-[23rem_repeat(3,minmax(0,1fr))]"
          >
            <Skeleton className="h-4 w-24 lg:ml-auto lg:w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="hidden h-4 w-16 md:block" />
            <Skeleton className="hidden h-4 w-24 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
