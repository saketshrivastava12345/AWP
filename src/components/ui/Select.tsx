"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/** A labelled <optgroup>; screen readers announce its label with its options. */
export type SelectGroup = {
  label: string;
  options: readonly SelectOption[];
};

/**
 * A styled native <select>.
 *
 * Native on purpose: it is fully accessible, keyboard-complete, and on phones
 * it opens the platform picker, which beats any custom listbox for choosing a
 * state from a list of thirty. Only the closed control is styled.
 */
export function Select({
  label,
  hideLabel = false,
  options,
  groups,
  placeholder,
  size = "md",
  className,
  selectClassName,
  id,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  label: string;
  hideLabel?: boolean;
  options: readonly SelectOption[];
  /** Grouped options, rendered after `options`. Empty groups are omitted. */
  groups?: readonly SelectGroup[];
  /** Shown as a first, empty option. */
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  selectClassName?: string;
}) {
  const generated = useId();
  const selectId = id ?? generated;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label
        htmlFor={selectId}
        className={cn("text-body-s font-medium text-ink-200", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            "w-full min-w-0 appearance-none rounded-control border border-line-strong bg-surface-1 pr-10 pl-3.5",
            "text-[15px] text-ink-50 transition-colors duration-(--duration-fast)",
            "hover:border-cyan-700 focus-visible:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50",
            size === "sm" ? "h-10" : "h-12",
            selectClassName,
          )}
          {...props}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {groups?.map((group) =>
            group.options.length > 0 ? (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null,
          )}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
