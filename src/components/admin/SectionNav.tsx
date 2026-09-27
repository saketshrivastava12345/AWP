"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionLink = { href: string; label: string; count?: number | null };

/**
 * Tabs for an editor's sections, as real links (each section is its own URL,
 * so it can be bookmarked, opened in a new tab and works without JS).
 */
export function SectionNav({ links, label }: { links: SectionLink[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mt-5 -mb-6">
      <ul className="no-scrollbar flex gap-x-6 overflow-x-auto md:flex-wrap md:overflow-visible">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-12 items-center gap-1.5 border-b-2 text-body-s whitespace-nowrap transition-colors duration-(--duration-fast)",
                  active
                    ? "border-gold-500 text-ink-50"
                    : "border-transparent text-ink-300 hover:text-ink-50",
                )}
              >
                {link.label}
                {link.count ? (
                  <span className="text-caption tabular-nums">{link.count}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
