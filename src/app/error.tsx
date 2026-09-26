"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Route-level error boundary.
 *
 * Shows a calm, on-brand message rather than a stack trace, and offers a retry
 * — most failures here will be a Supabase request that timed out, which often
 * succeeds on a second attempt.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the server logs / browser console for diagnosis. The digest
    // is what correlates this with the server-side entry in production.
    console.error("Route error:", error);
  }, [error]);

  return (
    <Container className="grain flex flex-1 flex-col justify-center py-28">
      <div className="relative z-10 max-w-2xl">
        <p className="text-label">Something went wrong</p>

        <h1 className="mt-6 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          SYSTEM FAULT
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink-300 sm:text-base">
          This page could not be loaded. If the catalogue database is temporarily
          unreachable, trying again usually resolves it.
        </p>

        {error.digest ? (
          <p className="mt-6 font-mono text-xs text-ink-600">Reference: {error.digest}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Button onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
          <ButtonLink href="/" variant="secondary">
            Return home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
