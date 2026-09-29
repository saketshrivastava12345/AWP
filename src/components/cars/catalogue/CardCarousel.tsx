"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

/**
 * A horizontal, snap-scrolling row of cards: swipe on touch, scroll or Tab
 * through on a keyboard, and previous/next buttons from 1024px. Nothing moves
 * on its own.
 *
 * The list is server-rendered children (`<li>`s), so the cards stay server
 * components; this only owns the scroller and its two buttons. Which buttons
 * are usable is read from the scroll position in scroll and resize callbacks
 * (never set during an effect body).
 */
export function CardCarousel({
  children,
  label,
  className,
  listClassName,
}: {
  /** The `<li>` items. Give each a width (see CAROUSEL_ITEM in CarGrid). */
  children: ReactNode;
  /** Accessible name of the list, e.g. "The most powerful cars". */
  label?: string;
  className?: string;
  listClassName?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const start = list.scrollLeft <= 4;
    const end = list.scrollLeft + list.clientWidth >= list.scrollWidth - 4;
    setEdges((current) =>
      current.start === start && current.end === end ? current : { start, end },
    );
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // The observer reports once on observe, then on every size change.
    const observer = new ResizeObserver(() => measure());
    observer.observe(list);
    return () => observer.disconnect();
  }, [measure]);

  const page = (direction: -1 | 1) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({
      left: direction * list.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  const scrollable = !(edges.start && edges.end);

  return (
    <div className={cn("relative", className)}>
      {scrollable ? (
        <div className="mb-5 hidden justify-end gap-2 lg:flex">
          <IconButton
            label="Previous cars"
            variant="outline"
            disabled={edges.start}
            onClick={() => page(-1)}
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Next cars"
            variant="outline"
            disabled={edges.end}
            onClick={() => page(1)}
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
      ) : null}
      <ul
        ref={listRef}
        aria-label={label}
        onScroll={measure}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain sm:gap-6",
          // Room for the focus ring and the hover lift inside the scroller.
          "py-1",
          listClassName,
        )}
      >
        {children}
      </ul>
    </div>
  );
}
