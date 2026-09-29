"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

/**
 * A row's explanation on a mobile card: a 44px touch target at the card's
 * right edge whose tooltip opens leftwards, so it never runs off a narrow
 * screen. A client component so the trigger is created where the Tooltip
 * clones it — a button passed in from a server component arrives as a lazy
 * reference and would hydrate without its aria-describedby.
 */
export function CardHint({ label, parts }: { label: string; parts: string[] }) {
  return (
    <Tooltip
      side="left"
      className="-mt-3 -mr-3 shrink-0"
      content={parts.map((part) => (
        <span key={part} className="block [&+&]:mt-1.5">
          {part}
        </span>
      ))}
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        className="grid size-11 place-items-center rounded-pill text-ink-400 transition-colors hover:text-ink-50"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
