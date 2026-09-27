"use client";

import type { ComponentPropsWithRef } from "react";
import { AnimatedCaretInput } from "@/components/inputs/AnimatedCaretInput";
import { cn } from "@/lib/utils";

/*
 * The access terminal's email field: a real <input> (posts without
 * JavaScript, every prop passes through) whose caret is a glowing cyan bar
 * that glides to the cursor. Styled to match ui/Field's Input exactly — the
 * control classes are repeated here because Field does not export them
 * (a request to FX1: `inputClasses()` would remove this copy).
 */
const CONTROL =
  "h-12 w-full min-w-0 rounded-control border border-line-strong bg-surface-1/80 px-3.5 text-[15px] text-ink-50 " +
  "placeholder:text-ink-500 transition-colors duration-(--duration-fast) " +
  "hover:border-cyan-700 focus-visible:border-cyan-300 focus-visible:shadow-[0_0_0_3px_oklch(0.83_0.13_210/18%),0_0_18px_-4px_oklch(0.8_0.14_210/45%)] " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-signal-negative";

export function TerminalEmailInput({
  className,
  invalid,
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { invalid?: boolean }) {
  return (
    <AnimatedCaretInput
      type="email"
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, className)}
      caretClassName="bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-300),0_0_2px_var(--color-cyan-200)]"
      {...props}
    />
  );
}
