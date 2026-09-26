"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
};

/**
 * Tabs implementing the WAI-ARIA tabs pattern.
 *
 * Arrow keys move between tabs and Home/End jump to the ends, with roving
 * tabindex so Tab moves out of the tablist rather than through every tab.
 */
export function Tabs({
  items,
  defaultTabId,
  className,
  label = "Sections",
}: {
  items: TabItem[];
  defaultTabId?: string;
  className?: string;
  label?: string;
}) {
  const baseId = useId();
  const firstId = items[0]?.id;
  const [activeId, setActiveId] = useState(defaultTabId ?? firstId ?? "");
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());

  if (items.length === 0) return null;

  const focusTab = (id: string) => {
    setActiveId(id);
    tabRefs.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") nextIndex = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index === 0 ? last : index - 1;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = last;

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = items[nextIndex];
    if (nextTab) focusTab(nextTab.id);
  };

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 overflow-x-auto border-b border-line"
      >
        {items.map((item, index) => {
          const selected = item.id === activeItem?.id;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-controls={`${baseId}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "-mb-px shrink-0 border-b px-4 py-3 font-display",
                "text-[10px] tracking-[0.18em] uppercase transition-colors duration-200",
                selected
                  ? "border-gold-500 text-gold-300"
                  : "border-transparent text-ink-400 hover:text-ink-100",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.id}`}
          aria-labelledby={`${baseId}-tab-${activeItem.id}`}
          tabIndex={0}
          className="pt-6 focus-visible:outline-none"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
