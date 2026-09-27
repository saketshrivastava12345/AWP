"use client";

import { createContext, useContext } from "react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What the hero stage is showing and why, for the caption under the headline.
 *
 * The stage itself (HeroStory) decides; this is how the decision reaches the
 * server-rendered hero content, which places the status where it reads best
 * at each width instead of an overlay that could collide with the caption.
 */

export type HeroStageState = {
  /** A short explanation of a still stage ("reduced motion is on"), or null. */
  note: string | null;
  /** The device was judged low-power; the visitor may ask for the scene anyway. */
  canOptIn: boolean;
  optIn: () => void;
};

const NO_STATE: HeroStageState = { note: null, canOptIn: false, optIn: () => {} };

export const HeroStageContext = createContext<HeroStageState>(NO_STATE);

export function HeroStageStatus({ className }: { className?: string }) {
  const { note, canOptIn, optIn } = useContext(HeroStageContext);
  if (!note && !canOptIn) return null;
  return (
    <div role="status" className={cn("flex items-center gap-4", className)}>
      {note ? (
        <p className="max-w-64 min-w-0 flex-1 font-mono text-micro leading-relaxed tracking-[0.06em] text-ink-400">
          {note}
        </p>
      ) : null}
      {canOptIn ? (
        <button
          type="button"
          onClick={optIn}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-xs border border-line-strong bg-void/70 px-4 font-display text-micro tracking-button text-ink-100 uppercase backdrop-blur-sm transition-colors hover:border-gold-500 hover:text-gold-300"
        >
          <Box className="size-3.5" aria-hidden="true" />
          Load 3D scene
        </button>
      ) : null}
    </div>
  );
}
