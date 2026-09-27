import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone =
  "neutral" | "gold" | "electric" | "hybrid" | "positive" | "negative";

/**
 * Tones are carried by a small glowing dot and a tinted edge; the label
 * stays ink-200 (gold-200 for gold) so every tone passes AA as text.
 * `neutral` has no dot. `gold` marks premium/brand facts ("Exact 3D model").
 */
const DOTS: Record<BadgeTone, string | null> = {
  neutral: null,
  gold: "bg-gold-400 shadow-[0_0_6px_var(--color-gold-400)]",
  electric: "bg-signal-electric shadow-[0_0_6px_var(--color-signal-electric)]",
  hybrid: "bg-signal-hybrid shadow-[0_0_6px_var(--color-signal-hybrid)]",
  positive: "bg-signal-positive shadow-[0_0_6px_var(--color-signal-positive)]",
  negative: "bg-signal-negative shadow-[0_0_6px_var(--color-signal-negative)]",
};

const EDGES: Record<BadgeTone, string> = {
  neutral: "border-line-strong",
  gold: "border-gold-600/60 bg-gold-500/8 text-gold-200",
  electric: "border-signal-electric/35 bg-signal-electric/6",
  hybrid: "border-signal-hybrid/35 bg-signal-hybrid/6",
  positive: "border-signal-positive/35 bg-signal-positive/6",
  negative: "border-signal-negative/35 bg-signal-negative/6",
};

/**
 * A small HUD tag: powertrain, status, segment. Mono 11px, uppercase via CSS
 * (pass the label in sentence case — "Plug-in hybrid" — screen readers get
 * that), on a tight hairline chip.
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
        "inline-flex h-6 items-center gap-1.5 rounded-xs border px-2",
        "font-mono text-[11px] leading-none font-medium tracking-[0.08em] whitespace-nowrap uppercase",
        "text-ink-200",
        EDGES[tone],
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
