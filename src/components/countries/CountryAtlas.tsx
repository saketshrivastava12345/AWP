"use client";

import { useState } from "react";
import { WorldMap } from "./WorldMap";
import { CountryCard } from "./CountryCard";
import type { CountryListItem } from "@/lib/queries/countries";

/**
 * The map and the card grid, sharing one "active country": hovering or
 * focusing a marker highlights its card, and hovering or focusing a card
 * lights its marker. Every country gets a card, including any without map
 * coordinates.
 */
export function CountryAtlas({ countries }: { countries: CountryListItem[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  return (
    <div>
      <WorldMap
        countries={countries}
        activeSlug={activeSlug}
        onActiveChange={setActiveSlug}
        className="hidden md:block"
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 md:mt-16 lg:grid-cols-3">
        {countries.map((country) => (
          <li key={country.id}>
            <CountryCard
              country={country}
              active={country.slug === activeSlug}
              onActiveChange={setActiveSlug}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
