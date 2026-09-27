"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

export type CategoryChip = { value: string; label: string; count: number };

/**
 * Single-choice category chips with radio semantics: one Tab stop, arrow keys
 * move and select, Home/End jump to the ends. Separate bordered chips rather
 * than a joined strip, so ten categories can wrap onto a second line on wide
 * screens; on phones they scroll sideways in one row.
 */
export function CategoryChips({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly CategoryChip[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (event: KeyboardEvent, index: number) => {
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = options.length - 1;
    else return;
    event.preventDefault();
    const target = (next + options.length) % options.length;
    const option = options[target];
    if (!option) return;
    onChange(option.value);
    refs.current[target]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xs border px-3.5",
              "font-display text-micro tracking-hud whitespace-nowrap uppercase",
              "transition-colors duration-(--duration-fast)",
              checked
                ? "border-gold-600 bg-gold-500/10 text-gold-300"
                : "border-line bg-surface-1/60 text-ink-300 hover:border-line-strong hover:text-ink-50",
              option.count === 0 && !checked && "text-ink-500",
            )}
          >
            {option.label}
            <span
              className={cn(
                "tabular font-mono text-[11px] tracking-normal",
                checked ? "text-gold-400/80" : "text-ink-500",
              )}
            >
              {option.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
