"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  ArrowRight,
  ArrowUpLeft,
  Car,
  CircleAlert,
  Clock,
  Cog,
  CornerDownLeft,
  Earth,
  Factory,
  Search,
  Sparkles,
  Trash,
  X,
} from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import { cn } from "@/lib/utils";
import type { SearchResult, SearchResultKind } from "@/types/domain";
import { useSearchOverlay } from "./SearchProvider";
import styles from "./chrome.module.css";
import {
  KIND_LABELS,
  MAX_QUERY_LENGTH,
  RECENT_SEARCHES_KEY,
  addRecentSearch,
  buildIdleSections,
  buildResultSections,
  flattenSections,
  highlightRanges,
  parseRecentSearches,
  resultPresentation,
  splitByRanges,
  stepIndex,
  type PaletteOption,
  type PaletteSection,
} from "./palette-model";

/** Wait this long after the last keystroke before asking the server. */
const DEBOUNCE_MS = 140;

/**
 * Answers already fetched this session, so backspacing or reopening the
 * palette is instant. Results are public catalogue data and the API already
 * allows a minute of HTTP caching, so a small in-memory copy is safe.
 */
const responseCache = new Map<string, SearchResult[]>();
const CACHE_LIMIT = 60;

function remember(query: string, results: SearchResult[]) {
  responseCache.delete(query);
  responseCache.set(query, results);
  if (responseCache.size > CACHE_LIMIT) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
}

const KINDS = new Set<SearchResultKind>(["car", "manufacturer", "country", "part"]);

/** Only same-origin paths are followed; the API is trusted, but not blindly. */
function isInternalHref(href: unknown): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

function readResults(body: unknown): SearchResult[] {
  if (typeof body !== "object" || body === null || !("results" in body)) return [];
  const { results } = body as { results: unknown };
  if (!Array.isArray(results)) return [];
  return results.flatMap((item: unknown): SearchResult[] => {
    if (typeof item !== "object" || item === null) return [];
    const row = item as Record<string, unknown>;
    if (
      !KINDS.has(row.kind as SearchResultKind) ||
      typeof row.id !== "string" ||
      typeof row.title !== "string" ||
      !isInternalHref(row.href)
    ) {
      return [];
    }
    return [
      {
        kind: row.kind as SearchResultKind,
        id: row.id,
        title: row.title,
        subtitle: typeof row.subtitle === "string" ? row.subtitle : null,
        href: row.href,
        imageUrl: typeof row.imageUrl === "string" ? row.imageUrl : null,
        score: typeof row.score === "number" ? row.score : 0,
      },
    ];
  });
}

function readRecent(): string[] {
  try {
    return parseRecentSearches(window.localStorage.getItem(RECENT_SEARCHES_KEY));
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    if (list.length === 0) window.localStorage.removeItem(RECENT_SEARCHES_KEY);
    else window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: history is a convenience, not a requirement.
  }
}

/**
 * Remote thumbnails go through the image optimiser only when next.config
 * allows their host (Supabase Storage); anything else is shown as-is rather
 * than throwing a configuration error mid-search.
 */
const OPTIMISABLE_REMOTE = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return { origin: url.origin, path: "/storage/v1/object/public/" };
  } catch {
    return null;
  }
})();

function canOptimise(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  if (!OPTIMISABLE_REMOTE) return false;
  try {
    const url = new URL(src);
    return (
      url.origin === OPTIMISABLE_REMOTE.origin &&
      url.pathname.startsWith(OPTIMISABLE_REMOTE.path)
    );
  } catch {
    return false;
  }
}

type SearchResponse = { query: string; results: SearchResult[]; failed: boolean };

/**
 * The command palette: Ctrl/⌘K or "/" from anywhere.
 *
 * A WAI-ARIA combobox — focus never leaves the text field; the arrow keys move
 * a highlighted option (aria-activedescendant) through a grouped listbox, and
 * Enter opens it. It sits on the Dialog "palette" layer, above every sheet and
 * menu, so it can never open behind one.
 */
export function CommandPalette() {
  const { isOpen, close } = useSearchOverlay();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={isOpen}
      onClose={close}
      title="Search AURIX"
      description="Search cars, manufacturers, countries and parts. Use the arrow keys to move through the suggestions and Enter to open one."
      hideTitle
      placement="center"
      size="lg"
      layer="palette"
      initialFocusRef={inputRef}
      className={cn(
        "top-2 max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] overflow-hidden rounded-card",
        "border-cyan-400/30 bg-surface-1/92 backdrop-blur-xl",
        "sm:top-[12vh] sm:max-h-[min(40rem,calc(100dvh-16vh))] sm:w-[calc(100%-2rem)]",
      )}
      bodyClassName="flex flex-col overflow-hidden p-0 sm:p-0"
    >
      {/* Mounted only while open, so the query and highlight start fresh
          each time rather than being cleared in an effect. */}
      <PalettePanel inputRef={inputRef} onClose={close} />
    </Dialog>
  );
}

function PalettePanel({
  inputRef,
  onClose,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const router = useRouter();
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeFor, setActiveFor] = useState("");
  const requestSeq = useRef(0);

  const trimmed = query.trim();

  // A new query starts with the first suggestion highlighted. Adjusting state
  // during render (rather than in an effect) avoids painting a stale
  // highlight for a frame.
  if (activeFor !== trimmed) {
    setActiveFor(trimmed);
    setActiveKey(null);
  }

  // --------------------------------------------------------------- fetching
  useEffect(() => {
    if (!trimmed) return;

    const controller = new AbortController();
    const seq = ++requestSeq.current;
    const cached = responseCache.get(trimmed);

    const timer = window.setTimeout(
      async () => {
        if (cached) {
          setResponse({ query: trimmed, results: cached, failed: false });
          return;
        }
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
            signal: controller.signal,
            headers: { accept: "application/json" },
          });
          if (!res.ok) throw new Error(`Search responded ${res.status}`);
          const results = readResults(await res.json());
          remember(trimmed, results);
          // A slower, older request must never overwrite a newer answer.
          if (seq === requestSeq.current) {
            setResponse({ query: trimmed, results, failed: false });
          }
        } catch (error) {
          if (controller.signal.aborted) return;
          console.error("Palette search failed:", error);
          if (seq === requestSeq.current) {
            setResponse({ query: trimmed, results: [], failed: true });
          }
        }
      },
      cached ? 0 : DEBOUNCE_MS,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const settled = trimmed !== "" && response?.query === trimmed;
  const pending = trimmed !== "" && !settled;
  // While a new answer is on its way the previous results stay on screen
  // (dimmed) instead of the list collapsing on every keystroke.
  const shownResults = useMemo(
    () => (trimmed && response ? response.results : []),
    [trimmed, response],
  );
  const failed = settled && response.failed;
  const noMatches = settled && !response.failed && response.results.length === 0;

  const sections: PaletteSection[] = useMemo(
    () =>
      trimmed ? buildResultSections(trimmed, shownResults) : buildIdleSections(recent),
    [trimmed, shownResults, recent],
  );
  const options = useMemo(() => flattenSections(sections), [sections]);
  const indexByKey = useMemo(
    () => new Map(options.map((option, index) => [option.key, index])),
    [options],
  );
  const activeIndex =
    options.length === 0 ? -1 : activeKey === null ? 0 : (indexByKey.get(activeKey) ?? 0);
  const active = activeIndex >= 0 ? options[activeIndex] : undefined;

  // Keep the highlighted option in view as the arrow keys move it.
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`${baseId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, baseId]);

  // ------------------------------------------------------------- activation
  const commitRecent = useCallback(
    (value: string) => {
      const next = addRecentSearch(recent, value);
      setRecent(next);
      writeRecent(next);
    },
    [recent],
  );

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const activate = (option: PaletteOption) => {
    switch (option.type) {
      case "recent":
        setQuery(option.query);
        inputRef.current?.focus();
        return;
      case "clear-recent":
        setRecent([]);
        writeRecent([]);
        inputRef.current?.focus();
        return;
      case "result":
        commitRecent(trimmed);
        go(option.result.href);
        return;
      case "search-all":
        commitRecent(option.query);
        go(option.href);
        return;
      case "example":
        commitRecent(option.query);
        go(option.href);
        return;
    }
  };

  /** Plain clicks on link options: Link navigates, we record and close. */
  const onLinkClick = (event: MouseEvent<HTMLAnchorElement>, option: PaletteOption) => {
    const recorded =
      option.type === "result" ? trimmed : "query" in option ? option.query : "";
    if (recorded) commitRecent(recorded);
    // Opening in a new tab or window keeps the palette where it was.
    const newContext =
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0;
    if (!newContext) onClose();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const first = options[0];
    const last = options[options.length - 1];

    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        const next =
          options[
            stepIndex(activeIndex, event.key === "ArrowDown" ? 1 : -1, options.length)
          ];
        if (next) setActiveKey(next.key);
        return;
      }
      case "Home":
      case "End":
        // Shift+Home/End still selects text in the field.
        if (event.shiftKey || !first || !last) return;
        event.preventDefault();
        setActiveKey(event.key === "Home" ? first.key : last.key);
        return;
      case "Enter": {
        if (!active) return;
        event.preventDefault();
        // Enter pressed before this query's results arrived, with nothing
        // chosen deliberately: the highlighted row belongs to the previous
        // query, so run the full search instead of opening a stale hit.
        if (pending && activeKey === null && active.type === "result") {
          const searchAll = options.find((option) => option.type === "search-all");
          if (searchAll) activate(searchAll);
          return;
        }
        activate(active);
        return;
      }
    }
  };

  // ----------------------------------------------------------------- status
  const resultCount = settled ? response.results.length : 0;
  const status = !trimmed
    ? ""
    : pending
      ? ""
      : failed
        ? "Live suggestions are unavailable. Press Enter to search all cars."
        : resultCount === 0
          ? `No direct matches for ${trimmed}. Press Enter to search all cars.`
          : `${resultCount} ${resultCount === 1 ? "suggestion" : "suggestions"}.`;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* HUD corner brackets on the panel. */}
      <span aria-hidden="true" className="hud-brackets z-10 [--hud-l:14px]" />
      {/* ---- query row ---- */}
      <div className="relative flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 transition-colors duration-(--duration-fast) focus-within:border-cyan-400/40 sm:h-16 sm:px-5">
        <Search
          className="size-[18px] shrink-0 text-cyan-300 drop-shadow-[0_0_6px_var(--color-cyan-400)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value.slice(0, MAX_QUERY_LENGTH))}
          onKeyDown={onKeyDown}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          role="combobox"
          aria-label="Search the catalogue"
          aria-expanded={options.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={active ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="Cars, brands, countries, parts…"
          className={cn(
            "h-full min-w-0 flex-1 bg-transparent text-base text-ink-50 caret-cyan-300",
            "placeholder:text-ink-500 focus:outline-none sm:text-[17px]",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="grid size-11 shrink-0 place-items-center rounded-pill text-ink-400 transition-colors duration-(--duration-fast) hover:bg-white/6 hover:text-ink-50"
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
        {/* "Cancel" on touch screens (two identical crosses side by side
            would be ambiguous), the Esc key it stands for elsewhere. */}
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 grid h-11 shrink-0 place-items-center rounded-control px-2 text-[15px] text-ink-200 transition-colors duration-(--duration-fast) hover:bg-white/6 hover:text-ink-50"
          aria-label="Close search"
        >
          <span aria-hidden="true" className="sm:hidden">
            Cancel
          </span>
          <Kbd className="hidden sm:inline-flex">Esc</Kbd>
        </button>

        {/* Searching: a sweep along the bottom hairline. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden transition-opacity duration-(--duration-fast)",
            pending ? "opacity-100" : "opacity-0",
          )}
        >
          <span
            className={cn(
              "block h-full bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]",
              styles.sweep,
            )}
          />
        </span>
      </div>

      <p id={`${baseId}-status`} role="status" className="sr-only">
        {status}
      </p>

      {/* ---- suggestions ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {noMatches || failed ? (
          <div className="flex items-start gap-3 px-5 pt-5 pb-1 sm:px-6">
            <CircleAlert
              className={cn(
                "mt-0.5 size-4 shrink-0",
                failed ? "text-signal-negative" : "text-ink-400",
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-body-s text-ink-100">
                {failed
                  ? "Live suggestions are unavailable right now."
                  : `Nothing in the catalogue is called “${trimmed}”.`}
              </p>
              <p className="mt-1 text-caption">
                The full search still works — it also understands descriptions such as
                “electric suv” or “under 500 hp”.
              </p>
            </div>
          </div>
        ) : null}

        <div
          id={listboxId}
          role="listbox"
          aria-label={trimmed ? `Suggestions for ${trimmed}` : "Suggestions"}
          aria-busy={pending || undefined}
          className={cn(
            "px-2 pt-1 pb-2 transition-opacity duration-(--duration-fast)",
            pending && shownResults.length > 0 && "opacity-60",
          )}
        >
          {pending && shownResults.length === 0 ? <LoadingRows /> : null}

          {sections.map((section) => {
            const labelId = `${baseId}-group-${section.id}`;
            return (
              <div
                key={section.id}
                role="group"
                aria-labelledby={labelId}
                className="pt-2"
              >
                <div
                  role="presentation"
                  id={labelId}
                  className="flex items-center gap-2 px-3 pt-1 pb-2 font-mono text-[11px] tracking-[0.18em] text-cyan-300/80 uppercase"
                >
                  <SectionIcon id={section.id} />
                  {section.label}
                </div>

                {section.id === "examples" ? (
                  <div className="flex flex-wrap gap-2 px-3 pb-2">
                    {section.options.map((option) => {
                      const index = indexByKey.get(option.key) ?? -1;
                      if (option.type !== "example") return null;
                      return (
                        <Link
                          key={option.key}
                          id={optionId(index)}
                          href={option.href}
                          prefetch={false}
                          role="option"
                          aria-selected={index === activeIndex}
                          tabIndex={-1}
                          onClick={(event) => onLinkClick(event, option)}
                          onPointerMove={() => setActiveKey(option.key)}
                          className={cn(
                            "inline-flex min-h-9 items-center rounded-pill border px-3.5 text-sm transition-colors duration-(--duration-fast)",
                            index === activeIndex
                              ? "border-gold-500 bg-surface-3 text-ink-50"
                              : "border-line-strong text-ink-200",
                          )}
                        >
                          {option.query}
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {section.options.map((option) => {
                      const index = indexByKey.get(option.key) ?? -1;
                      return (
                        <OptionRow
                          key={option.key}
                          id={optionId(index)}
                          option={option}
                          query={trimmed}
                          active={index === activeIndex}
                          onHover={() => setActiveKey(option.key)}
                          onActivate={() => activate(option)}
                          onLinkClick={(event) => onLinkClick(event, option)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- keyboard legend ---- */}
      <div className="hidden h-11 shrink-0 items-center justify-between gap-4 border-t border-line-subtle px-5 sm:flex">
        <p className="flex items-center gap-4 text-caption">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            Move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd>
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd>
            Close
          </span>
        </p>
        <p className="flex items-center gap-1.5 text-caption">
          <Sparkles className="size-3.5 text-ink-400" aria-hidden="true" />
          Plain-language search
        </p>
      </div>
    </div>
  );
}

function SectionIcon({ id }: { id: string }) {
  const className = "size-3.5 text-ink-400";
  switch (id) {
    case "car":
      return <Car className={className} aria-hidden="true" />;
    case "manufacturer":
      return <Factory className={className} aria-hidden="true" />;
    case "country":
      return <Earth className={className} aria-hidden="true" />;
    case "part":
      return <Cog className={className} aria-hidden="true" />;
    case "recent":
      return <Clock className={className} aria-hidden="true" />;
    case "examples":
      return <Sparkles className={className} aria-hidden="true" />;
    default:
      return <Search className={className} aria-hidden="true" />;
  }
}

const ROW =
  "group/opt flex min-h-12 w-full items-center gap-3 rounded-control px-3 py-2 text-left " +
  "transition-colors duration-(--duration-fast)";

function OptionRow({
  id,
  option,
  query,
  active,
  onHover,
  onActivate,
  onLinkClick,
}: {
  id: string;
  option: PaletteOption;
  query: string;
  active: boolean;
  onHover: () => void;
  onActivate: () => void;
  onLinkClick: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const rowClass = cn(
    ROW,
    active
      ? "bg-cyan-400/8 shadow-[inset_2px_0_0_var(--color-cyan-300),inset_0_0_0_1px_oklch(0.83_0.13_210/18%)]"
      : "bg-transparent",
  );
  const common = {
    id,
    role: "option" as const,
    "aria-selected": active,
    tabIndex: -1,
    // pointermove rather than pointerenter: a list scrolling under a resting
    // pointer must not steal the keyboard highlight.
    onPointerMove: onHover,
  };

  switch (option.type) {
    case "result": {
      const { result } = option;
      const { subtitle, flag } = resultPresentation(result);
      return (
        <Link
          {...common}
          href={result.href}
          prefetch={false}
          onClick={onLinkClick}
          className={cn(rowClass, "min-h-16")}
        >
          <ResultTile result={result} flag={flag} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-ink-50">
              <Highlighted text={result.title} query={query} />
            </span>
            <span className="mt-0.5 block truncate text-caption">
              {subtitle ? (
                <Highlighted text={subtitle} query={query} />
              ) : (
                KIND_LABELS[result.kind].item
              )}
            </span>
          </span>
          <EnterHint active={active} />
        </Link>
      );
    }

    case "search-all":
      return (
        <Link
          {...common}
          href={option.href}
          prefetch={false}
          onClick={onLinkClick}
          className={cn(rowClass, "min-h-16")}
        >
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-3 text-ink-50"
          >
            <ArrowRight className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-ink-50">
              Search all cars for <span className="font-medium">“{option.query}”</span>
            </span>
            {option.understood.length > 0 ? (
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-caption">Understood as</span>
                {option.understood.map((label) => (
                  <span
                    key={label}
                    className="rounded-pill border border-line-strong px-2 py-0.5 text-xs text-ink-200"
                  >
                    {label}
                  </span>
                ))}
              </span>
            ) : (
              <span className="mt-0.5 block truncate text-caption">
                Full catalogue search with filters
              </span>
            )}
          </span>
          <EnterHint active={active} />
        </Link>
      );

    case "recent":
      return (
        <div {...common} onClick={onActivate} className={cn(rowClass, "cursor-pointer")}>
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center text-ink-400"
          >
            <Clock className="size-4" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] text-ink-200">
            {option.query}
          </span>
          <ArrowUpLeft
            className={cn(
              "size-4 shrink-0 transition-opacity",
              active ? "text-cyan-300 opacity-100" : "opacity-0",
            )}
            aria-hidden="true"
          />
        </div>
      );

    case "clear-recent":
      return (
        <div
          {...common}
          onClick={onActivate}
          className={cn(rowClass, "min-h-10 cursor-pointer py-1.5")}
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center text-ink-400"
          >
            <Trash className="size-3.5" />
          </span>
          <span className="flex-1 text-caption">Clear recent searches</span>
        </div>
      );

    case "example":
      // Examples render as chips in their own section.
      return null;
  }
}

function EnterHint({ active }: { active: boolean }) {
  return (
    <CornerDownLeft
      className={cn(
        "hidden size-4 shrink-0 transition-opacity duration-(--duration-fast) sm:block",
        active ? "text-cyan-300 opacity-100" : "opacity-0",
      )}
      aria-hidden="true"
    />
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  const parts = splitByRanges(text, highlightRanges(text, query));
  return (
    <>
      {parts.map((part, index) =>
        part.match ? (
          <mark key={index} className="bg-transparent font-semibold text-inherit">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

const TILE =
  "relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface-2";

function ResultTile({ result, flag }: { result: SearchResult; flag: string | null }) {
  switch (result.kind) {
    case "car":
      return result.imageUrl ? (
        <CarThumb key={result.imageUrl} src={result.imageUrl} />
      ) : (
        <span aria-hidden="true" className={TILE}>
          <Silhouette />
        </span>
      );
    case "manufacturer":
      return (
        <span aria-hidden="true" className={TILE}>
          <span className="font-display text-lg text-ink-200">
            {result.title.trim().charAt(0).toUpperCase()}
          </span>
        </span>
      );
    case "country":
      return (
        <span aria-hidden="true" className={TILE}>
          {flag ? (
            <span className="text-2xl leading-none">{flag}</span>
          ) : (
            <Earth className="size-4 text-ink-400" />
          )}
        </span>
      );
    case "part":
      return (
        <span aria-hidden="true" className={TILE}>
          <Cog className="size-4 text-ink-400" />
        </span>
      );
  }
}

/** A car photograph, falling back to the silhouette if the file is missing. */
function CarThumb({ src }: { src: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span aria-hidden="true" className={TILE}>
        <Silhouette />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={TILE}>
      <Image
        src={src}
        alt=""
        width={48}
        height={48}
        sizes="48px"
        unoptimized={!canOptimise(src)}
        onError={() => setBroken(true)}
        className="size-full object-cover"
      />
    </span>
  );
}

/** A generic coupé profile: a placeholder, not a likeness of the car. */
function Silhouette(): ReactNode {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-9 text-ink-500"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 29.5c0-2 1.2-3.3 3.4-3.8l7-1.5 5.6-4.3c1.3-1 2.9-1.5 4.6-1.5h5.2c1.7 0 3.3.6 4.6 1.7l3.7 3.2 3.2.7c1.9.4 3.2 2 3.2 3.9v2.6c0 .8-.6 1.4-1.4 1.4H6.4c-.8 0-1.4-.6-1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="14.5" cy="31.5" r="3.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="35" cy="31.5" r="3.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function LoadingRows() {
  return (
    <div className="pt-2" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex min-h-16 items-center gap-3 px-3 py-2">
          <span className="size-12 shrink-0 animate-pulse rounded-control bg-surface-3" />
          <span className="flex-1 space-y-2">
            <span className="block h-3 w-2/5 animate-pulse rounded-xs bg-surface-3" />
            <span className="block h-2.5 w-1/4 animate-pulse rounded-xs bg-surface-2" />
          </span>
        </div>
      ))}
    </div>
  );
}
