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
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );

    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length === 0) return null;

  return (
    <nav aria-label="Specifications" className="sticky top-24">
      <p className="mb-4 text-label">Specifications</p>
      <ul className="space-y-px border-l border-line">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={section.id === activeId ? "true" : undefined}
              className={cn(
                "-ml-px block border-l py-2 pl-4 text-xs transition-colors duration-200",
                section.id === activeId
                  ? "border-gold-500 text-gold-300"
                  : "border-transparent text-ink-400 hover:text-ink-100",
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
