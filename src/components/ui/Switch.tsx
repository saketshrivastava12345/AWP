"use client";

import { cn } from "@/lib/utils";

/** An on/off control with switch semantics and a visible label. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group inline-flex min-h-11 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-(--duration-fast)",
          checked ? "border-gold-500 bg-gold-500/25" : "border-line-strong bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-[left,background-color] duration-(--duration-fast)",
            checked ? "left-[calc(100%-1.05rem)] bg-gold-400" : "left-0.5 bg-ink-400",
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-body-s text-ink-200">{label}</span>
        {description ? <span className="text-caption">{description}</span> : null}
      </span>
    </button>
  );
}
