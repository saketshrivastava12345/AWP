import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Default route-loading fallback while a server component streams. Routes with
 * a distinctive layout override it with a shape matching their own content;
 * this one sketches the common page anatomy — eyebrow, title, lead, a row of
 * key figures and a card grid — so the page that replaces it does not jump.
 */
export default function Loading() {
  return (
    <Container className="py-16 sm:py-20">
      <p role="status" className="sr-only">
        Loading…
      </p>
      <p
        aria-hidden="true"
        className="mb-6 flex items-center gap-2 font-mono text-xs tracking-[0.18em] text-cyan-300 uppercase"
      >
        <span className="size-1.5 animate-pulse-glow rounded-full bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]" />
        Receiving data
        <span className="animate-blink">_</span>
      </p>

      <div aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-5 h-10 w-full max-w-xl sm:h-14" />
        <Skeleton className="mt-6 h-4 w-full max-w-lg" />
        <Skeleton className="mt-3 h-4 w-2/3 max-w-sm" />

        <div className="mt-14 stat-row max-w-3xl">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="mt-3 h-3 w-16" />
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-card border border-line bg-surface-1">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
              <div className="p-5">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="mt-3 h-5 w-1/2" />
                <Skeleton className="mt-3 h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
