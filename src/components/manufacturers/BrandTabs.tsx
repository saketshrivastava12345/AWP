"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrandTab = {
  id: string;
  label: string;
  count: number;
  /** Server-rendered panel content (a car grid). */
  content: ReactNode;
};

/**
 * Tabs over a maker's cars (All · Performance · EV · SUV · Sports cars),
 * following the WAI-ARIA tabs pattern: one Tab stop for the list, arrow keys
 * move between tabs and activate them, Home/End jump to the ends.
 *
 * The panels arrive already rendered on the server; only the active one is
 * mounted, so the first paint carries one grid rather than every subset.
 */
export function BrandTabs({ tabs, label }: { tabs: BrandTab[]; label: string }) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    setActiveId(target.id);
    refs.current.get(target.id)?.focus();
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-line"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) refs.current.set(tab.id, node);
                else refs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4",
                "font-display text-micro tracking-hud whitespace-nowrap uppercase",
                "transition-colors duration-(--duration-fast)",
                selected
                  ? "border-gold-500 text-gold-300"
                  : "border-transparent text-ink-400 hover:text-ink-100",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "tabular font-mono text-[11px] tracking-normal",
                  selected ? "text-gold-400/80" : "text-ink-500",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        tabIndex={0}
        className="pt-8"
      >
        {active.content}
      </div>
    </div>
  );
}
