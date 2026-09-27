"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation for the detail page's spec sections.
 *
 * Uses an IntersectionObserver rather than scroll maths so it stays accurate
 * regardless of section height, and every item is a real anchor so the page
 * remains navigable without JavaScript.
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
      <ul className="border-l border-line">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={section.id === activeId ? "true" : undefined}
              className={cn(
                "-ml-px flex min-h-10 items-center border-l-2 py-1.5 pl-4 text-body-s",
                "transition-colors duration-(--duration-fast)",
                section.id === activeId
                  ? "border-gold-500 text-ink-50"
                  : "border-transparent text-ink-400 hover:text-ink-50",
              )}
            >
              {section.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
