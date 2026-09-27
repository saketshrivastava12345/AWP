"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { cn } from "@/lib/utils";
import { CONTAINER_GUTTERS } from "./Container";

export type SubNavItem = {
  label: string;
  /**
   * "#section-id" for a section on this page (tracked while scrolling), or a
   * route ("/manufacturers/porsche") for a sibling page.
   */
  href: string;
  /** For route items: marks the page you are on (aria-current="page"). */
  current?: boolean;
};

/**
 * The band, below the navbar and this bar, in which a section counts as the
 * one being read: from 120px under the top of the viewport down to 45% of
 * its height.
 */
const ROOT_MARGIN = "-120px 0px -55% 0px";

function sectionId(href: string): string | null {
  return href.startsWith("#") && href.length > 1 ? href.slice(1) : null;
}

/**
 * Sticky in-page navigation under the global navbar, as on a car maker's
 * model pages: Overview · Performance · Technical data · Compare.
 *
 * - Place it as a direct child of the page (not inside a short wrapper or an
 *   `overflow-hidden` ancestor — either ends the sticky range), before the
 *   sections it lists. Each "#id" item needs an element with that id.
 * - The active item follows the section being read (IntersectionObserver)
 *   and carries aria-current="location"; route items use `current`.
 * - While it exists the page's anchor offset grows by its height
 *   (--subnav-offset), and the navbar may hide on scroll-down, in which case
 *   this bar slides up into the top slot (--nav-offset).
 * - On narrow screens it scrolls horizontally with faded edges and keeps the
 *   active item in view.
 */
export function SubNav({
  items,
  label = "On this page",
  action,
  progress = false,
  className,
}: {
  items: readonly SubNavItem[];
  /** Accessible name of the landmark. */
  label?: string;
  /** Right-aligned slot for the page's primary action, e.g. a small "Compare" button. */
  action?: ReactNode;
  /** A 1px reading-progress rule along the bottom edge (the car detail page). */
  progress?: boolean;
  className?: string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const ids = items.map((item) => sectionId(item.href)).filter((id) => id !== null);
  const idsKey = ids.join(" ");
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  // Which tracked section is being read. The observer reports changes in
  // batches; entries are applied in order so the LAST report for a section
  // wins (the first can be stale — see CLAUDE.md), and the earliest section
  // in the band is the active one. With nothing in the band (a gap between
  // sections) the previous choice stands.
  useEffect(() => {
    const order = idsKey ? idsKey.split(" ") : [];
    const targets = order
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (targets.length === 0) return;

    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = order.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: ROOT_MARGIN },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [idsKey]);

  // Keep the active item visible in the horizontal scroller. Written straight
  // to the element's scroll position — scrollIntoView could also scroll the
  // page, and would interrupt a smooth scroll the reader started.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const item = list.querySelector<HTMLElement>(`[data-subnav-id="${CSS.escape(active)}"]`);
    if (!item) return;
    const left = item.offsetLeft - (list.clientWidth - item.offsetWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: Math.max(0, left), behavior: reduce ? "auto" : "smooth" });
  }, [active]);

  return (
    <nav
      data-subnav=""
      aria-label={label}
      className={cn(
        "sticky top-(--nav-offset) z-(--z-sticky) h-(--subnav-h) border-b border-line-subtle",
        "bg-void/85 backdrop-blur-md backdrop-saturate-150",
        "transition-[top] duration-(--duration-base) ease-standard",
        className,
      )}
    >
      <div
        className={cn(
          "relative mx-auto flex h-full w-full max-w-[1360px] items-center gap-4",
          CONTAINER_GUTTERS,
        )}
      >
        <ul
          ref={listRef}
          className={cn(
            "no-scrollbar flex h-full min-w-0 flex-1 items-stretch gap-6 overflow-x-auto lg:gap-8",
            // Faded edges on narrow screens; the list reaches into the
            // gutter by the fade's width so the first label is not faded.
            "max-lg:-mx-5 max-lg:edge-fade-x max-lg:px-5",
          )}
        >
          {items.map((item) => {
            const id = sectionId(item.href);
            const isActive = id ? id === active : Boolean(item.current);
            const linkClass = cn(
              "group/sub relative flex items-center text-body-s whitespace-nowrap",
              "transition-colors duration-(--duration-fast) focus-visible:outline-none",
              isActive ? "text-ink-50" : "text-ink-300 hover:text-ink-50",
            );
            const content = (
              <>
                <span
                  className={cn(
                    "rounded-xs group-focus-visible/sub:outline-2 group-focus-visible/sub:outline-offset-4",
                    "group-focus-visible/sub:outline-gold-500 group-focus-visible/sub:outline-solid",
                  )}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-0.5 bg-gold-500 transition-opacity duration-(--duration-fast)",
                    isActive ? "opacity-100" : "opacity-0",
                  )}
                />
              </>
            );
            return (
              <li key={item.href} className="flex shrink-0">
                {id ? (
                  <a
                    href={item.href}
                    data-subnav-id={id}
                    aria-current={isActive ? "location" : undefined}
                    onClick={() => setActive(id)}
                    className={linkClass}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={linkClass}
                  >
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
        {action ? <div className="flex shrink-0 items-center">{action}</div> : null}
      </div>
      {progress ? <ScrollProgress className="top-auto -bottom-px" /> : null}
    </nav>
  );
}
