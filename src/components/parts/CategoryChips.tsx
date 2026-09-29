"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { chipClasses, chipCountClasses } from "@/components/manufacturers/brand";

export type CategoryChip = { value: string; label: string; count: number };

/**
 * Single-choice filter chips with radio semantics: one Tab stop, arrow keys
 * move and select, Home/End jump to the ends. Sentence-case pills; the active
 * one carries the gold border.
 *
 * On phones they sit in one row that scrolls sideways, with faded edges so a
 * cut-off chip reads as "more this way"; the row reaches into the page gutter
 * so the first chip is not faded. From `sm` they wrap.
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
        "-mx-5 no-scrollbar flex gap-2 overflow-x-auto edge-fade-x px-5 py-0.5",
        "sm:mx-0 sm:flex-wrap sm:overflow-visible sm:[mask-image:none] sm:px-0",
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
              chipClasses(checked),
              option.count === 0 && !checked && "text-ink-400",
            )}
          >
            {option.label}
            <span className={chipCountClasses(checked)}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
