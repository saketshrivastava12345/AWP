"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react";
import { LoaderCircle, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/Button";
import { AnimatedCaretInput } from "@/components/inputs/AnimatedCaretInput";
import { formatNumber } from "@/lib/format";
import { MAX_COMPARE, parseCompareSlug, withCar } from "@/lib/compare-slug";
import { shortCarName } from "@/lib/compare-rows";
import {
  powertrainKind,
  type BodyType,
  type FuelType,
  type SearchResult,
} from "@/types/domain";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { CarThumb } from "./CarThumb";
import { useCompareState } from "./CompareState";
import { searchOptions, suggestFor } from "./picker-logic";

/** One choice in the list, whether it came from the catalogue or /api/search. */
type Item = {
  slug: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  bodyType: BodyType | null;
  fuelType: FuelType | null;
  powerHp: number | null;
  flag: string | null;
};

type Section = { id: string; title: string | null; items: Item[] };
type IndexedSection = Section & { offset: number };

const RESULT_LIMIT = 40;
const BROWSE_LIMIT = 60;

function toItem(option: ComparePickerOption): Item {
  return {
    slug: option.slug,
    title: `${option.manufacturer} ${shortCarName(option.model, option.variant)}`,
    subtitle:
      [option.category, option.generation, option.yearStart]
        .filter((part) => part !== null && part !== "")
        .join(" · ") || null,
    imageUrl: option.imageUrl,
    bodyType: option.bodyType,
    fuelType: option.fuelType,
    powerHp: option.powerHp,
    flag: option.flag,
  };
}

/** A /api/search car hit, as an item. Null when its address is not a car path. */
function fromSearchResult(result: SearchResult): Item | null {
  if (result.kind !== "car") return null;
  const parts = parseCompareSlug(result.href);
  if (!parts) return null;
  return {
    slug: `${parts.manufacturer}/${parts.model}/${parts.variant}`,
    title: result.title,
    subtitle: result.subtitle,
    imageUrl: result.imageUrl,
    bodyType: null,
    fuelType: null,
    powerHp: null,
    flag: null,
  };
}

/**
 * Search-as-you-type picker for the comparison, built as an ARIA 1.2
 * combobox: the input owns a listbox popup, arrow keys move the active
 * option (announced through aria-activedescendant), Enter adds it, Escape
 * closes the list and then clears the field.
 *
 * It searches the catalogue the server already sent, so results are instant
 * and tolerate a typo. With nothing typed it offers suggestions derived from
 * the first car: the same category, the same maker, similar published power.
 * When the catalogue was too large to send whole, each query is also run
 * against /api/search.
 */
export function CompareCombobox({
  options,
  truncated,
  anchor,
  variant,
  label,
  hideLabel = false,
  autoFocus = false,
  className,
}: {
  options: ComparePickerOption[];
  truncated: boolean;
  /** The car suggestions are relative to — usually the first in the comparison. */
  anchor: ComparePickerOption | null;
  variant: "hero" | "compact";
  label: string;
  /** Keep the label for assistive technology only (a visible heading names the picker). */
  hideLabel?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { selected, diff } = useCompareState();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<{ query: string; items: Item[] } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;
  const hintId = `${id}-hint`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const full = selected.length >= MAX_COMPARE;
  const term = query.trim();

  const sections = useMemo<Section[]>(() => {
    const taken = new Set(selected);
    const available = options.filter((option) => !taken.has(option.slug));

    if (term) {
      const local = searchOptions(available, term, RESULT_LIMIT).map(toItem);
      const extra =
        remote && remote.query === term
          ? remote.items.filter(
              (item) =>
                !taken.has(item.slug) && !local.some((hit) => hit.slug === item.slug),
            )
          : [];
      return [{ id: "results", title: null, items: [...local, ...extra] }];
    }

    const groups: Section[] = anchor
      ? suggestFor(anchor, options, taken).map((group) => ({
          id: group.id,
          title: group.title,
          items: group.options.map(toItem),
        }))
      : [];
    const shown = new Set(
      groups.flatMap((group) => group.items.map((item) => item.slug)),
    );
    const rest = available
      .filter((option) => !shown.has(option.slug))
      .slice(0, BROWSE_LIMIT);
    if (rest.length > 0) {
      groups.push({
        id: "all",
        title: groups.length > 0 ? "All cars" : null,
        items: rest.map(toItem),
      });
    }
    return groups;
  }, [anchor, options, remote, selected, term]);

  const items = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  // Browsing with nothing typed lists at most BROWSE_LIMIT cars; say so.
  const unlisted = term
    ? 0
    : options.filter((option) => !selected.includes(option.slug)).length - items.length;
  // Each section's first option index, so every option has a stable id.
  const indexed = useMemo<IndexedSection[]>(
    () =>
      sections.map((section, index) => ({
        ...section,
        offset: sections
          .slice(0, index)
          .reduce((total, previous) => total + previous.items.length, 0),
      })),
    [sections],
  );
  const activeIndex = items.length === 0 ? -1 : Math.min(active, items.length - 1);
  const expanded = open && !full;
  const activeId = expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined;

  // Keep the active option in view while moving through a long list.
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  // Cancel any pending remote search when the picker goes away.
  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  function searchRemotely(value: string) {
    if (!truncated) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    const q = value.trim();
    if (q.length < 2) return;
    debounceRef.current = window.setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((body: { results?: SearchResult[] }) => {
          const hits = (body.results ?? [])
            .map(fromSearchResult)
            .filter((item): item is Item => item !== null);
          setRemote({ query: q, items: hits });
        })
        .catch(() => {
          // Aborted or offline: the local results are still shown.
        });
    }, 200);
  }

  function choose(item: Item) {
    if (full) return;
    setQuery("");
    setOpen(false);
    setActive(0);
    startTransition(() => {
      router.push(withCar(selected, item.slug, { diff }), { scroll: false });
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(0);
        } else if (items.length > 0) {
          setActive((activeIndex + 1) % items.length);
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(Math.max(0, items.length - 1));
        } else if (items.length > 0) {
          setActive((activeIndex - 1 + items.length) % items.length);
        }
        break;
      case "Enter": {
        const item = activeIndex >= 0 ? items[activeIndex] : undefined;
        if (expanded && item) {
          event.preventDefault();
          choose(item);
        }
        break;
      }
      case "Escape":
        if (open) {
          event.preventDefault();
          setOpen(false);
        } else if (query) {
          event.preventDefault();
          setQuery("");
        }
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  const hero = variant === "hero";

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <label
        htmlFor={inputId}
        className={cn(
          "mb-2 block text-body-s text-ink-200",
          hideLabel && !full && "sr-only",
        )}
      >
        {full ? `${MAX_COMPARE} of ${MAX_COMPARE} cars selected` : label}
      </label>

      <div
        className={cn(
          "flex items-center gap-3 rounded-control border bg-surface-1 transition-colors duration-(--duration-fast)",
          // The field's focus indicator (the input itself draws no outline).
          "focus-within:border-cyan-400 focus-within:glow-cyan",
          expanded ? "border-cyan-400/70" : "border-line-strong hover:border-ink-500",
          hero ? "h-14 pr-2 pl-5" : "h-12 px-4",
          full && "opacity-60",
        )}
      >
        {isPending ? (
          <LoaderCircle
            className="size-[18px] shrink-0 animate-spin text-ink-300"
            aria-hidden="true"
          />
        ) : (
          <Search className="size-[18px] shrink-0 text-ink-400" aria-hidden="true" />
        )}
        <AnimatedCaretInput
          wrapperClassName="h-full min-w-0 flex-1"
          caretClassName="bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]"
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-describedby={hintId}
          aria-busy={isPending || undefined}
          autoComplete="off"
          spellCheck={false}
          disabled={full}
          value={query}
          placeholder={
            full
              ? "Remove a car to add another"
              : hero
                ? "Search make or model…"
                : "Add a car…"
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
            searchRemotely(event.target.value);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-full w-full min-w-0 bg-transparent text-ink-50 outline-none placeholder:text-ink-400",
            "disabled:cursor-not-allowed",
            hero ? "text-base" : "text-[15px]",
          )}
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-pill text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-50",
              !hero && "-mr-2",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : hero && !full ? (
          // The pointer route into the list; keyboard users open it with the
          // arrow keys, so (as the APG combobox pattern allows) it is not a
          // second tab stop.
          <button
            type="button"
            tabIndex={-1}
            aria-label="Browse the catalogue"
            aria-controls={listboxId}
            aria-expanded={expanded}
            onClick={() => {
              inputRef.current?.focus();
              setOpen(true);
              setActive(0);
            }}
            className={buttonClasses("primary", "sm", "shrink-0")}
          >
            Browse
          </button>
        ) : null}
      </div>
      <p id={hintId} className="sr-only">
        {full
          ? `The comparison is full at ${MAX_COMPARE} cars. Remove one to add another.`
          : "Type to search. Use the up and down arrows to choose a car and Enter to add it."}
      </p>

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Cars to add"
        hidden={!expanded}
        className={cn(
          "absolute inset-x-0 top-full z-(--z-overlay) mt-2 max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain",
          "rounded-card border border-line bg-surface-1 shadow-overlay",
        )}
      >
        {items.length === 0 ? (
          <li role="presentation" className="px-4 py-6 text-body-s text-ink-300">
            {term
              ? `No cars match “${term}”.`
              : "Every catalogued car is already selected."}
          </li>
        ) : (
          indexed.map((section) => (
            <li key={section.id} role="presentation">
              <ul
                role="group"
                aria-label={section.title ?? "Cars"}
                className="border-b border-line-subtle last:border-b-0"
              >
                {section.title ? (
                  <li
                    role="presentation"
                    className="sticky top-0 z-10 bg-surface-2 px-4 py-2 text-caption"
                  >
                    {section.title}
                  </li>
                ) : null}
                {section.items.map((item, position) => {
                  const index = section.offset + position;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={`${section.id}-${item.slug}`}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseMove={() => {
                        if (!isActive) setActive(index);
                      }}
                      onClick={() => choose(item)}
                      className={cn(
                        "flex min-h-16 cursor-pointer items-center gap-4 px-3 py-2 transition-colors",
                        isActive ? "bg-surface-3" : "hover:bg-surface-2",
                      )}
                    >
                      <CarThumb
                        src={item.imageUrl}
                        alt=""
                        bodyType={item.bodyType}
                        powertrain={powertrainKind(item.fuelType)}
                        sizes="72px"
                        className="shrink-0"
                        frameClassName="aspect-[16/10] w-[4.5rem] rounded-control"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-s text-ink-50">
                          {item.title}
                        </span>
                        {item.subtitle ? (
                          <span className="block truncate text-caption">
                            {item.subtitle}
                          </span>
                        ) : null}
                      </span>
                      {item.powerHp !== null ? (
                        <span className="hidden shrink-0 text-caption tabular-nums sm:block">
                          {formatNumber(item.powerHp)} hp
                        </span>
                      ) : null}
                      <Plus
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          isActive ? "text-ink-50" : "text-ink-400",
                        )}
                        aria-hidden="true"
                      />
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
        {unlisted > 0 ? (
          <li role="presentation" className="px-4 py-3 text-caption">
            {unlisted} more {unlisted === 1 ? "car" : "cars"} — type to search the whole
            catalogue.
          </li>
        ) : null}
      </ul>

      <p aria-live="polite" className="sr-only">
        {expanded && term
          ? `${items.length} ${items.length === 1 ? "car matches" : "cars match"}.`
          : ""}
      </p>
    </div>
  );
}
