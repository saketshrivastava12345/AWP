import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterChip } from "@/lib/search-params";

/**
 * Every active filter as a HUD chip that removes it — including the ones
 * the search parser read from the query (marked with a magnifier; removing
 * one edits the query) and the free-text words themselves.
 *
 * Chips are links, so removing one is shareable, back-button friendly and
 * works without JavaScript. They rise into place one after another when the
 * list renders (a CSS animation with `backwards` fill, so nothing is hidden
 * without JavaScript).
 */
export function ActiveFilters({
  chips,
  clearHref,
  className,
}: {
  chips: readonly FilterChip[];
  clearHref: string;
  className?: string;
}) {
  if (chips.length === 0) return null;
  const filterCount = chips.filter((chip) => chip.source !== "text").length;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <h3 className="sr-only">Active filters</h3>
      <ul className="contents">
        {chips.map((chip, index) => (
          <li
            key={chip.id}
            className="animate-rise-in"
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          >
            <Link
              href={chip.href}
              scroll={false}
              className={cn(
                // 36px drawn, 44px to touch.
                "group/chip relative inline-flex h-9 max-w-full items-center gap-2 rounded-xs border py-1 pr-2.5 pl-3",
                "font-mono text-[11px] tracking-hud text-cyan-100 uppercase",
                "border-cyan-400/40 bg-cyan-400/8",
                "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                "transition-[border-color,background-color,box-shadow,color] duration-(--duration-fast) ease-standard",
                "hover:border-cyan-300 hover:bg-cyan-400/14 hover:text-ink-50 hover:shadow-[0_0_16px_-4px_oklch(0.8_0.14_210/60%)]",
              )}
            >
              {chip.source !== "filter" ? (
                <Search className="size-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-cyan-300 shadow-[0_0_6px_var(--color-cyan-400)]"
                />
              )}
              <span className="truncate">{chip.label}</span>
              <span className="sr-only">
                {chip.source === "search"
                  ? " (read from your search) — remove"
                  : chip.source === "text"
                    ? " (search words) — remove"
                    : " — remove filter"}
              </span>
              <X
                className="size-3.5 shrink-0 text-cyan-300/70 transition-colors group-hover/chip:text-ink-50"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
      {filterCount > 0 ? (
        <Link
          href={clearHref}
          scroll={false}
          className="fx-link inline-flex min-h-11 items-center px-2 font-mono text-[11px] tracking-hud text-ink-200 uppercase transition-colors hover:text-cyan-100"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
