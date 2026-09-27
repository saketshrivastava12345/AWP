"use client";

import { createContext, useContext } from "react";
import { Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

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
    <div role="status" className={cn("flex flex-wrap items-center gap-x-3", className)}>
      {note ? <p className="min-w-0 text-caption">{note}</p> : null}
      {canOptIn ? (
        <Button variant="ghost" size="sm" onClick={optIn} className="-ml-4 lg:-mr-4 lg:ml-0">
          <Box aria-hidden="true" />
          Load 3D scene
        </Button>
      ) : null}
    </div>
  );
}
