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
      className="relative rounded-card px-6 py-10 hud-panel [--hud-c:var(--color-signal-negative)] [--hud-l:18px] [--panel-edge:linear-gradient(135deg,oklch(0.65_0.2_20/55%),oklch(0.9_0.03_230/10%)_40%,oklch(0.9_0.03_230/8%)_65%,oklch(0.65_0.2_20/30%))]"
    >
      <span aria-hidden="true" className="hud-brackets -m-px" />
      <p aria-hidden="true" className="hud-label text-signal-negative/80">
        SYS // FAULT
      </p>
      <TriangleAlert
        className="mt-4 size-6 text-signal-negative drop-shadow-[0_0_10px_oklch(0.65_0.2_20/60%)]"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h1 className="mt-4 text-h3">
        <span
          className="fx-glitch inline-block"
          data-text="This page could not be loaded"
        >
          This page could not be loaded
        </span>
      </h1>
      <p className="mt-3 max-w-xl text-body">
        Nothing was changed. The database may be unreachable for a moment; try again, or
        go back to the dashboard.
        {error.digest ? (
          <span className="mt-2 block text-hud">Reference {error.digest}</span>
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
