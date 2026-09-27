import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";

export type Suggestion = { label: string; href: string; count: number | null };

/**
 * Zero results. The filters and sort stay on screen above this; here the
 * page offers the quickest ways back — the filters whose removal would show
 * the most cars, with the count each would bring back.
 */
export function NoResults({
  suggestions,
  clearHref,
  hasFilters,
  query,
}: {
  suggestions: readonly Suggestion[];
  clearHref: string;
  hasFilters: boolean;
  query: string | undefined;
}) {
  return (
    <EmptyState
      className="mt-6"
      icon={<SearchX className="size-7" strokeWidth={1.25} aria-hidden="true" />}
      title="No cars match"
      description={
        hasFilters
          ? "No car in the catalogue matches every filter at once. Remove one to widen the search."
          : query
            ? `Nothing in the catalogue matches “${query}”. Try a manufacturer, a model or a phrase like “german supercars”.`
            : "Nothing matches this view."
      }
      action={
        <div className="flex flex-col items-center gap-5">
          {suggestions.length > 0 ? (
            <ul
              className="flex flex-wrap justify-center gap-2"
              aria-label="Filters to remove"
            >
              {suggestions.map((suggestion) => (
                <li key={suggestion.href}>
                  <Link
                    href={suggestion.href}
                    scroll={false}
                    className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-line-strong px-4 text-body-s text-ink-100 transition-colors duration-(--duration-fast) hover:border-ink-400 hover:bg-white/5 hover:text-ink-50"
                  >
                    Remove {suggestion.label}
                    {suggestion.count !== null ? (
                      <span className="tabular text-caption text-ink-400">
                        {formatNumber(suggestion.count)}{" "}
                        {suggestion.count === 1 ? "car" : "cars"}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {hasFilters || query ? (
            <ButtonLink href={clearHref} variant="secondary" size="md" scroll={false}>
              {hasFilters ? "Clear all filters" : "Show every car"}
            </ButtonLink>
          ) : null}
        </div>
      }
    />
  );
}
