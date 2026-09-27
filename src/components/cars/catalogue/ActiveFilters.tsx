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
                // 36px drawn, 44px to touch.
                "group/chip relative inline-flex h-9 max-w-full items-center gap-2 rounded-pill border border-line-strong py-1 pr-3 pl-3.5 text-body-s text-ink-100",
                "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
                "transition-colors duration-(--duration-fast) ease-standard hover:border-ink-400 hover:bg-white/5 hover:text-ink-50",
              )}
            >
              {chip.source !== "filter" ? (
                <Search className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
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
                className="size-4 shrink-0 text-ink-400 transition-colors group-hover/chip:text-ink-50"
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
          className="inline-flex min-h-11 items-center px-2 text-body-s text-ink-200 underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-50 hover:decoration-ink-400"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
