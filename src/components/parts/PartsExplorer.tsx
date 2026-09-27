"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { CategoryChips } from "./CategoryChips";
import { PartCard, type PartCardData } from "./PartCard";
import { matchesQuery } from "./parts-helpers";

export type ExplorerPart = PartCardData & {
  id: string;
  /** Pre-normalised text the filter matches against (see normalizeSearch). */
  search: string;
};

export type ExplorerCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parts: ExplorerPart[];
};

const ALL = "all";

/**
 * The parts explorer: category chips plus an instant text filter over every
 * component, all in the browser on data the page already holds (the page
 * itself stays static). Every word typed must match — "disc carbon" finds the
 * carbon-ceramic disc — and the result count is announced politely.
 */
export function PartsExplorer({ categories }: { categories: ExplorerCategory[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  const inputId = useId();
  const countId = useId();

  const total = useMemo(
    () => categories.reduce((sum, entry) => sum + entry.parts.length, 0),
    [categories],
  );

  // Matches per category for the current text, so each chip shows what it holds.
  const matching = useMemo(
    () =>
      categories.map((entry) => ({
        ...entry,
        parts: entry.parts.filter((part) => matchesQuery(part.search, query)),
      })),
    [categories, query],
  );
  const matchCount = matching.reduce((sum, entry) => sum + entry.parts.length, 0);

  const results = matching.filter(
    (entry) => (category === ALL || entry.slug === category) && entry.parts.length > 0,
  );
  const shown = results.reduce((sum, entry) => sum + entry.parts.length, 0);
  const filtering = query.trim() !== "" || category !== ALL;
  const activeCategory = categories.find((entry) => entry.slug === category);

  // Clearing returns focus to the field, so the keyboard user is not dropped
  // at the top of the document when the button they pressed disappears.
  const focusField = () => document.getElementById(inputId)?.focus();
  const clearQuery = () => {
    setQuery("");
    focusField();
  };
  const reset = () => {
    setQuery("");
    setCategory(ALL);
    focusField();
  };

  return (
    <div>
      <div className="border-y border-line py-5">
        <label htmlFor={inputId} className="text-label">
          Filter components
        </label>
        <div className="relative mt-2 max-w-2xl">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500"
            aria-hidden="true"
          />
          <Input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                setQuery("");
              }
            }}
            placeholder="Name, material or job: “turbo”, “carbon”, “cooling”"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={countId}
            className="pr-12 pl-10 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query ? (
            <IconButton
              label="Clear the filter"
              onClick={clearQuery}
              className="absolute top-0 right-0"
            >
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>

        <CategoryChips
          label="Filter components by category"
          className="mt-4"
          value={category}
          onChange={setCategory}
          options={[
            { value: ALL, label: "All", count: matchCount },
            ...matching.map((entry) => ({
              value: entry.slug,
              label: entry.name,
              count: entry.parts.length,
            })),
          ]}
        />
      </div>

      <div className="mt-6 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p id={countId} className="text-hud" aria-live="polite">
          {filtering
            ? `${shown} of ${total} components match`
            : `${total} components in ${categories.length} categories`}
        </p>
        {filtering ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="mt-8 flex flex-col items-center border border-dashed border-line px-6 py-16 text-center">
          <SearchX
            className="size-6 text-ink-500"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <p className="mt-4 font-display text-xs tracking-button text-ink-100 uppercase">
            No component matches
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-400">
            {query.trim()
              ? `Nothing${activeCategory ? ` in ${activeCategory.name}` : ""} matches “${query.trim()}”. Try a single word, or a broader one.`
              : "This category has no components yet."}
          </p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={reset}>
            Show every component
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-14">
          {results.map((entry) => (
            <section key={entry.id} aria-labelledby={`parts-${entry.slug}`}>
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-3">
                <div className="min-w-0">
                  <h2
                    id={`parts-${entry.slug}`}
                    className="flex items-baseline gap-3 font-display text-sm tracking-hud text-ink-50 uppercase"
                  >
                    {entry.name}
                    <span className="tabular font-mono text-xs text-ink-500">
                      {entry.parts.length}
                    </span>
                  </h2>
                  {!filtering && entry.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-400">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/parts/${entry.slug}`}
                  className="inline-flex min-h-11 shrink-0 items-center text-hud transition-colors duration-(--duration-fast) hover:text-gold-300"
                >
                  {entry.name} overview →
                </Link>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entry.parts.map((part) => (
                  <li key={part.id}>
                    <PartCard part={part} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
