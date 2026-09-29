"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ModelLineItem = {
  key: string;
  /** The segment (category slug) the model belongs to. */
  segment: string;
  node: ReactNode;
};

export type ModelLineSegment = { slug: string; name: string; count: number };

const noop = () => () => {};

/**
 * A maker's model-line grid with segment chips above it: "All · Sports car ·
 * EV". The cards are server-rendered and passed in; this only chooses which
 * are shown.
 *
 * Without JavaScript every model is listed and the chips stay disabled (they
 * are enabled once hydrated), so nothing is ever hidden behind a control that
 * cannot work. With one or two models in view the grid is two columns wide —
 * never a third of the page with two empty thirds beside it.
 */
export function ModelLineFilter({
  items,
  segments,
  className,
}: {
  items: readonly ModelLineItem[];
  segments: readonly ModelLineSegment[];
  className?: string;
}) {
  const [segment, setSegment] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const shown = segment ? items.filter((item) => item.segment === segment) : items;
  const chips: { slug: string | null; name: string; count: number }[] = [
    { slug: null, name: "All", count: items.length },
    ...segments,
  ];

  return (
    <div className={className}>
      {segments.length > 1 ? (
        <div
          role="group"
          aria-label="Show models by segment"
          className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto edge-fade-x px-5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:[mask-image:none] sm:px-0"
        >
          {chips.map((chip) => {
            const active = chip.slug === segment;
            return (
              <button
                key={chip.slug ?? "all"}
                type="button"
                disabled={!hydrated}
                aria-pressed={active}
                onClick={() => setSegment(chip.slug)}
                className={cn(
                  "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-pill border px-4 text-body-s whitespace-nowrap",
                  "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                  "transition-colors duration-(--duration-fast) ease-standard disabled:cursor-default",
                  active
                    ? "border-gold-500 text-ink-50"
                    : "border-line-strong text-ink-200 hover:border-ink-400 hover:text-ink-50",
                )}
              >
                {chip.name}
                <span className="tabular text-caption text-ink-400">{chip.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <p role="status" className="sr-only">
        {segment
          ? `${shown.length} ${shown.length === 1 ? "model" : "models"} shown`
          : ""}
      </p>
      <ul
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6",
          segments.length > 1 && "mt-8",
          shown.length > 2 && "lg:grid-cols-3",
        )}
      >
        {shown.map((item) => (
          <li key={item.key}>{item.node}</li>
        ))}
      </ul>
    </div>
  );
}
