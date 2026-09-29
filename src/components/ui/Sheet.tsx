"use client";

import type { ReactNode } from "react";
import { Dialog } from "./Dialog";

export type SheetSide = "right" | "left" | "bottom";

/**
 * A modal side drawer or bottom sheet. A thin wrapper over Dialog, kept for
 * the callers that think in "sheet" terms (the viewer's subsystem panel, the
 * mobile filter drawer). Pick `bottom` on phones, a side on larger screens.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  side = "right",
  size,
  className,
}: {
  open: boolean;
  /** Must be stable (useCallback) — it is an effect dependency. */
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  side?: SheetSide;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      placement={side}
      size={size}
      className={className}
    >
      {children}
    </Dialog>
  );
}
