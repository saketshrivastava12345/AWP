"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useSearchOverlay } from "./SearchProvider";

/**
 * Example queries shown as a starting point. They are phrased the way the
 * rule-based parser in Phase 6 will read them — country, category, comparison
 * and engine terms — so they double as documentation of what it understands.
 */
const EXAMPLE_QUERIES = [
  "german supercars",
  "cars under 500 hp",
  "above 300 km/h",
  "japanese sports cars",
  "electric suv",
  "v8 rwd",
] as const;

/**
 * The global search overlay.
 *
 * Phase 3 builds the shell and the submit path: a query is handed to
 * /cars?q=... Phase 6 adds the rule-based parser that turns that string into
 * filters, plus inline results. Nothing here fabricates results in the
 * meantime.
 */
export function SearchOverlay() {
  const { isOpen } = useSearchOverlay();

  // Mounting the panel only while open means its query state is created fresh
  // each time and discarded on close. Keeping it mounted and clearing the
  // field in an effect would be an extra render pass for the same result.
  if (!isOpen) return null;
  return <SearchPanel />;
}

function SearchPanel() {
  const { close } = useSearchOverlay();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useLockBodyScroll(true);

  useEffect(() => {
    // Focus after paint so the caret lands reliably.
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    close();
    router.push(`/cars?q=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(query);
  };

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        aria-label="Close search"
        onClick={close}
        className="absolute inset-0 bg-void/85 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative mx-auto mt-[12vh] w-full max-w-2xl px-5"
      >
        <form onSubmit={onSubmit} className="edge-light overflow-hidden rounded-lg glass">
          <div className="flex items-center gap-4 px-5 py-4">
            <Search className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="Search cars, manufacturers, countries or parts…"
              aria-label="Search query"
              className={cn(
                "w-full bg-transparent text-base text-ink-50 placeholder:text-ink-500",
                "outline-none",
              )}
            />
            <kbd className="hidden rounded-xs border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 sm:inline">
              ESC
            </kbd>
          </div>

          <div className="border-t border-line-subtle px-5 py-5">
            <p className="mb-4 text-label">Try searching for</p>
            <ul className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    onClick={() => submit(example)}
                    className={cn(
                      "border-line text-ink-300 hover:border-gold-700 hover:text-gold-300",
                      "rounded-xs border px-3 py-1.5 text-xs transition-colors duration-200",
                    )}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {query.trim() ? (
            <button
              type="submit"
              className={cn(
                "flex w-full items-center border-line-subtle text-gold-300 hover:bg-surface-2",
                "justify-between border-t px-5 py-4 text-left text-sm transition-colors",
              )}
            >
              <span>
                Search for <span className="text-ink-50">{query.trim()}</span>
              </span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </form>

        <p className="mt-4 text-center text-xs text-ink-600">
          Press <kbd className="font-mono">⌘K</kbd> or{" "}
          <kbd className="font-mono">Ctrl K</kbd> to open search from anywhere.
        </p>
      </div>
    </div>
  );
}
