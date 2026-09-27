"use client";

import { useId } from "react";
import { Input } from "@/components/ui/Field";
import { AnimatedCaretInput } from "@/components/inputs/AnimatedCaretInput";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const SAMPLE = "Press Home, then End, then click mid-word";

/**
 * The animated-caret input beside a standard one with the same text, so the
 * difference is the caret and nothing else.
 */
export function CaretDemo() {
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-animated`} className="text-label">
            Animated caret
          </label>
          <AnimatedCaretInput
            id={`${id}-animated`}
            defaultValue={SAMPLE}
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full min-w-0 rounded-control border border-line-strong bg-surface-1/80 px-3.5 text-[15px] text-ink-50 transition-colors duration-(--duration-fast) placeholder:text-ink-500 hover:border-cyan-700 focus-visible:border-cyan-300 focus-visible:shadow-[0_0_0_3px_oklch(0.83_0.13_210/18%),0_0_18px_-4px_oklch(0.8_0.14_210/45%)]"
          />
          <p className="text-caption">
            {reduced
              ? "Reduced motion is on, so this is the native caret."
              : "A glowing bar that glides to the cursor and blinks when you pause."}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`${id}-standard`} className="text-label">
            Standard input
          </label>
          <Input
            id={`${id}-standard`}
            defaultValue={SAMPLE}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-caption">The browser&rsquo;s own caret, for comparison.</p>
        </div>
      </div>
    </div>
  );
}
