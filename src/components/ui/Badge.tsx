import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  "neutral" | "gold" | "electric" | "hybrid" | "positive" | "negative";

/**
 * Tones are carried by a 6px leading dot, never by the text colour: the label
 * stays ink-200 so a row of badges reads as information, not status lights.
 * `neutral` has no dot. `gold` is reserved for "Exact 3D model".
 */
const DOTS: Record<BadgeTone, string | null> = {
  neutral: null,
  gold: "bg-gold-500",
  electric: "bg-signal-electric",
  hybrid: "bg-signal-hybrid",
  positive: "bg-signal-positive",
  negative: "bg-signal-negative",
};

/**
 * A small sentence-case tag: powertrain, status, segment. Inter 12px on a
 * hairline pill. Pass the label in sentence case ("Plug-in hybrid"); the
 * badge no longer uppercases it.
 */
export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const dot = DOTS[tone];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-pill border border-line px-2.5",
        "font-sans text-xs leading-none font-medium whitespace-nowrap text-ink-200",
        tone === "gold" && "border-gold-700",
        className,
      )}
    >
      {dot ? (
        <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      ) : null}
      {children}
    </span>
  );
}

/** Maps a fuel_type enum value to the tone it should be shown in. */
export function fuelTone(fuelType: string | null | undefined): BadgeTone {
  switch (fuelType) {
    case "electric":
      return "electric";
    case "hybrid":
    case "phev":
      return "hybrid";
    default:
      return "neutral";
  }
}
