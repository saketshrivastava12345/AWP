import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  "neutral" | "gold" | "electric" | "hybrid" | "positive" | "negative";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line text-ink-300",
  gold: "border-gold-700 text-gold-300",
  // Powertrain tones are deliberately desaturated — see the design language
  // note in CLAUDE.md. They must read as information, not as status lights.
  electric: "border-signal-electric/35 text-signal-electric",
  hybrid: "border-signal-hybrid/35 text-signal-hybrid",
  positive: "border-signal-positive/35 text-signal-positive",
  negative: "border-signal-negative/35 text-signal-negative",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs border px-2 py-1 font-display",
        "text-[9px] leading-none tracking-[0.18em] uppercase",
        TONES[tone],
        className,
      )}
    >
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
