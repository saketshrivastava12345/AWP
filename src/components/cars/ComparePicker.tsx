"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { CatalogCar } from "@/types/domain";

/**
 * Picker for the comparison set.
 *
 * Client-side because it filters a list as you type, but it writes its result
 * straight into the URL — the comparison itself is entirely URL state, so it
 * is shareable, bookmarkable and survives a reload.
 */
export function ComparePicker({
  options,
  selected,
  max,
  className,
}: {
  options: CatalogCar[];
  selected: string[];
  max: number;
  className?: string;
}) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  const slugOf = (car: CatalogCar) =>
    `${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;

  const available = useMemo(() => {
    const query = term.trim().toLowerCase();
    return options
      .filter((car) => !selected.includes(slugOf(car)))
      .filter((car) => {
        if (!query) return true;
        return [car.manufacturer_name, car.model_name, car.variant_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 40);
  }, [options, selected, term]);

  const isFull = selected.length >= max;

  const add = (car: CatalogCar) => {
    if (isFull) return;
    const params = new URLSearchParams();
    for (const entry of [...selected, slugOf(car)]) params.append("car", entry);
    setTerm("");
    router.push(`/compare?${params.toString()}`);
  };

  if (options.length === 0) {
    return (
      <p className={cn("text-sm text-ink-500", className)}>
        The catalogue could not be reached, so there is nothing to compare yet.
      </p>
    );
  }

  return (
    <div className={className}>
      <label htmlFor="compare-search" className="mb-3 block text-label">
        {isFull ? `Maximum of ${max} cars selected` : "Add a car"}
      </label>

      <div className="flex items-center gap-3 rounded-xs border border-line bg-surface-1/60 px-4 py-2.5">
        <Search className="size-3.5 shrink-0 text-ink-500" aria-hidden="true" />
        <input
          id="compare-search"
          type="search"
          value={term}
          disabled={isFull}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={
            isFull ? "Remove a car to add another" : "Search by make or model…"
          }
          className="w-full bg-transparent text-sm text-ink-100 outline-none placeholder:text-ink-600 disabled:cursor-not-allowed"
        />
      </div>

      {!isFull ? (
        <ul className="mt-3 max-h-72 overflow-y-auto border border-line">
          {available.length === 0 ? (
            <li className="px-4 py-5 text-xs text-ink-500">
              No cars match “{term.trim()}”.
            </li>
          ) : (
            available.map((car) => (
              <li
                key={car.variant_id}
                className="border-b border-line-subtle last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => add(car)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors hover:bg-surface-2/70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-ink-100">
                      {car.country_flag_emoji} {car.manufacturer_name} {car.model_name}
                    </span>
                    <span className="block truncate text-[11px] text-ink-500">
                      {car.variant_name}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="tabular font-mono text-[11px] text-ink-500">
                      {car.power_hp === null ? "—" : `${formatNumber(car.power_hp)} hp`}
                    </span>
                    <Plus className="size-3.5 text-gold-400" aria-hidden="true" />
                    <span className="sr-only">Add to comparison</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
