"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchX } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ManufacturerCard } from "./ManufacturerCard";
import { groupByCountry, segmentOptions, type SegmentFilter } from "./brand";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";

const ALL_COUNTRIES = "all";

/**
 * The manufacturer directory: every marque grouped by country, filterable by
 * segment and by country. Filtering happens in the browser on data the page
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
      <div className="flex flex-col gap-5 border-y border-line py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-label" aria-hidden="true">
            Segment
          </p>
          <SegmentedControl
            label="Filter manufacturers by segment"
            className="mt-2"
            value={segment}
            onChange={setSegment}
            options={segments.map((option) => ({
              value: option.value,
              label: (
                <>
                  {option.label}
                  <span className="tabular font-mono text-ink-500">{option.count}</span>
                </>
              ),
            }))}
          />
        </div>
        <Select
          label="Country"
          className="w-full sm:w-72"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          options={[{ value: ALL_COUNTRIES, label: "All countries" }, ...countryOptions]}
        />
      </div>

      <div className="mt-6 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p className="text-hud" aria-live="polite">
          Showing {visible.length} of {makers.length} manufacturers
        </p>
        {filtered ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className="mt-8 flex flex-col items-center border border-dashed border-line px-6 py-16 text-center">
          <SearchX
            className="size-6 text-ink-500"
            strokeWidth={1.25}
            aria-hidden="true"
          />
          <p className="mt-4 font-display text-xs tracking-button text-ink-100 uppercase">
            No marque matches both filters
          </p>
          <p className="mt-3 max-w-sm text-sm text-ink-400">
            No manufacturer in the catalogue belongs to that segment in that country.
          </p>
          <Button variant="secondary" size="sm" className="mt-6" onClick={reset}>
            Show every marque
          </Button>
        </div>
      ) : (
        <div className="mt-6 border-t border-line">
          {groups.map((group) => (
            <section
              key={group.slug}
              aria-labelledby={`makers-${group.slug}`}
              className="grid gap-5 border-b border-line py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 lg:py-10"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 lg:sticky lg:top-24 lg:flex-col lg:items-start lg:justify-start lg:self-start">
                <h2
                  id={`makers-${group.slug}`}
                  className="flex items-center gap-3 font-display text-xs tracking-hud text-ink-50 uppercase"
                >
                  {group.flag ? (
                    <span className="text-xl leading-none" aria-hidden="true">
                      {group.flag}
                    </span>
                  ) : null}
                  {group.name}
                </h2>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-col lg:items-start">
                  <span className="text-hud">
                    {group.makers.length}{" "}
                    {group.makers.length === 1 ? "marque" : "marques"}
                  </span>
                  {group.slug !== "unknown" ? (
                    <Link
                      href={`/countries/${group.slug}`}
                      className="inline-flex min-h-9 items-center text-hud text-gold-300 transition-colors duration-(--duration-fast) hover:text-gold-200"
                    >
                      {group.name} profile →
                    </Link>
                  ) : null}
                </p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {group.makers.map((maker) => (
                  <li key={maker.id}>
                    <ManufacturerCard maker={maker} />
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
