"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildQueryString, type RawSearchParams } from "@/lib/search-params";
import type { FilterOptions, FacetOption } from "@/lib/facets";

/**
 * Filter rail.
 *
 * Every control is a plain `<Link>` that rewrites the URL, so filters are
 * shareable, back/forward works, and the whole thing functions with JavaScript
 * disabled. The only client-side state is which accordion sections are open
 * and whether the mobile drawer is showing.
 */

type FilterGroupKey =
  | "country"
  | "manufacturer"
  | "category"
  | "fuel"
  | "drive"
  | "body"
  | "transmission"
  | "layout"
  | "cylinders"
  | "aspiration";

const ASPIRATION_OPTIONS: FacetOption[] = [
  { value: "naturally_aspirated", label: "Naturally Aspirated" },
  { value: "turbocharged", label: "Turbocharged" },
  { value: "twin_turbo", label: "Twin-Turbo" },
  { value: "supercharged", label: "Supercharged" },
];

/** Toggle one value of a repeatable param, preserving everything else. */
function toggleHref(
  params: RawSearchParams,
  key: string,
  value: string,
  basePath: string,
): string {
  const raw = params[key];
  const current = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((entry) =>
    entry.split(","),
  );
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];

  return `${basePath}${buildQueryString(params, {
    [key]: next.length > 0 ? next : undefined,
    // Any filter change invalidates the current page number.
    page: undefined,
  })}`;
}

function isChecked(params: RawSearchParams, key: string, value: string): boolean {
  const raw = params[key];
  const current = (Array.isArray(raw) ? raw : raw ? [raw] : []).flatMap((entry) =>
    entry.split(","),
  );
  return current.includes(value);
}

function FilterGroup({
  title,
  paramKey,
  options,
  params,
  basePath,
  defaultOpen = false,
  maxVisible = 8,
}: {
  title: string;
  paramKey: FilterGroupKey;
  options: FacetOption[];
  params: RawSearchParams;
  basePath: string;
  defaultOpen?: boolean;
  maxVisible?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [showAll, setShowAll] = useState(false);

  if (options.length === 0) return null;

  const activeCount = options.filter((option) =>
    isChecked(params, paramKey, option.value),
  ).length;
  const visible = showAll ? options : options.slice(0, maxVisible);

  return (
    <div className="border-b border-line-subtle">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left text-ink-200 transition-colors hover:text-ink-50"
      >
        <span className="font-display text-[10px] tracking-[0.18em] uppercase">
          {title}
          {activeCount > 0 ? (
            <span className="ml-2 text-gold-300">({activeCount})</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul className="pb-4">
          {visible.map((option) => {
            const checked = isChecked(params, paramKey, option.value);
            return (
              <li key={option.value}>
                <Link
                  href={toggleHref(params, paramKey, option.value, basePath)}
                  scroll={false}
                  aria-pressed={checked}
                  className={cn(
                    "flex items-center justify-between gap-3 py-1.5 text-xs transition-colors",
                    checked ? "text-gold-300" : "text-ink-400 hover:text-ink-100",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-xs border",
                        checked ? "border-gold-500 bg-gold-500" : "border-line-strong",
                      )}
                    >
                      {checked ? (
                        <svg viewBox="0 0 10 8" className="size-2 fill-current text-void">
                          <path d="M3.7 7.5.2 4l1-1 2.5 2.5L8.8.2l1 1z" />
                        </svg>
                      ) : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </span>
                  {option.count !== undefined ? (
                    <span className="tabular shrink-0 font-mono text-[10px] text-ink-600">
                      {option.count}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}

          {options.length > maxVisible ? (
            <li className="pt-2">
              <button
                type="button"
                onClick={() => setShowAll((previous) => !previous)}
                className="text-[11px] text-ink-500 transition-colors hover:text-gold-300"
              >
                {showAll ? "Show fewer" : `Show all ${options.length}`}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** Range filters are two number inputs inside a GET form — no JS needed. */
function RangeGroup({
  title,
  minKey,
  maxKey,
  bounds,
  unit,
  params,
  basePath,
}: {
  title: string;
  minKey: string;
  maxKey: string;
  bounds: [number, number] | null;
  unit: string;
  params: RawSearchParams;
  basePath: string;
}) {
  const [open, setOpen] = useState(false);
  if (!bounds) return null;

  const [min, max] = bounds;
  const currentMin = params[minKey];
  const currentMax = params[maxKey];

  // Carry every other active param through as hidden fields, so submitting
  // the range does not wipe the rest of the filter state.
  const hidden = Object.entries(params).filter(
    ([key]) => key !== minKey && key !== maxKey && key !== "page",
  );

  return (
    <div className="border-b border-line-subtle">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-4 text-left text-ink-200 transition-colors hover:text-ink-50"
      >
        <span className="font-display text-[10px] tracking-[0.18em] uppercase">
          {title}
          {currentMin || currentMax ? (
            <span className="ml-2 text-gold-300">(1)</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <form action={basePath} method="get" className="pb-4">
          {hidden.map(([key, raw]) =>
            (Array.isArray(raw) ? raw : raw ? [raw] : []).map((value, index) => (
              <input key={`${key}-${index}`} type="hidden" name={key} value={value} />
            )),
          )}

          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`${minKey}-input`}>
              Minimum {title} in {unit}
            </label>
            <input
              id={`${minKey}-input`}
              type="number"
              name={minKey}
              min={min}
              max={max}
              placeholder={String(min)}
              defaultValue={typeof currentMin === "string" ? currentMin : undefined}
              className="tabular w-full rounded-xs border border-line bg-surface-2 px-2 py-1.5 font-mono text-xs text-ink-100 placeholder:text-ink-600"
            />
            <span className="text-xs text-ink-600">to</span>
            <label className="sr-only" htmlFor={`${maxKey}-input`}>
              Maximum {title} in {unit}
            </label>
            <input
              id={`${maxKey}-input`}
              type="number"
              name={maxKey}
              min={min}
              max={max}
              placeholder={String(max)}
              defaultValue={typeof currentMax === "string" ? currentMax : undefined}
              className="tabular w-full rounded-xs border border-line bg-surface-2 px-2 py-1.5 font-mono text-xs text-ink-100 placeholder:text-ink-600"
            />
          </div>
          <button
            type="submit"
            className="mt-2.5 w-full rounded-xs border border-line py-1.5 font-display text-[10px] tracking-[0.14em] text-ink-300 uppercase transition-colors hover:border-gold-700 hover:text-gold-300"
          >
            Apply {unit}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function FilterContents({
  options,
  params,
  basePath,
}: {
  options: FilterOptions;
  params: RawSearchParams;
  basePath: string;
}) {
  return (
    <>
      <FilterGroup
        title="Country"
        paramKey="country"
        options={options.countries}
        params={params}
        basePath={basePath}
        defaultOpen
      />
      <FilterGroup
        title="Manufacturer"
        paramKey="manufacturer"
        options={options.manufacturers}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Category"
        paramKey="category"
        options={options.categories}
        params={params}
        basePath={basePath}
        defaultOpen
      />
      <FilterGroup
        title="Fuel"
        paramKey="fuel"
        options={FUEL_OPTIONS}
        params={params}
        basePath={basePath}
        defaultOpen
      />
      <FilterGroup
        title="Drivetrain"
        paramKey="drive"
        options={DRIVE_OPTIONS}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Body Type"
        paramKey="body"
        options={options.bodyTypes}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Transmission"
        paramKey="transmission"
        options={options.transmissionTypes}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Engine Layout"
        paramKey="layout"
        options={options.engineLayouts}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Cylinders"
        paramKey="cylinders"
        options={options.cylinders}
        params={params}
        basePath={basePath}
      />
      <FilterGroup
        title="Aspiration"
        paramKey="aspiration"
        options={ASPIRATION_OPTIONS}
        params={params}
        basePath={basePath}
      />
      <RangeGroup
        title="Power"
        minKey="powerMin"
        maxKey="powerMax"
        bounds={options.ranges.power}
        unit="hp"
        params={params}
        basePath={basePath}
      />
      <RangeGroup
        title="Top Speed"
        minKey="speedMin"
        maxKey="speedMax"
        bounds={options.ranges.speed}
        unit="km/h"
        params={params}
        basePath={basePath}
      />
      <RangeGroup
        title="Year"
        minKey="yearMin"
        maxKey="yearMax"
        bounds={options.ranges.year}
        unit="year"
        params={params}
        basePath={basePath}
      />
    </>
  );
}

const FUEL_OPTIONS: FacetOption[] = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "phev", label: "Plug-in Hybrid" },
  { value: "electric", label: "Electric" },
  { value: "hydrogen", label: "Hydrogen" },
];

const DRIVE_OPTIONS: FacetOption[] = [
  { value: "fwd", label: "Front-Wheel Drive" },
  { value: "rwd", label: "Rear-Wheel Drive" },
  { value: "awd", label: "All-Wheel Drive" },
  { value: "4wd", label: "Four-Wheel Drive" },
];

export function FilterRail({
  options,
  params,
  basePath = "/cars",
  activeCount,
}: {
  options: FilterOptions;
  params: RawSearchParams;
  basePath?: string;
  activeCount: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex items-center gap-2 rounded-xs border border-line px-3 py-2 font-display text-[10px] tracking-[0.14em] text-ink-200 uppercase transition-colors hover:border-line-strong lg:hidden"
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        Filters
        {activeCount > 0 ? <span className="text-gold-300">({activeCount})</span> : null}
      </button>

      {/* Desktop rail */}
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-24">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h2 className="font-display text-[10px] tracking-[0.18em] text-ink-100 uppercase">
              Filters
            </h2>
            {activeCount > 0 ? (
              <Link
                href={basePath}
                className="text-[11px] text-gold-300 transition-colors hover:text-gold-200"
              >
                Clear all
              </Link>
            ) : null}
          </div>
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
            <FilterContents options={options} params={params} basePath={basePath} />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-void/85 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 left-0 w-full max-w-sm border-r border-line bg-surface-1"
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-display text-xs tracking-[0.18em] text-ink-100 uppercase">
                Filters
              </h2>
              <div className="flex items-center gap-3">
                {activeCount > 0 ? (
                  <Link
                    href={basePath}
                    onClick={() => setDrawerOpen(false)}
                    className="text-[11px] text-gold-300"
                  >
                    Clear all
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close"
                  className="-mr-2 p-2 text-ink-400 hover:text-ink-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </header>
            <div className="h-[calc(100%-3.75rem)] overflow-y-auto px-5 pb-8">
              <FilterContents options={options} params={params} basePath={basePath} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
