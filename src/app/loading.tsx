import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Default route-loading fallback while a server component streams. Routes with
 * a distinctive layout override it with a shape matching their own content;
 * this one sketches the common page anatomy — overline, title, lede, a row of
 * figures and a grid — so the page that replaces it does not jump.
 */
export default function Loading() {
  return (
    <Container className="py-16 sm:py-20">
      <p role="status" className="sr-only">
        Loading…
      </p>

      <div aria-hidden="true">
        <div className="flex items-center gap-3">
          <span className="relative block h-px w-10 overflow-hidden bg-surface-3">
            <span className="absolute inset-y-0 left-0 w-1/2 animate-pulse bg-gold-600" />
          </span>
          <Skeleton className="h-2.5 w-28" />
        </div>
        <Skeleton className="mt-7 h-9 w-full max-w-xl sm:h-11" />
        <Skeleton className="mt-5 h-3.5 w-full max-w-lg" />
        <Skeleton className="mt-2.5 h-3.5 w-2/3 max-w-sm" />

        <div className="mt-14 grid grid-cols-2 gap-px border-t border-line pt-px lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="bg-surface-1/60 px-5 py-6">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-4 h-7 w-24" />
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="rounded-md border border-line-subtle p-4">
              <Skeleton className="aspect-[16/10] w-full" />
              <Skeleton className="mt-5 h-3 w-1/2" />
              <Skeleton className="mt-3 h-2.5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
