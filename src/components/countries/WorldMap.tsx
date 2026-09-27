"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CELL,
  MAP_HEIGHT,
  MAP_WIDTH,
  hoverCardPlacement,
  landPath,
  markerRadius,
  placeMarkers,
  project,
} from "./atlas";
import type { CountryListItem } from "@/lib/queries/countries";

/**
 * The world map: a dot-matrix of the continents with one marker per
 * catalogued country, sized by how many cars it has.
 *
 * Each marker is ONE link (the old map nested a focusable <g role="link"> in
 * the link, so every marker cost two tab stops and the inner one did nothing).
 * Hovering or focusing a marker lifts it and opens a hover card; the same
 * state is shared with the country cards below the map (see CountryAtlas),
 * so hovering a card lights its marker and vice versa.
 *
 * Everything the map says is also in the card grid, which is what small
 * screens get instead: the map is hidden below `md`.
 */

const GRATICULE_LONGITUDES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRATICULE_LATITUDES = [60, 30, 0, -30];

const LABEL_OFFSET = 7;

function labelPosition(side: "left" | "right" | "top" | "bottom", radius: number) {
  const gap = radius + LABEL_OFFSET;
  switch (side) {
    case "left":
      return { x: -gap, y: 3.5, anchor: "end" as const };
    case "top":
      return { x: 0, y: -gap - 1, anchor: "middle" as const };
    case "bottom":
      return { x: 0, y: gap + 8, anchor: "middle" as const };
    default:
      return { x: gap, y: 3.5, anchor: "start" as const };
  }
}

export function WorldMap({
  countries,
  activeSlug,
  onActiveChange,
  className,
}: {
  countries: CountryListItem[];
  activeSlug: string | null;
  onActiveChange: (slug: string | null) => void;
  className?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = {
    title: `${uid}-title`,
    dots: `${uid}-dots`,
    land: `${uid}-land`,
  };

  const land = useMemo(() => landPath(), []);
  const { placed, unplaced } = useMemo(() => placeMarkers(countries), [countries]);
  const active = placed.find((marker) => marker.slug === activeSlug) ?? null;
  const card = active ? hoverCardPlacement(active.x, active.y) : null;

  const activeRadius = active ? markerRadius(active.country.variant_count) : 0;

  return (
    <figure className={cn("relative", className)}>
      <div className="relative">

        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT.toFixed(2)}`}
          className="block h-auto w-full"
          aria-labelledby={ids.title}
        >
          <title id={ids.title}>
            World map of the countries in the catalogue. Each marker is a link to that
            country.
          </title>
          <defs>
            <pattern
              id={ids.dots}
              width={CELL}
              height={CELL}
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx={CELL / 2}
                cy={CELL / 2}
                r={CELL * 0.24}
                fill="var(--color-ink-600)"
              />
            </pattern>
            <clipPath id={ids.land}>
              <path d={land} />
            </clipPath>
          </defs>

          {/* Graticule: a faint technical grid every 30 degrees. */}
          <g
            stroke="var(--color-line-subtle)"
            strokeWidth="0.6"
            fill="none"
            aria-hidden="true"
          >
            {GRATICULE_LONGITUDES.map((lon) => {
              const { x } = project(lon, 0);
              return <line key={`lon${lon}`} x1={x} y1={0} x2={x} y2={MAP_HEIGHT} />;
            })}
            {GRATICULE_LATITUDES.map((lat) => {
              const { y } = project(0, lat);
              return (
                <line
                  key={`lat${lat}`}
                  x1={0}
                  y1={y}
                  x2={MAP_WIDTH}
                  y2={y}
                  strokeDasharray={lat === 0 ? undefined : "2 6"}
                  stroke={lat === 0 ? "var(--color-line)" : undefined}
                />
              );
            })}
          </g>

          {/* Land: one whole dot per land cell. */}
          <rect
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            fill={`url(#${ids.dots})`}
            clipPath={`url(#${ids.land})`}
            aria-hidden="true"
          />

          {/* The markers keep a fixed DOM order (moving the focused one would
              break the Tab order), so the active highlight ring is drawn in a
              layer above them. */}

          {placed.map((marker) => {
            const { country } = marker;
            const isActive = marker.slug === activeSlug;
            const radius = markerRadius(country.variant_count);
            const label = labelPosition(marker.label, radius);
            const name = `${country.name}: ${country.manufacturer_count} ${
              country.manufacturer_count === 1 ? "manufacturer" : "manufacturers"
            }, ${country.variant_count} ${country.variant_count === 1 ? "car" : "cars"}`;

            return (
              <Link
                key={marker.slug}
                href={`/countries/${country.slug}`}
                aria-label={name}
                className="group outline-none"
                onMouseEnter={() => onActiveChange(marker.slug)}
                onMouseLeave={() => onActiveChange(null)}
                onFocus={() => onActiveChange(marker.slug)}
                onBlur={() => onActiveChange(null)}
              >
                <g transform={`translate(${marker.x.toFixed(2)} ${marker.y.toFixed(2)})`}>
                  {/* Decoration never takes the pointer, so a marker's rings
                      cannot steal the hover from a close neighbour in Europe. */}
                  <circle
                    r={radius + 3.5}
                    fill="none"
                    stroke={isActive ? "var(--color-gold-400)" : "var(--color-ink-400)"}
                    strokeWidth={isActive ? 1.2 : 0.8}
                    strokeOpacity={isActive ? 0.95 : 0.4}
                    className="pointer-events-none transition-[stroke-opacity] duration-(--duration-fast)"
                  />
                  <circle
                    r={radius}
                    className={cn(
                      "pointer-events-none transition-[fill] duration-(--duration-fast)",
                      isActive ? "fill-gold-400" : "fill-ink-200",
                    )}
                  />
                  {/* Keyboard focus ring: SVG links draw no outline of their own. */}
                  <circle
                    r={radius + 7.5}
                    fill="none"
                    stroke="var(--color-gold-500)"
                    strokeWidth="2"
                    className="pointer-events-none opacity-0 group-focus-visible:opacity-100"
                  />
                  {/* The hit area: a little larger than the marker (small ones
                      are hard to hover), but never reaching a neighbour's. */}
                  <circle r={Math.max(radius + 3, 9)} fill="transparent" />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    fontSize="13"
                    className={cn(
                      "font-sans transition-[fill] duration-(--duration-fast)",
                      isActive ? "fill-ink-50" : "fill-ink-400",
                    )}
                    aria-hidden="true"
                  >
                    {country.iso_code}
                  </text>
                </g>
              </Link>
            );
          })}

          {active ? (
            <circle
              cx={active.x}
              cy={active.y}
              r={activeRadius + 3.5}
              fill="none"
              stroke="var(--color-gold-400)"
              strokeWidth="1.2"
              className="pointer-events-none"
              aria-hidden="true"
            />
          ) : null}
        </svg>

        {/* Hover card. Informational only (the marker is the link), so it never
            takes the pointer and screen readers get the marker's label instead. */}
        {active && card ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-(--z-raised) w-60 animate-overlay-in"
            style={{
              left: `${card.left * 100}%`,
              top: `${card.top * 100}%`,
              transform: `translate(${card.alignRight ? "calc(-100% - 18px)" : "18px"}, ${
                card.below ? "14px" : "calc(-100% - 14px)"
              })`,
            }}
          >
            <div className="rounded-card border border-line bg-surface-2 p-4 shadow-overlay">
              <p className="flex items-center gap-2.5 text-h4">
                <span className="text-xl leading-none">{active.country.flag_emoji}</span>
                <span className="min-w-0 truncate">{active.country.name}</span>
              </p>
              <p className="mt-1 text-caption">
                {active.country.manufacturer_count}{" "}
                {active.country.manufacturer_count === 1 ? "brand" : "brands"} ·{" "}
                {active.country.variant_count}{" "}
                {active.country.variant_count === 1 ? "car" : "cars"}
              </p>
              {active.country.makers.length > 0 ? (
                <p className="mt-3 line-clamp-2 text-body-s text-ink-200">
                  {active.country.makers.map((maker) => maker.name).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-caption">
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 34 12" className="h-3 w-8" aria-hidden="true">
            <circle cx="5" cy="6" r="2.5" className="fill-ink-200" />
            <circle cx="22" cy="6" r="5" className="fill-ink-200" />
          </svg>
          Marker area grows with the number of catalogued cars.
        </span>
        <span>
          Land: Natural Earth 1:110m (public domain). Markers are approximate centroids.
        </span>
        {unplaced.length > 0 ? (
          <span className="w-full">
            Not on the map (no coordinates recorded):{" "}
            {unplaced.map((country) => country.name).join(", ")}. They are listed below.
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
