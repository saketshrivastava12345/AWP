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
    <section className="relative isolate flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 tech-grid opacity-70"
      />
      <Container className="flex flex-1 flex-col justify-center py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="flex items-center gap-3 text-hud text-signal-negative">
            <span aria-hidden="true" className="size-1.5 bg-signal-negative" />
            System fault
          </p>

          <h1 className="mt-6 font-display text-2xl leading-tight tracking-display text-ink-50 uppercase sm:text-4xl">
            This page failed to load
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink-300 sm:text-base">
            Something went wrong while fetching it. If the catalogue database was briefly
            unreachable, trying again usually resolves it.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button onClick={() => retry()}>
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Return home
            </ButtonLink>
          </div>

          {error.digest ? (
            <p className="mt-12 border-t border-line-subtle pt-5 font-mono text-xs text-ink-500">
              Reference <span className="text-ink-300 select-all">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
