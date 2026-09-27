"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { Part, ViewerGroup } from "@/types/domain";
import { Sheet } from "@/components/ui/Sheet";
import { GROUP_DESCRIPTIONS, GROUP_LABELS } from "./viewer-config";

/**
 * The subsystem panel: what the group is, what the catalogue says about this
 * car's version of it, and its components with this variant's own notes
 * where recorded — each linking to its page in the parts encyclopedia.
 */
export function PartPanel({
  group,
  parts,
  partDetails,
  note,
  onClose,
  side,
}: {
  group: ViewerGroup | null;
  parts: Part[];
  /** Part slug → a note specific to this variant. */
  partDetails: Record<string, string>;
  /** Figures for this group from the variant's specifications. */
  note: string | undefined;
  /** Must be stable. */
  onClose: () => void;
  side: "right" | "bottom";
}) {
  return (
    <Sheet
      open={group !== null}
      onClose={onClose}
      title={group ? GROUP_LABELS[group] : ""}
      description={group ? GROUP_DESCRIPTIONS[group] : undefined}
      side={side}
    >
      {note ? (
        <p className="mb-6 border-b border-line-subtle pb-5 text-sm leading-relaxed text-ink-200">
          <span className="text-hud text-gold-400">This car · </span>
          {note}
        </p>
      ) : null}

      {parts.length > 0 ? (
        <ul className="space-y-5">
          {parts.map((part) => {
            const detail = partDetails[part.slug];
            return (
              <li key={part.id}>
                <Link
                  href={`/parts/${part.slug}`}
                  className="font-display text-[11px] tracking-[0.14em] text-gold-300 uppercase transition-colors hover:text-gold-200"
                >
                  {part.name} →
                </Link>
                {detail ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink-100">
                    <span className="text-gold-400">This car: </span>
                    {detail}
                  </p>
                ) : part.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-ink-400">
                    {part.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-ink-400">
          No components are catalogued for this subsystem yet.
        </p>
      )}

      <Link
        href="/parts"
        className="mt-8 flex min-h-11 items-center gap-2 border-t border-line pt-5 text-xs text-ink-400 transition-colors hover:text-gold-300"
      >
        <BookOpen className="size-3.5" aria-hidden="true" />
        Open the full parts encyclopedia
      </Link>
    </Sheet>
  );
}
