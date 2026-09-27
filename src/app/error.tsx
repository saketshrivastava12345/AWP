"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Route-level error boundary.
 *
 * A calm, on-brand message instead of a stack trace, with a retry — most
 * failures here are a database request that timed out, which usually
 * succeeds on a second attempt. `retry` (stable since Next 16.3) re-fetches
 * the segment and re-renders it; `reset` would only clear the error state and
 * re-render the same failed data.
 */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Surfaced in the browser console for diagnosis. The digest is what
    // correlates this with the server-side log entry in production.
    console.error("Route error:", error);
  }, [error]);

  return (
    <section className="flex flex-1 flex-col">
      <Container className="flex flex-1 flex-col justify-center py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-eyebrow">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-signal-negative"
            />
            Something went wrong
          </p>

          <h1 className="mt-4 text-h1">This page failed to load.</h1>

          <p className="mt-6 max-w-[60ch] text-lead">
            Something went wrong while fetching it. If the catalogue database was briefly
            unreachable, trying again usually resolves it.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={() => retry()}>
              <RotateCcw aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Return home
            </ButtonLink>
          </div>

          {error.digest ? (
            <p className="mt-12 border-t border-line-subtle pt-5 text-caption">
              Reference{" "}
              <span className="font-mono text-ink-300 select-all">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
