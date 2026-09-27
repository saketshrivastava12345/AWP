"use client";

import { useMemo } from "react";
import type { MarketGeography } from "@/types/domain";
import type { MarketSelection } from "@/lib/pricing/engine";
import { partitionPriced } from "@/lib/pricing/presentation";
import { Select, type SelectGroup, type SelectOption } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

type Named = { id: string; name: string };

/**
 * Options for one level of the cascade. Markets with recorded prices are
 * listed first in their own labelled <optgroup>, so the distinction reaches
 * screen readers and the phone's native picker, not just sighted mouse users.
 * With nothing (or everything) priced, a flat list reads better.
 */
function buildOptions(
  items: readonly Named[],
  pricedIds: ReadonlySet<string>,
  otherLabel: string,
): { options: SelectOption[]; groups: SelectGroup[] } {
  const toOption = (item: Named): SelectOption => ({ value: item.id, label: item.name });
  const { priced, other } = partitionPriced(items, pricedIds);
  if (priced.length === 0 || other.length === 0) {
    return { options: items.map(toOption), groups: [] };
  }
  return {
    options: [],
    groups: [
      { label: "Prices available", options: priced.map(toOption) },
      { label: otherLabel, options: other.map(toOption) },
    ],
  };
}

/**
 * The closed control shows a gold dot when the chosen market has recorded
 * prices and a hollow ring when it does not. Decorative: the same fact is in
 * the option groups and in the price panel below.
 */
function MarketSelect({
  label,
  value,
  placeholder,
  disabled,
  priced,
  options,
  groups,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  priced: boolean | null;
  options: SelectOption[];
  groups: SelectGroup[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0">
      <Select
        label={label}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        options={options}
        groups={groups}
        onChange={(event) => onChange(event.target.value)}
        selectClassName="pl-8 truncate"
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-[19px] left-3.5 size-1.5 rounded-full",
          priced === true && "bg-gold-500",
          priced === false && "border border-ink-500",
          priced === null && "hidden",
          disabled && "opacity-50",
        )}
      />
    </div>
  );
}

export function MarketSelector({
  geography,
  selection,
  pricedIds,
  onSelect,
  className,
}: {
  geography: MarketGeography;
  selection: MarketSelection;
  /** Ids of countries, states and cities with at least one in-force price. */
  pricedIds: ReadonlySet<string>;
  onSelect: (next: MarketSelection) => void;
  className?: string;
}) {
  const country =
    geography.countries.find((entry) => entry.id === selection.countryId) ?? null;
  const region =
    country?.regions.find((entry) => entry.id === selection.regionId) ?? null;

  const countryOptions = useMemo(
    () => buildOptions(geography.countries, pricedIds, "Other countries"),
    [geography.countries, pricedIds],
  );
  const regionOptions = useMemo(
    () => buildOptions(country?.regions ?? [], pricedIds, "Other states"),
    [country, pricedIds],
  );
  const cityOptions = useMemo(
    () => buildOptions(region?.cities ?? [], pricedIds, "Other cities"),
    [region, pricedIds],
  );

  const hasRegions = (country?.regions.length ?? 0) > 0;
  const hasCities = (region?.cities.length ?? 0) > 0;
  const markedFor = (id: string | null) => (id ? pricedIds.has(id) : null);

  return (
    <fieldset className={cn("min-w-0", className)}>
      {/* Floated so the legend lays out as an ordinary block (not in the
          fieldset border) and can share its row with the key. */}
      <legend className="float-left mb-4 flex w-full items-baseline justify-between gap-4">
        <span className="text-h4">Market</span>
        {/* Visual key only: the same fact reaches assistive technology
            through the option groups. */}
        <span aria-hidden="true" className="flex items-center gap-2 text-caption">
          <span className="size-1.5 rounded-full bg-gold-500" />
          Prices recorded
        </span>
      </legend>

      <div className="clear-both grid gap-3 sm:grid-cols-3">
        <MarketSelect
          label="Country"
          value={country?.id ?? ""}
          placeholder="Choose a country"
          disabled={geography.countries.length === 0}
          priced={markedFor(country?.id ?? null)}
          options={countryOptions.options}
          groups={countryOptions.groups}
          onChange={(value) =>
            // A new country starts over: its states and cities are different.
            onSelect({ countryId: value || null, regionId: null, cityId: null })
          }
        />
        <MarketSelect
          label="State"
          value={region?.id ?? ""}
          placeholder={
            country ? (hasRegions ? `All of ${country.name}` : "No states listed") : "—"
          }
          disabled={!country || !hasRegions}
          priced={markedFor(region?.id ?? null)}
          options={regionOptions.options}
          groups={regionOptions.groups}
          onChange={(value) =>
            onSelect({
              countryId: selection.countryId,
              regionId: value || null,
              cityId: null,
            })
          }
        />
        <MarketSelect
          label="City"
          value={
            region?.cities.some((city) => city.id === selection.cityId)
              ? (selection.cityId ?? "")
              : ""
          }
          placeholder={
            region ? (hasCities ? `All of ${region.name}` : "No cities listed") : "—"
          }
          disabled={!region || !hasCities}
          priced={markedFor(
            region?.cities.some((city) => city.id === selection.cityId)
              ? selection.cityId
              : null,
          )}
          options={cityOptions.options}
          groups={cityOptions.groups}
          onChange={(value) =>
            onSelect({
              countryId: selection.countryId,
              regionId: selection.regionId,
              cityId: value || null,
            })
          }
        />
      </div>
    </fieldset>
  );
}
