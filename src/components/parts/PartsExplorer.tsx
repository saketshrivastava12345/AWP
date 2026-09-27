"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Search, SearchX, X } from "lucide-react";
import { AnimatedCaretInput } from "@/components/inputs/AnimatedCaretInput";
import { IconButton } from "@/components/ui/IconButton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { cn } from "@/lib/utils";
import { CategoryChips } from "./CategoryChips";
import { PartList, type PartCardData } from "./PartCard";
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
      {/* Sticky bar: the text filter and the category chips, under the navbar. */}
      <div
        className={cn(
          "sticky top-(--nav-offset) z-(--z-sticky) -mx-5 border-b border-line-subtle px-5 py-3 sm:-mx-8 sm:px-8",
          "bg-void/85 backdrop-blur-md backdrop-saturate-150 min-[1440px]:-mx-16 min-[1440px]:px-16 lg:-mx-12 lg:px-12",
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
          <div className="relative w-full shrink-0 lg:w-80">
            <label htmlFor={inputId} className="sr-only">
              Filter components
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden="true"
            />
            {/* The glowing caret glides to the cursor (native caret under
                reduced motion); the field itself is a plain input. */}
            <AnimatedCaretInput
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
              placeholder="Filter by name, material or job"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={countId}
              wrapperClassName="w-full"
              caretClassName="bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]"
              className={cn(
                "h-11 w-full min-w-0 rounded-control border border-line-strong bg-surface-1/80 pr-12 pl-10",
                "text-[15px] text-ink-50 transition-colors duration-(--duration-fast) placeholder:text-ink-500",
                "hover:border-cyan-700 focus-visible:border-cyan-300 focus-visible:shadow-[0_0_0_3px_oklch(0.83_0.13_210/18%),0_0_18px_-4px_oklch(0.8_0.14_210/45%)]",
                "[&::-webkit-search-cancel-button]:appearance-none",
              )}
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
            className="min-w-0 flex-1"
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
      </div>

      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p
          id={countId}
          className="font-mono text-xs tracking-hud text-ink-400 uppercase"
          aria-live="polite"
        >
          <span className="text-cyan-100 glow-text-cyan">
            {filtering ? shown : total}
          </span>{" "}
          {filtering
            ? `of ${total} components match`
            : `components in ${categories.length} categories`}
        </p>
        {filtering ? (
          <Button variant="link" size="sm" arrow={false} onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {results.length === 0 ? (
        <div className="relative mt-8 flex flex-col items-center rounded-card px-6 py-16 text-center hud-panel">
          <span aria-hidden="true" className="hud-brackets -m-px" />
          <SearchX
            className="size-6 text-cyan-300 drop-shadow-[0_0_10px_oklch(0.8_0.14_210/50%)]"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <p className="mt-4 text-h4">No component matches</p>
          <p className="mt-2 max-w-sm text-body-s text-ink-400">
            {query.trim()
              ? `Nothing${activeCategory ? ` in ${activeCategory.name}` : ""} matches “${query.trim()}”. Try a single word, or a broader one.`
              : "This category has no components yet."}
          </p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={reset}>
            Show every component
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-16 lg:space-y-20">
          {results.map((entry) => (
            <section key={entry.id} aria-labelledby={`parts-${entry.slug}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
                <div className="min-w-0">
                  <h2
                    id={`parts-${entry.slug}`}
                    className="flex items-center gap-3 text-h3"
                  >
                    <span
                      aria-hidden="true"
                      className="h-px w-6 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
                    />
                    <ScrambleText text={entry.name} />
                    <span className="font-mono text-xs font-normal tracking-hud text-cyan-200 tabular-nums">
                      {entry.parts.length}
                    </span>
                  </h2>
                  {!filtering && entry.description ? (
                    <p className="mt-2 max-w-[68ch] text-body-s text-ink-400">
                      {entry.description}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/parts/${entry.slug}`}
                  className={buttonClasses("link", "sm")}
                >
                  Category overview
                  <span className="sr-only">: {entry.name}</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-ink-400 transition-[translate,color] duration-(--duration-base) group-hover/button:translate-x-1 group-hover/button:text-ink-50"
                  />
                </Link>
              </div>
              <PartList
                className="mt-5"
                parts={entry.parts.map((part) => ({
                  ...part,
                  systemLabel: null,
                  key: part.id,
                }))}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
