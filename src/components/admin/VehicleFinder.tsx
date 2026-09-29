"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Field";

export type FinderVehicle = {
  id: string;
  title: string;
  years: string;
  isPublished: boolean;
};

function normalise(text: string) {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Type-to-find a vehicle, then jump to one of its editor sections. Every word
 * must match (so "911 turbo" finds the 911 Turbo S). Arrow keys move from the
 * field into the results.
 */
export function VehicleFinder({
  vehicles,
  section = "",
  label = "Find a vehicle",
}: {
  vehicles: FinderVehicle[];
  /** Editor section to open, e.g. "/prices". */
  section?: string;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const searching = query.trim() !== "";
  const matches = useMemo(() => {
    const words = normalise(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    return vehicles.filter((vehicle) => {
      const haystack = normalise(`${vehicle.title} ${vehicle.years}`);
      return words.every((word) => haystack.includes(word));
    });
  }, [vehicles, query]);
  const shown = matches.slice(0, 12);

  const focusResult = (index: number) => {
    const links = listRef.current?.querySelectorAll<HTMLAnchorElement>("a");
    if (!links?.length) return;
    links[(index + links.length) % links.length]?.focus();
  };

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusResult(0);
    }
  };
  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const links = [...(listRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusResult(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index <= 0) document.getElementById(inputId)?.focus();
      else focusResult(index - 1);
    }
  };

  return (
    <div role="search" className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-body-s text-ink-200">
        {label}
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
          aria-hidden="true"
        />
        <Input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={onInputKey}
          placeholder="Manufacturer, model or variant"
          autoComplete="off"
          aria-describedby={`${inputId}-count`}
          className="pl-9"
        />
      </div>
      <p id={`${inputId}-count`} aria-live="polite" className="text-xs text-ink-500">
        {!searching
          ? `${vehicles.length} vehicles`
          : `${matches.length} match${matches.length === 1 ? "" : "es"}${matches.length > shown.length ? ` · showing ${shown.length}` : ""}`}
      </p>
      {shown.length ? (
        <ul
          ref={listRef}
          onKeyDown={onListKey}
          className="overflow-hidden rounded-sm border border-line"
        >
          {shown.map((vehicle) => (
            <li key={vehicle.id}>
              <Link
                href={`/admin/vehicles/${vehicle.id}${section}`}
                className="flex min-h-11 items-center justify-between gap-3 border-b border-line-subtle px-3 py-2 text-sm text-ink-100 last:border-b-0 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-offset-[-2px]"
              >
                <span className="min-w-0 truncate">{vehicle.title}</span>
                <span className="shrink-0 font-mono text-xs text-ink-500">
                  {vehicle.years}
                  {vehicle.isPublished ? "" : " · draft"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
