"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

type TriggerProps = {
  "aria-describedby"?: string;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
};

/**
 * A tooltip that works for mouse, keyboard AND touch — unlike the native
 * `title` attribute this replaces, which keyboard and touch users never see.
 *
 * Shown on hover and on focus of the trigger; a tap focuses the trigger, so
 * touch works too. The trigger is described by the tooltip text for screen
 * readers. Content is short text: this is not a popover for interactive UI.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: ReactNode;
  children: ReactElement<TriggerProps>;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);

  const trigger = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": id,
        onFocus: (event: React.FocusEvent) => {
          setFocused(true);
          children.props.onFocus?.(event);
        },
        onBlur: (event: React.FocusEvent) => {
          setFocused(false);
          children.props.onBlur?.(event);
        },
      })
    : children;

  return (
    <span className={cn("group/tip relative inline-flex", className)}>
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-(--z-raised) w-max max-w-[16rem] rounded-sm border border-line-strong",
          "bg-surface-2/95 px-2.5 py-1.5 text-left text-xs leading-snug font-normal tracking-normal normal-case",
          "text-ink-200 opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-(--duration-fast)",
          "group-hover/tip:opacity-100",
          focused && "opacity-100",
          side === "top" && "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          side === "bottom" && "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          side === "left" && "top-1/2 right-[calc(100%+6px)] -translate-y-1/2",
          side === "right" && "top-1/2 left-[calc(100%+6px)] -translate-y-1/2",
        )}
      >
        {content}
      </span>
    </span>
  );
}

/**
 * A small "i" affordance that explains a figure: its source, formula or
 * caveat. Focusable, so the explanation is reachable without a mouse.
 */
export function InfoHint({
  label = "More information",
  children,
  side = "top",
  className,
}: {
  label?: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  return (
    <Tooltip content={children} side={side} className={className}>
      <button
        type="button"
        aria-label={label}
        className="inline-grid size-5 place-items-center rounded-full text-ink-500 transition-colors hover:text-gold-300"
      >
        <Info className="size-3.5" aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
