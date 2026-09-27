"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Keeps the admin navigation usable when one admin page fails to render:
 * the error is contained to the page, with a retry.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page failed:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-card border-l-2 border-signal-negative bg-surface-1 px-6 py-10"
    >
      <TriangleAlert
        className="size-6 text-signal-negative"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h1 className="mt-4 text-h3">This page could not be loaded</h1>
      <p className="mt-3 max-w-xl text-body">
        Nothing was changed. The database may be unreachable for a moment; try again, or
        go back to the dashboard.
        {error.digest ? (
          <span className="mt-2 block font-mono text-xs text-ink-400">
            Reference {error.digest}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" size="sm" onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/admin" size="sm" variant="secondary">
          Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}
