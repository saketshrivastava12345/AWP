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
      <ul className="flex [scrollbar-width:none] gap-x-1 overflow-x-auto md:flex-wrap md:overflow-visible">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center gap-1.5 border-b px-2.5 font-display text-micro tracking-hud whitespace-nowrap uppercase transition-colors",
                  active
                    ? "border-gold-500 text-gold-300"
                    : "border-transparent text-ink-400 hover:text-ink-100",
                )}
              >
                {link.label}
                {link.count ? (
                  <span className="font-mono text-nano tracking-normal text-ink-500">
                    {link.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
