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
                  "-mb-px flex min-h-12 items-center gap-2 border-b-2 font-mono text-xs tracking-hud whitespace-nowrap uppercase transition-[color,border-color,box-shadow] duration-(--duration-fast)",
                  active
                    ? "border-cyan-300 text-ink-50 shadow-[0_10px_16px_-12px_oklch(0.83_0.13_210/80%)]"
                    : "border-transparent text-ink-400 hover:text-cyan-200",
                )}
              >
                {link.label}
                {link.count ? (
                  <span
                    className={cn(
                      "rounded-xs border px-1.5 py-px text-[10px] tabular-nums",
                      active
                        ? "border-cyan-700/60 bg-cyan-400/8 text-cyan-200"
                        : "border-line-subtle text-ink-400",
                    )}
                  >
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
