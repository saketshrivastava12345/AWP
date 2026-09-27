"use client";

import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { ChevronDown, LoaderCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { buttonClasses } from "@/components/ui/Button";
import type {
  FacetOption,
  FilterOptions,
  ListFacet,
  NumericFilterKey,
  RangeFacet,
} from "@/lib/facets";

/**
 * The catalogue filters, as one GET form.
 *
 * It is a real form with real checkboxes and number inputs, so it submits
 * without JavaScript and every control has native semantics. With JavaScript:
 *
 *   - `instant` (the desktop rail): a checkbox or currency change applies at
 *     once; number ranges apply on Enter or their Apply button.
 *   - `staged` (the mobile sheet): nothing applies until "Show results".
 *
 * The inputs are controlled and reset from the server's state after every
 * navigation, so what is ticked is always what is applied — including values
 * the search parser read from the query, which are ticked and marked. Any
 * submission writes those values into the URL explicitly and keeps only the
 * query's leftover words, so a refined search reads the same either way.
 */

export type FilterPanelModel = {
  options: FilterOptions;
  /** Filter keys whose current values came from the search text. */
  searchKeys: string[];
  /** Params carried through unchanged (q's leftover words, sort, page size). */
  hidden: [string, string][];
  /** Canonical URL of the current state; the draft resets when it changes. */
  stateKey: string;
  action: string;
};

type Draft = {
  lists: Record<string, string[]>;
  numbers: Partial<Record<NumericFilterKey, string>>;
  currency: string;
};

function initialDraft(options: FilterOptions): Draft {
  const lists: Record<string, string[]> = {};
  for (const facet of options.lists) {
    lists[facet.param] = facet.options
      .filter((option) => option.selected)
      .map((option) => option.value);
  }
  const numbers: Partial<Record<NumericFilterKey, string>> = {};
  for (const range of options.ranges) {
    if (range.min !== undefined) numbers[range.minParam] = String(range.min);
    if (range.maxParam && range.max !== undefined)
      numbers[range.maxParam] = String(range.max);
  }
  if (options.price?.min !== undefined) numbers.priceMin = String(options.price.min);
  if (options.price?.max !== undefined) numbers.priceMax = String(options.price.max);
  return { lists, numbers, currency: options.price?.currency ?? "" };
}

function draftToHref(model: FilterPanelModel, draft: Draft): string {
  const search = new URLSearchParams();
  const hidden = new Map(model.hidden);
  const q = hidden.get("q");
  if (q) search.append("q", q);

  for (const facet of model.options.lists) {
    for (const value of draft.lists[facet.param] ?? []) search.append(facet.param, value);
  }
  for (const range of model.options.ranges) {
    for (const key of [range.minParam, range.maxParam]) {
      if (!key) continue;
      const raw = draft.numbers[key]?.trim();
      if (raw && Number.isFinite(Number(raw))) search.append(key, raw);
    }
  }
  if (draft.currency) {
    search.append("priceCurrency", draft.currency);
    for (const key of ["priceMin", "priceMax"] as const) {
      const raw = draft.numbers[key]?.trim();
      if (raw && Number.isFinite(Number(raw))) search.append(key, raw);
    }
  }
  for (const [name, value] of model.hidden) {
    if (name !== "q") search.append(name, value);
  }
  const query = search.toString();
  return query ? `${model.action}?${query}` : model.action;
}

const noop = () => () => {};
/** True once hydrated: server and first client render agree (false), then true. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

const SUMMARY =
  "flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-left text-ink-50 " +
  "transition-colors duration-(--duration-fast) hover:text-ink-50 [&::-webkit-details-marker]:hidden";

function GroupSummary({ title, active }: { title: string; active: number }) {
  return (
    <summary className={SUMMARY}>
      <span className="font-display text-base font-medium">
        {title}
        {active > 0 ? (
          <span className="ml-1.5 text-body-s font-sans font-normal text-ink-400">
            ({active})<span className="sr-only"> selected</span>
          </span>
        ) : null}
      </span>
      <ChevronDown
        className="size-4 shrink-0 text-ink-400 transition-transform duration-(--duration-base) ease-standard group-open/facet:rotate-180"
        aria-hidden="true"
      />
    </summary>
  );
}

function Checkbox({
  name,
  option,
  checked,
  fromSearch,
  onChange,
}: {
  name: string;
  option: FacetOption;
  checked: boolean;
  fromSearch: boolean;
  onChange: (checked: boolean) => void;
}) {
  // A ticked option that no longer matches anything stays listed (so it can
  // be unticked) but reads as spent.
  const empty = option.count === 0;
  return (
    <label
      className={cn(
        "group/option flex min-h-11 cursor-pointer items-center gap-3 text-body-s",
        checked ? "text-ink-50" : "text-ink-200 hover:text-ink-50",
        empty && "text-ink-400",
      )}
    >
      <span className="relative grid size-5 shrink-0 place-items-center">
        <input
          type="checkbox"
          name={name}
          value={option.value}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className={cn(
            "peer size-5 cursor-pointer appearance-none rounded-xs border bg-surface-1 transition-colors duration-(--duration-fast)",
            "border-line-strong checked:border-gold-500 checked:bg-gold-500 hover:border-ink-400",
          )}
        />
        <svg
          viewBox="0 0 10 8"
          aria-hidden="true"
          className="pointer-events-none absolute size-2.5 fill-void opacity-0 peer-checked:opacity-100"
        >
          <path d="M3.7 7.5.2 4l1-1 2.5 2.5L8.8.2l1 1z" />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate">{option.label}</span>
        {fromSearch && checked ? (
          <>
            <Search className="size-3.5 shrink-0 text-ink-400" aria-hidden="true" />
            <span className="sr-only">(from your search)</span>
          </>
        ) : null}
      </span>
      <span className="tabular shrink-0 text-caption text-ink-400">
        {formatNumber(option.count)}
        <span className="sr-only"> cars</span>
      </span>
    </label>
  );
}

/**
 * A collapsible filter group. Native <details>, so it works without
 * JavaScript. Its initial state is fixed at mount: React would otherwise
 * rewrite the `open` attribute whenever the default changed, collapsing a
 * group under the user's pointer as its last option is unticked.
 */
function Group({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  const [initiallyOpen] = useState(defaultOpen);
  return (
    <details className="group/facet border-b border-line-subtle" open={initiallyOpen}>
      {children}
    </details>
  );
}

const VISIBLE_OPTIONS = 8;

/**
 * Options worth offering: those that would show at least one car under the
 * other filters, plus anything ticked (a spent filter must stay visible so it
 * can be removed). "Coupe 0" is a dead end, not a choice.
 */
function visibleOptions(facet: ListFacet, selected: ReadonlySet<string>): FacetOption[] {
  return facet.options.filter(
    (option) => option.count > 0 || option.selected || selected.has(option.value),
  );
}

function ListGroup({
  facet,
  values,
  fromSearch,
  defaultOpen,
  onToggle,
}: {
  facet: ListFacet;
  values: string[];
  fromSearch: boolean;
  defaultOpen: boolean;
  onToggle: (value: string, checked: boolean) => void;
}) {
  const selected = new Set(values);
  const options = visibleOptions(facet, selected);
  // Which options sit above "show more" is decided once, at mount: the first
  // few plus anything already ticked (a ticked option is never hidden). Kept
  // stable afterwards, so ticking an option never moves it — which would
  // remount its checkbox and drop keyboard focus.
  const [pinned] = useState(
    () =>
      new Set(
        options
          .filter((option, index) => index < VISIBLE_OPTIONS || option.selected)
          .map((option) => option.value),
      ),
  );
  const head = options.filter((option) => pinned.has(option.value));
  const tail = options.filter((option) => !pinned.has(option.value));

  const row = (option: FacetOption) => (
    <li key={option.value}>
      <Checkbox
        name={facet.param}
        option={option}
        checked={selected.has(option.value)}
        fromSearch={fromSearch}
        onChange={(checked) => onToggle(option.value, checked)}
      />
    </li>
  );

  return (
    <Group defaultOpen={defaultOpen}>
      <GroupSummary title={facet.title} active={selected.size} />
      <fieldset className="pb-4">
        <legend className="sr-only">{facet.title}</legend>
        <ul>{head.map(row)}</ul>
        {tail.length > 0 ? (
          <details className="group/more">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-body-s text-ink-100 underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink-50 hover:decoration-ink-400 [&::-webkit-details-marker]:hidden">
              <span className="group-open/more:hidden">Show {tail.length} more</span>
              <span className="hidden group-open/more:inline">Show fewer</span>
            </summary>
            <ul className="pb-1">{tail.map(row)}</ul>
          </details>
        ) : null}
      </fieldset>
    </Group>
  );
}

const NUMBER_INPUT =
  "tabular h-11 w-full min-w-0 rounded-control border border-line-strong bg-surface-1 px-3 text-body-s text-ink-50 " +
  "placeholder:text-ink-500 hover:border-ink-500 focus-visible:border-gold-500";

const APPLY = buttonClasses("secondary", "sm", "mt-3 w-full");

function RangeGroup({
  range,
  numbers,
  fromSearch,
  defaultOpen,
  showApply,
  onChange,
}: {
  range: RangeFacet;
  numbers: Draft["numbers"];
  fromSearch: boolean;
  defaultOpen: boolean;
  showApply: boolean;
  onChange: (key: NumericFilterKey, value: string) => void;
}) {
  const id = useId();
  const min = numbers[range.minParam] ?? "";
  const max = range.maxParam ? (numbers[range.maxParam] ?? "") : "";
  const active = range.min !== undefined || range.max !== undefined ? 1 : 0;
  const unit = range.unit ? ` (${range.unit})` : "";
  const format = (value: number) => (range.unit ? formatNumber(value) : String(value));

  return (
    <Group defaultOpen={defaultOpen}>
      <GroupSummary title={range.title} active={active} />
      <fieldset className="pb-4">
        <legend className="sr-only">
          {range.title}
          {unit}
        </legend>
        <div
          className={cn(
            "grid items-center gap-2",
            range.maxParam ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-1",
          )}
        >
          <div>
            <label htmlFor={`${id}-min`} className="sr-only">
              {range.maxParam ? `Minimum ${range.title.toLowerCase()}` : `At least`}
              {unit}
            </label>
            <input
              id={`${id}-min`}
              type="number"
              inputMode="decimal"
              step="any"
              name={range.minParam}
              value={min}
              onChange={(event) => onChange(range.minParam, event.target.value)}
              placeholder={
                range.bounds
                  ? `${range.maxParam ? "" : "At least "}${format(range.bounds[0])}`
                  : "Min"
              }
              className={NUMBER_INPUT}
            />
          </div>
          {range.maxParam ? (
            <>
              <span aria-hidden="true" className="text-body-s text-ink-400">
                –
              </span>
              <div>
                <label htmlFor={`${id}-max`} className="sr-only">
                  Maximum {range.title.toLowerCase()}
                  {unit}
                </label>
                <input
                  id={`${id}-max`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  name={range.maxParam}
                  value={max}
                  onChange={(event) => onChange(range.maxParam!, event.target.value)}
                  placeholder={range.bounds ? format(range.bounds[1]) : "Max"}
                  className={NUMBER_INPUT}
                />
              </div>
            </>
          ) : null}
        </div>
        <p className="mt-2 flex items-center justify-between gap-2 text-caption text-ink-400">
          <span>
            {range.bounds
              ? `${format(range.bounds[0])} – ${format(range.bounds[1])}${range.unit ? ` ${range.unit}` : ""}`
              : "No car here publishes this"}
          </span>
          {fromSearch ? (
            <span className="flex items-center gap-1 text-ink-300">
              <Search className="size-3.5" aria-hidden="true" />
              from search
            </span>
          ) : null}
        </p>
        {showApply ? (
          <button type="submit" className={APPLY}>
            Apply {range.title.toLowerCase()}
          </button>
        ) : null}
      </fieldset>
    </Group>
  );
}

function PriceGroup({
  options,
  draft,
  defaultOpen,
  showApply,
  onCurrency,
  onNumber,
}: {
  options: NonNullable<FilterOptions["price"]>;
  draft: Draft;
  defaultOpen: boolean;
  showApply: boolean;
  onCurrency: (currency: string) => void;
  onNumber: (key: "priceMin" | "priceMax", value: string) => void;
}) {
  const id = useId();
  const currency = draft.currency;
  // Bounds are only known for the currency the server last applied.
  const bounds = currency && currency === options.currency ? options.bounds : null;
  const format = (value: number) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US").format(value);

  return (
    <Group defaultOpen={defaultOpen}>
      <GroupSummary title="Price" active={options.currency ? 1 : 0} />
      <fieldset className="pb-4">
        <legend className="sr-only">Listed price</legend>
        <label htmlFor={`${id}-currency`} className="text-caption text-ink-400">
          Currency
        </label>
        <div className="relative mt-1.5">
          <select
            id={`${id}-currency`}
            name="priceCurrency"
            value={currency}
            onChange={(event) => onCurrency(event.target.value)}
            className="h-11 w-full appearance-none rounded-control border border-line-strong bg-surface-1 pr-9 pl-3 text-body-s text-ink-50 hover:border-ink-500 focus-visible:border-gold-500"
          >
            <option value="">Any — choose to filter</option>
            {options.currencies.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>

        {currency ? (
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <label htmlFor={`${id}-min`} className="sr-only">
                Minimum price in {currency}
              </label>
              <input
                id={`${id}-min`}
                type="number"
                inputMode="decimal"
                step="any"
                name="priceMin"
                value={draft.numbers.priceMin ?? ""}
                onChange={(event) => onNumber("priceMin", event.target.value)}
                placeholder={bounds ? format(bounds[0]) : "Min"}
                className={NUMBER_INPUT}
              />
            </div>
            <span aria-hidden="true" className="text-body-s text-ink-400">
              –
            </span>
            <div>
              <label htmlFor={`${id}-max`} className="sr-only">
                Maximum price in {currency}
              </label>
              <input
                id={`${id}-max`}
                type="number"
                inputMode="decimal"
                step="any"
                name="priceMax"
                value={draft.numbers.priceMax ?? ""}
                onChange={(event) => onNumber("priceMax", event.target.value)}
                placeholder={bounds ? format(bounds[1]) : "Max"}
                className={NUMBER_INPUT}
              />
            </div>
          </div>
        ) : null}

        <p className="mt-3 text-caption text-ink-400">
          Listed prices, in the currency they were published in. Prices are never
          converted, so a range always applies within one currency.
        </p>
        {showApply && currency ? (
          <button type="submit" className={APPLY}>
            Apply price
          </button>
        ) : null}
      </fieldset>
    </Group>
  );
}

/** Which groups start open: the everyday ones, plus any with an active value. */
const OPEN_BY_DEFAULT = new Set(["country", "category", "fuel", "power"]);

/** The order groups appear in, whatever order the facet data arrives in. */
const GROUP_ORDER = [
  "country",
  "manufacturer",
  "category",
  "body",
  "fuel",
  "price",
  "power",
  "speed",
  "range",
  "transmission",
  "drive",
  "engineLayout",
  "cylinders",
  "aspiration",
  "year",
  "status",
];

export function FilterPanel({
  model,
  mode,
  onApplied,
  className,
}: {
  model: FilterPanelModel;
  mode: "instant" | "staged";
  /** Called after a staged submit, e.g. to close the sheet. */
  onApplied?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(() => initialDraft(model.options));
  const [syncedKey, setSyncedKey] = useState(model.stateKey);

  // After a navigation lands, adopt the server's state (React's "adjust state
  // when a prop changes" pattern). Not while one is still in flight, or a
  // second quick click would be undone by the first response.
  if (model.stateKey !== syncedKey && !pending) {
    setSyncedKey(model.stateKey);
    setDraft(initialDraft(model.options));
  }

  const navigate = (next: Draft) => {
    const href = draftToHref(model, next);
    startTransition(() => {
      router.push(href, { scroll: mode === "staged" });
    });
    onApplied?.();
  };

  const update = (next: Draft, apply: boolean) => {
    setDraft(next);
    if (apply && mode === "instant") navigate(next);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(draft);
  };

  const searchKeys = new Set(model.searchKeys);
  const options = model.options;
  const listByKey = new Map(options.lists.map((facet) => [facet.key as string, facet]));
  const rangeByKey = new Map(options.ranges.map((range) => [range.key as string, range]));

  const groups = GROUP_ORDER.map((key) => {
    const facet = listByKey.get(key);
    if (facet) {
      const values = draft.lists[facet.param] ?? [];
      if (visibleOptions(facet, new Set(values)).length === 0) return null;
      return (
        <ListGroup
          key={key}
          facet={facet}
          values={values}
          fromSearch={searchKeys.has(facet.key)}
          defaultOpen={
            OPEN_BY_DEFAULT.has(key) || facet.options.some((option) => option.selected)
          }
          onToggle={(value, checked) => {
            const current = draft.lists[facet.param] ?? [];
            const nextValues = checked
              ? [...current.filter((entry) => entry !== value), value]
              : current.filter((entry) => entry !== value);
            update(
              { ...draft, lists: { ...draft.lists, [facet.param]: nextValues } },
              true,
            );
          }}
        />
      );
    }
    const range = rangeByKey.get(key);
    if (range) {
      return (
        <RangeGroup
          key={key}
          range={range}
          numbers={draft.numbers}
          fromSearch={
            searchKeys.has(range.minParam) ||
            (range.maxParam ? searchKeys.has(range.maxParam) : false)
          }
          defaultOpen={
            OPEN_BY_DEFAULT.has(key) || range.min !== undefined || range.max !== undefined
          }
          showApply={mode === "instant"}
          onChange={(param, value) =>
            update({ ...draft, numbers: { ...draft.numbers, [param]: value } }, false)
          }
        />
      );
    }
    if (key === "price" && options.price) {
      return (
        <PriceGroup
          key={key}
          options={options.price}
          draft={draft}
          defaultOpen={options.price.currency !== undefined}
          showApply={mode === "instant"}
          onCurrency={(currency) =>
            update(
              {
                ...draft,
                currency,
                // Bounds typed in one currency mean nothing in another.
                numbers: { ...draft.numbers, priceMin: "", priceMax: "" },
              },
              true,
            )
          }
          onNumber={(param, value) =>
            update({ ...draft, numbers: { ...draft.numbers, [param]: value } }, false)
          }
        />
      );
    }
    return null;
  });

  return (
    <form
      action={model.action}
      method="get"
      onSubmit={onSubmit}
      aria-busy={pending || undefined}
      className={cn("relative", className)}
    >
      {model.hidden.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {mode === "instant" ? (
        <div
          aria-hidden={!pending}
          className={cn(
            "pointer-events-none absolute -top-10 right-0 flex items-center gap-1.5 text-caption text-ink-300 transition-opacity",
            pending ? "opacity-100" : "opacity-0",
          )}
        >
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Updating
        </div>
      ) : null}

      {groups}

      {/* Staged mode always needs a submit; instant mode needs one only
          before hydration (or without JavaScript), when nothing applies on
          change. */}
      {mode === "staged" ? (
        <div className="sticky -bottom-5 -mx-5 mt-4 -mb-5 flex gap-3 border-t border-line bg-surface-1/95 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6">
          <button
            type="button"
            onClick={() => navigate({ lists: {}, numbers: {}, currency: "" })}
            className={buttonClasses("secondary", "md", "flex-1 px-4")}
          >
            Clear all
          </button>
          <button
            type="submit"
            className={buttonClasses("primary", "md", "flex-[1.4] px-4")}
          >
            Show results
          </button>
        </div>
      ) : !hydrated ? (
        <button type="submit" className={buttonClasses("primary", "md", "mt-5 w-full")}>
          Apply filters
        </button>
      ) : null}
    </form>
  );
}
