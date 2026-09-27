"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is only an icon or swatch. */
  ariaLabel?: string;
  disabled?: boolean;
  title?: string;
};

/**
 * A single-choice toggle group with radio semantics: one Tab stop, arrow keys
 * move between options (and select them), Home/End jump to the ends. Used for
 * camera presets, lighting, quality and anything else that is "pick one".
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
  wrap = false,
}: {
  /** Accessible name of the group. */
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  /** Allow the options to wrap onto several lines instead of scrolling. */
  wrap?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((option) => !option.disabled);

  const move = (event: KeyboardEvent, index: number) => {
    const current = enabled.findIndex((option) => option.value === options[index]?.value);
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = current + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = current - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[(next + enabled.length) % enabled.length];
    if (!target) return;
    onChange(target.value);
    refs.current[options.indexOf(target)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex max-w-full gap-0.5 rounded-pill border border-line bg-surface-1 p-0.5",
        wrap ? "flex-wrap" : "no-scrollbar overflow-x-auto",
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
            aria-label={option.ariaLabel}
            title={option.title}
            disabled={option.disabled}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-pill font-sans font-medium",
              "whitespace-nowrap transition-colors duration-(--duration-fast)",
              "disabled:cursor-not-allowed disabled:opacity-35",
              size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
              checked
                ? "bg-surface-3 text-ink-50 shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
                : "text-ink-300 hover:bg-surface-2 hover:text-ink-50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
