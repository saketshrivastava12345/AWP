import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Default route-loading fallback while a server component streams.
 * Individual routes override this with a shape matching their own content.
 */
export default function Loading() {
  return (
    <Container className="py-20">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-6 h-10 w-full max-w-lg" />
      <Skeleton className="mt-4 h-4 w-full max-w-md" />
      <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    </Container>
  );
}
