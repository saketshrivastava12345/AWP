import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterChip } from "@/lib/search-params";

/**
 * Every active filter as a chip that removes it — including the ones the
 * search parser read from the query (marked with a magnifier; removing one
 * edits the query) and the free-text words themselves.
 *
 * Chips are links, so removing one is shareable, back-button friendly and
 * works without JavaScript.
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
        {chips.map((chip) => (
          <li key={chip.id}>
            <Link
              href={chip.href}
              scroll={false}
              className={cn(
                "group/chip inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border py-1 pr-2.5 pl-3.5 text-xs sm:min-h-8",
                "transition-colors duration-(--duration-fast)",
                chip.source === "text"
                  ? "border-line bg-transparent text-ink-200 hover:border-ink-500"
                  : "border-gold-800 bg-gold-800/10 text-gold-200 hover:border-gold-600",
              )}
            >
              {chip.source !== "filter" ? (
                <Search
                  className={cn(
                    "size-3 shrink-0",
                    chip.source === "search" ? "text-gold-400" : "text-ink-400",
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <span className="truncate">{chip.label}</span>
              <span className="sr-only">
                {chip.source === "search"
                  ? " (read from your search) — remove"
                  : chip.source === "text"
                    ? " (search words) — remove"
                    : " — remove filter"}
              </span>
              <X
                className="size-3.5 shrink-0 text-ink-400 transition-colors group-hover/chip:text-ink-50"
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
          className="inline-flex min-h-11 items-center px-2 text-xs text-ink-400 underline-offset-4 transition-colors hover:text-gold-300 hover:underline sm:min-h-8"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
