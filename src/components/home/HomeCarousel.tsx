"use client";

import { useCallback, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

/**
 * A horizontal snap row for the home page (the most powerful cars, the
 * visitor's recently viewed): swipe or trackpad on any device, and previous /
 * next buttons from `lg`, where there may be no touch.
 *
 * The row itself is ordinary server-rendered content passed as children —
 * usually a CarGrid list laid out as columns with `CAROUSEL_TRACK` — so it
 * reads, tabs and prints like any list. Focus moving onto a card scrolls it
 * into view natively; the buttons are a convenience, not the only way along.
 *
 * Which ends are reached is read through useSyncExternalStore (the scroll
 * position is an external, mutable source), so scrolling re-renders only
 * when a button's disabled state actually changes.
 */

/**
 * Classes for the list inside the row: one column per card, sized so three
 * fit the content width from `lg` with the next one peeking in the gutter.
 * The grid-cols-none overrides cancel a CarGrid's own column counts.
 */
export const CAROUSEL_TRACK =
  "grid-flow-col grid-cols-none sm:grid-cols-none lg:grid-cols-none xl:grid-cols-none " +
  "2xl:grid-cols-none auto-cols-[min(82%,22rem)] gap-4 sm:auto-cols-[min(46%,24rem)] " +
  "sm:gap-5 lg:auto-cols-[calc((100%-3rem)/3)] lg:gap-6 [&>li]:snap-start";

/** Bleeds the scroller to the page edge, keeping cards aligned with the gutter. */
const BLEED =
  "-mx-5 px-5 scroll-px-5 sm:-mx-8 sm:px-8 sm:scroll-px-8 lg:-mx-12 lg:px-12 " +
  "lg:scroll-px-12 min-[1440px]:-mx-16 min-[1440px]:px-16 min-[1440px]:scroll-px-16";

type Edge = "none" | "start" | "end" | "both";

function edgeOf(element: HTMLElement | null): Edge {
  if (!element) return "start";
  const max = element.scrollWidth - element.clientWidth;
  if (max <= 1) return "both";
  const atStart = element.scrollLeft <= 1;
  const atEnd = element.scrollLeft >= max - 1;
  return atStart ? "start" : atEnd ? "end" : "none";
}

export function HomeCarousel({
  label,
  heading,
  children,
  className,
}: {
  /** What the row holds, for the button labels ("Most powerful cars"). */
  label: string;
  /** The section heading, laid out beside the buttons. */
  heading: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const track = useRef<HTMLDivElement>(null);

  const subscribe = useCallback((onChange: () => void) => {
    const element = track.current;
    element?.addEventListener("scroll", onChange, { passive: true });
    window.addEventListener("resize", onChange);
    return () => {
      element?.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, []);
  const edge = useSyncExternalStore(
    subscribe,
    () => edgeOf(track.current),
    () => "start" as Edge,
  );

  const step = (direction: 1 | -1) => {
    const element = track.current;
    if (!element) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * element.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const atStart = edge === "start" || edge === "both";
  const atEnd = edge === "end" || edge === "both";

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-6">
        <div className="min-w-0 flex-1">{heading}</div>
        <div className="hidden shrink-0 gap-2 lg:flex">
          <IconButton
            label={`Previous: ${label}`}
            variant="outline"
            onClick={() => step(-1)}
            disabled={atStart}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={`Next: ${label}`}
            variant="outline"
            onClick={() => step(1)}
            disabled={atEnd}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
      <div
        ref={track}
        className={cn(
          "no-scrollbar mt-9 snap-x snap-mandatory overflow-x-auto overscroll-x-contain pt-1 pb-3",
          BLEED,
        )}
      >
        {children}
      </div>
    </div>
  );
}
