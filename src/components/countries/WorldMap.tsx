"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { COUNTRY_MARKERS } from "./map-data";
import type { CountryWithCounts } from "@/types/domain";

/**
 * Clickable world map.
 *
 * The map data is bundled locally (`map-data.ts`) rather than fetched from a
 * third-party URL at runtime, per the brief: no external request, nothing to
 * break offline, and no dependency on someone else's CDN staying up.
 *
 * It is an equirectangular projection, which makes the maths trivial —
 * longitude and latitude map linearly onto x and y — and is accurate enough
 * for placing ten country markers.
 *
 * On small screens this is hidden entirely in favour of the card grid, which
 * is the better interaction on touch anyway.
 */

const WIDTH = 1000;
const HEIGHT = 500;

/** Equirectangular projection: lon/lat straight onto the viewBox. */
function project(lon: number, lat: number): [number, number] {
  return [((lon + 180) / 360) * WIDTH, ((90 - lat) / 180) * HEIGHT];
}

export function WorldMap({ countries }: { countries: CountryWithCounts[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Only show markers for countries actually in the catalogue.
  const bySlug = new Map(countries.map((country) => [country.slug, country]));
  const markers = COUNTRY_MARKERS.filter((marker) => bySlug.has(marker.slug));

  return (
    <div className="relative hidden overflow-hidden border border-line bg-surface-1/40 md:block">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="World map showing the countries in the catalogue"
      >
        <defs>
          <radialGradient id="marker-glow">
            <stop offset="0%" stopColor="var(--color-gold-400)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--color-gold-400)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Graticule, as a faint technical grid rather than a decorative one. */}
        <g stroke="var(--color-line-subtle)" strokeWidth="0.5" fill="none">
          {Array.from({ length: 11 }, (_, index) => {
            const y = (index / 10) * HEIGHT;
            return <line key={`lat-${index}`} x1="0" y1={y} x2={WIDTH} y2={y} />;
          })}
          {Array.from({ length: 19 }, (_, index) => {
            const x = (index / 18) * WIDTH;
            return <line key={`lon-${index}`} x1={x} y1="0" x2={x} y2={HEIGHT} />;
          })}
        </g>

        {/* Equator, emphasised slightly. */}
        <line
          x1="0"
          y1={HEIGHT / 2}
          x2={WIDTH}
          y2={HEIGHT / 2}
          stroke="var(--color-line)"
          strokeWidth="0.8"
        />

        {markers.map((marker) => {
          const country = bySlug.get(marker.slug);
          if (!country) return null;

          const [x, y] = project(marker.lon, marker.lat);
          const isActive = hovered === marker.slug;
          // Marker size reflects how many cars the country contributes.
          const radius = 5 + Math.min(10, country.variant_count * 0.55);

          return (
            <Link key={marker.slug} href={`/countries/${country.slug}`}>
              <g
                onMouseEnter={() => setHovered(marker.slug)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(marker.slug)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
                role="link"
                aria-label={`${country.name}: ${country.variant_count} cars, ${country.manufacturer_count} manufacturers`}
                className="cursor-pointer focus:outline-none"
              >
                {isActive ? (
                  <circle cx={x} cy={y} r={radius * 3} fill="url(#marker-glow)" />
                ) : null}

                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  className={cn(
                    "transition-all duration-300",
                    isActive ? "fill-gold-300" : "fill-gold-600",
                  )}
                  fillOpacity={isActive ? 1 : 0.75}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 4}
                  fill="none"
                  stroke="var(--color-gold-500)"
                  strokeWidth="0.75"
                  strokeOpacity={isActive ? 0.9 : 0.25}
                  className="transition-all duration-300"
                />

                <text
                  x={x}
                  y={y - radius - 10}
                  textAnchor="middle"
                  className={cn(
                    "font-mono transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-55",
                  )}
                  fill={isActive ? "var(--color-gold-200)" : "var(--color-ink-300)"}
                  fontSize="13"
                >
                  {country.name}
                </text>

                {isActive ? (
                  <text
                    x={x}
                    y={y + radius + 20}
                    textAnchor="middle"
                    fill="var(--color-ink-400)"
                    fontSize="11"
                    className="font-mono"
                  >
                    {country.variant_count} cars · {country.manufacturer_count} makers
                  </text>
                ) : null}
              </g>
            </Link>
          );
        })}
      </svg>

      <p className="absolute right-4 bottom-3 font-mono text-[10px] text-ink-600">
        Marker size reflects the number of cars catalogued
      </p>
    </div>
  );
}
