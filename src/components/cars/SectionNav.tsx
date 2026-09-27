"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation for the detail page's spec sections.
 *
 * Uses an IntersectionObserver rather than scroll maths so it stays accurate
 * regardless of section height, and every item is a real anchor so the page
 * remains navigable without JavaScript. The active item carries a glowing
 * cyan marker that slides down the rail as the reader scrolls.
 */
export function SectionNav({ sections }: { sections: { id: string; title: string }[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the entry nearest the top of the viewport among those visible.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const first = visible[0];
        if (first) setActiveId(first.target.id);
      },
      // Bias the band toward the upper third so the highlight changes as a
      // heading reaches reading position, not when it leaves the screen.
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav
      aria-label="Technical data"
      className="sticky top-[calc(var(--nav-offset)+var(--subnav-offset)+2rem)]"
    >
      <p aria-hidden="true" className="mb-3 hud-label">
        Index // {String(sections.length).padStart(2, "0")}
      </p>
      <ul className="border-l border-line">
        {sections.map((section, index) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "-ml-px flex min-h-10 items-center gap-3 border-l-2 py-1.5 pl-4 text-body-s",
                  "transition-[color,border-color,box-shadow] duration-(--duration-fast)",
                  active
                    ? "border-cyan-400 text-ink-50 shadow-[inset_2px_0_8px_-4px_var(--color-cyan-400)]"
                    : "border-transparent text-ink-400 hover:text-ink-50",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "font-mono text-[10px] tracking-hud tabular-nums",
                    active ? "text-cyan-300" : "text-ink-600",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
