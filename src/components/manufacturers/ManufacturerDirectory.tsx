"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, SearchX } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button, buttonClasses } from "@/components/ui/Button";
import { CategoryChips } from "@/components/parts/CategoryChips";
import { cn } from "@/lib/utils";
import { ManufacturerCard } from "./ManufacturerCard";
import { groupByCountry, segmentOptions, type SegmentFilter } from "./brand";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";

const ALL_COUNTRIES = "all";

/**
 * The brand directory: every maker grouped by country, filterable by segment
 * (chips) and by country (a select) from a bar that sticks under the navbar. Filtering happens in the browser on data the page
 * already holds, so it is instant and the page itself stays static. Without
 * JavaScript every marque is simply listed.
 */
export function ManufacturerDirectory({ makers }: { makers: ManufacturerListItem[] }) {
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [country, setCountry] = useState<string>(ALL_COUNTRIES);

  const segments = useMemo(() => segmentOptions(makers), [makers]);
  const countryOptions = useMemo(
    () =>
      groupByCountry(makers).map((group) => ({
        value: group.slug,
        label: `${group.name} (${group.makers.length})`,
      })),
    [makers],
  );

  const visible = makers.filter(
    (maker) =>
      (segment === "all" || maker.segment === segment) &&
      (country === ALL_COUNTRIES || maker.country?.slug === country),
  );
  const groups = groupByCountry(visible);
  const filtered = segment !== "all" || country !== ALL_COUNTRIES;

  const reset = () => {
    setSegment("all");
    setCountry(ALL_COUNTRIES);
  };

  return (
    <div>
      {/* Sticky filter bar: segment chips and the country, under the navbar. */}
      <div
        className={cn(
          "sticky top-(--nav-offset) z-(--z-sticky) -mx-5 border-b border-line-subtle px-5 py-3 sm:-mx-8 sm:px-8",
          "bg-void/85 backdrop-blur-md backdrop-saturate-150 min-[1440px]:-mx-16 min-[1440px]:px-16 lg:-mx-12 lg:px-12",
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <CategoryChips
            label="Filter brands by segment"
            className="min-w-0"
            value={segment}
            onChange={(value) => setSegment(value as SegmentFilter)}
            options={segments}
          />
          <Select
            label="Country"
            hideLabel
            size="sm"
            className="w-full shrink-0 sm:w-64"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            options={[
              { value: ALL_COUNTRIES, label: "All countries" },
              ...countryOptions,
            ]}
          />
        </div>
      </div>

      <div className="mt-6 flex min-h-11 flex-wrap items-center justify-between gap-3">
        <p className="text-body-s text-ink-400" aria-live="polite">
          {filtered
            ? `${visible.length} of ${makers.length} brands`
            : `${makers.length} brands`}
        </p>
        {filtered ? (
          <Button variant="link" size="sm" arrow={false} onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-card bg-surface-1 px-6 py-16 text-center">
          <SearchX
            className="size-6 text-ink-400"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <p className="mt-4 text-h4">No brand matches both filters</p>
          <p className="mt-2 max-w-sm text-body-s text-ink-400">
            No brand in the catalogue belongs to that segment in that country.
          </p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={reset}>
            Show every brand
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-16 lg:space-y-20">
          {groups.map((group) => (
            <section key={group.slug} aria-labelledby={`makers-${group.slug}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line-subtle pb-4">
                <div className="flex min-w-0 items-baseline gap-3">
                  <h2
                    id={`makers-${group.slug}`}
                    className="flex items-center gap-3 text-h3"
                  >
                    {group.flag ? (
                      <span className="text-2xl leading-none" aria-hidden="true">
                        {group.flag}
                      </span>
                    ) : null}
                    {group.name}
                  </h2>
                  <span className="text-caption">
                    {group.makers.length} {group.makers.length === 1 ? "brand" : "brands"}
                  </span>
                </div>
                {group.slug !== "unknown" ? (
                  <Link
                    href={`/countries/${group.slug}`}
                    className={buttonClasses("link", "sm")}
                  >
                    Country profile
                    <span className="sr-only">: {group.name}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="text-ink-400 transition-[translate,color] duration-(--duration-base) group-hover/button:translate-x-1 group-hover/button:text-ink-50"
                    />
                  </Link>
                ) : null}
              </div>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {group.makers.map((maker) => (
                  <li key={maker.id}>
                    <ManufacturerCard
                      maker={maker}
                      showCountry={group.slug === "unknown"}
                    />
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
