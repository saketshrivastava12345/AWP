import { Skeleton } from "@/components/ui/Skeleton";

/** Loading placeholder for an admin page: header, a toolbar and table rows. */
export function AdminSkeleton({
  rows = 8,
  header = true,
}: {
  rows?: number;
  header?: boolean;
}) {
  return (
    <div>
      <p role="status" className="sr-only">
        Loading…
      </p>
      <div aria-hidden="true">
        {header ? (
          <div className="mb-8 border-b border-line-subtle pb-6">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-5 h-9 w-72 max-w-full" />
            <Skeleton className="mt-3 h-3.5 w-full max-w-lg" />
          </div>
        ) : null}
        <Skeleton className="h-24 w-full" />
        <div className="mt-6 flex flex-col gap-px overflow-hidden rounded-card border border-line">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-surface-1/60 px-4 py-3"
            >
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="ml-auto h-3.5 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
