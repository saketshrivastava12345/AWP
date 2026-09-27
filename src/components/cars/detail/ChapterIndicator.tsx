"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  activeChapterId,
  chapterPosition,
  placementOf,
  type Chapter,
  type ChapterPlacement,
} from "@/lib/detail/chapters";

/**
 * Where the reader is in the car page: "03 / 07 · ENGINEERING".
 *
 * Desktop (lg+): a thin fixed rail at the right edge of the viewport with one
 * tick per chapter; the active tick is gold and every tick is a real link.
 * Phones and tablets: a compact pill under the 64px navbar that opens the
 * chapter list. Both are `position: fixed`, so they never shift the layout,
 * and both stay hidden until the reader reaches the first chapter.
 *
 * A section marked data-chapter-rail="hide" (the anatomy tour, which has its
 * own stop rail at the same edge) makes the desktop rail step aside while it
 * is on screen.
 *
 * Tracking uses one IntersectionObserver with a reading band across the top
 * 35% of the viewport. Each batch is replayed in order so the LAST entry per
 * section wins (a stale first entry once kept a scene from mounting — see
 * CLAUDE.md, Phase 10). Chapters whose section is not on the page are dropped.
 *
 * Props:
 *   chapters  [{ id, number, label }] in page order; `id` is the section's id
 */
export function ChapterIndicator({
  chapters,
  pillClearOf,
  className,
}: {
  chapters: Chapter[];
  /**
   * Id of an element the phone pill must not cover (the page's hero, with the
   * breadcrumb and the 3D stage's badges): the pill waits until it has
   * scrolled out from under it.
   */
  pillClearOf?: string;
  className?: string;
}) {
  // Null until the first observer batch reports which sections exist, so the
  // server render and the first client render agree (all chapters listed).
  const [present, setPresent] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const pillRef = useRef<HTMLDivElement>(null);

  // A stable key so the observer is not rebuilt when the parent re-renders
  // with an equal array.
  const key = chapters.map((chapter) => chapter.id).join("|");

  useEffect(() => {
    const ids = key ? key.split("|") : [];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    const order = elements.map((element) => element.id);
    const placements = new Map<string, ChapterPlacement>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          placements.set(
            entry.target.id,
            placementOf(
              entry.isIntersecting,
              entry.boundingClientRect.bottom,
              entry.rootBounds?.top ?? 0,
            ),
          );
        }
        setPresent(order);
        setActiveId(activeChapterId(order, placements));
      },
      { rootMargin: "0px 0px -65% 0px", threshold: 0 },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [key]);

  // The desktop rail steps aside while a section that brings its own rail
  // (the anatomy tour, marked data-chapter-rail="hide") is on screen above
  // the bottom edge band — the tour's rail rides on the section's top edge as
  // it scrolls in, and two rails at the same edge would overlap.
  const [railYields, setRailYields] = useState(false);
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(
      '[data-chapter-rail="hide"]',
    );
    if (targets.length === 0) return;
    const covering = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) covering.add(entry.target);
          else covering.delete(entry.target);
        }
        setRailYields(covering.size > 0);
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0 },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // The pill sits in the top band of the viewport; it stays out of the way
  // while the element it must clear is under it.
  const [pillBlocked, setPillBlocked] = useState(false);
  useEffect(() => {
    const target = pillClearOf ? document.getElementById(pillClearOf) : null;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry) setPillBlocked(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -80% 0px", threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [pillClearOf]);

  // Close the mobile menu on Escape or a tap outside it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!pillRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const visible = present
    ? chapters.filter((chapter) => present.includes(chapter.id))
    : chapters;
  if (visible.length === 0) return null;

  const active = visible.find((chapter) => chapter.id === activeId) ?? null;
  const position = chapterPosition(visible, activeId);
  const shown = active !== null;

  return (
    <div className={className}>
      {/* ----------------------------------------------- Desktop rail */}
      {/* Narrow enough to live in the page gutter: the running label is set
          vertically, and a tick's name only appears while it is hovered or
          focused, on its own backing, so the rail never sits over content. */}
      <nav
        aria-label="Chapters"
        className={cn(
          "fixed top-1/2 right-2 z-(--z-sticky) hidden -translate-y-1/2 lg:block xl:right-4",
          // Visibility (not just opacity) so hidden ticks leave the tab order;
          // it flips after the fade, so the fade-out still plays.
          "transition-[opacity,visibility] duration-(--duration-normal)",
          shown && !railYields ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <p
            aria-hidden="true"
            className="font-mono text-micro tracking-hud whitespace-nowrap uppercase tabular-nums [writing-mode:vertical-rl]"
          >
            <span className="text-gold-300">{active?.number ?? "—"}</span>
            <span className="text-ink-600"> / {visible[visible.length - 1]?.number}</span>
            <span className="text-ink-600"> · </span>
            <span className="text-ink-300">{active?.label ?? ""}</span>
          </p>
          <span
            aria-hidden="true"
            className="h-6 w-px bg-gradient-to-b from-transparent to-line-strong"
          />
          <ol className="flex flex-col items-center">
            {visible.map((chapter) => {
              const current = chapter.id === activeId;
              return (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    aria-current={current ? "true" : undefined}
                    className="group/tick relative flex h-6 w-7 items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-px transition-all duration-(--duration-normal) ease-cinematic",
                        current
                          ? "w-5 bg-gold-400"
                          : "w-2.5 bg-ink-600 group-hover/tick:w-4 group-hover/tick:bg-ink-300",
                      )}
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute top-1/2 right-full mr-1.5 -translate-y-1/2 rounded-xs border border-line-strong bg-void/90 px-2 py-1",
                        "font-mono text-micro tracking-hud whitespace-nowrap text-ink-100 uppercase backdrop-blur-sm",
                        "opacity-0 transition-opacity duration-(--duration-fast)",
                        "group-hover/tick:opacity-100 group-focus-visible/tick:opacity-100",
                      )}
                    >
                      <span className={current ? "text-gold-300" : "text-ink-500"}>
                        {chapter.number}
                      </span>{" "}
                      {chapter.label}
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      {/* ------------------------------------------------- Mobile pill */}
      <div
        ref={pillRef}
        className={cn(
          "fixed top-[4.5rem] right-4 z-(--z-sticky) lg:hidden",
          "transition-[opacity,visibility] duration-(--duration-normal)",
          shown && !pillBlocked ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={
            active
              ? `Chapter ${position}: ${active.label}. Show all chapters`
              : "Chapters"
          }
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 items-center gap-2.5 rounded-full border border-line-strong bg-surface-1/85 pr-3 pl-4 shadow-[0_12px_32px_-16px_rgb(0_0_0/0.9)] backdrop-blur-md"
        >
          <span className="font-mono text-micro tracking-hud text-ink-400 tabular-nums">
            <span className="text-gold-300">{active?.number ?? "—"}</span>
            <span className="text-ink-600"> / {visible[visible.length - 1]?.number}</span>
          </span>
          <span aria-hidden="true" className="h-3 w-px bg-line-strong" />
          <span className="max-w-[9.5rem] truncate font-mono text-micro tracking-hud text-ink-100 uppercase">
            {active?.label ?? ""}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 text-ink-400 transition-transform duration-(--duration-fast)",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <ol
            id={menuId}
            className="absolute top-[calc(100%+0.5rem)] right-0 w-60 animate-panel-in overflow-hidden rounded-md border border-line-strong bg-surface-1/95 py-1.5 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)] backdrop-blur-md"
          >
            {visible.map((chapter) => {
              const current = chapter.id === activeId;
              return (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    aria-current={current ? "true" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 px-4 font-mono text-micro tracking-hud uppercase transition-colors",
                      current ? "text-gold-300" : "text-ink-200 hover:bg-surface-2",
                    )}
                  >
                    <span className={current ? "text-gold-400" : "text-ink-500"}>
                      {chapter.number}
                    </span>
                    <span>{chapter.label}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
