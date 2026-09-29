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
 * The world map: a dot-matrix of the continents with one glowing marker per
 * catalogued country, sized by how many cars it has, breathing softly, and
 * dashed arcs racing between neighbouring markers (decoration: they say
 * nothing about the data beyond "these countries are in the catalogue").
 *
 * Each marker is ONE link (the old map nested a focusable <g role="link"> in
 * the link, so every marker cost two tab stops and the inner one did nothing).
 * Hovering or focusing a marker lifts it and opens a HUD hover card; the
 * same state is shared with the country cards below the map (see
 * CountryAtlas), so hovering a card lights its marker and vice versa.
 *
 * Everything the map says is also in the card grid, which is what small
 * screens get instead: the map is hidden below `md`. All animation is CSS
 * (opacity and stroke-dashoffset) and stops under reduced motion.
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

/**
 * Arcs between markers in longitude order — each to the next one east of
 * it — bowing toward the pole, like flight paths. Purely decorative.
 */
function connectionArcs(points: readonly { x: number; y: number }[]): string[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const arcs: string[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const from = sorted[index];
    const to = sorted[index + 1];
    if (!from || !to) continue;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 6) continue;
    const lift = Math.min(90, distance * 0.28);
    const cx = (from.x + to.x) / 2;
    const cy = (from.y + to.y) / 2 - lift;
    arcs.push(
      `M${from.x.toFixed(1)} ${from.y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
    );
  }
  return arcs;
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
    glow: `${uid}-glow`,
  };

  const land = useMemo(() => landPath(), []);
  const { placed, unplaced } = useMemo(() => placeMarkers(countries), [countries]);
  const arcs = useMemo(() => connectionArcs(placed), [placed]);
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
                fill="oklch(0.45 0.045 235)"
              />
            </pattern>
            <clipPath id={ids.land}>
              <path d={land} />
            </clipPath>
            <radialGradient id={ids.glow}>
              <stop offset="0%" stopColor="var(--color-cyan-300)" stopOpacity="0.55" />
              <stop offset="60%" stopColor="var(--color-cyan-400)" stopOpacity="0.14" />
              <stop offset="100%" stopColor="var(--color-cyan-400)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Graticule: a faint technical grid every 30 degrees. */}
          <g
            stroke="oklch(0.83 0.13 210 / 10%)"
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
                  stroke={lat === 0 ? "oklch(0.83 0.13 210 / 22%)" : undefined}
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

          {/* Connection arcs: dashes racing along each path. */}
          <g
            aria-hidden="true"
            fill="none"
            stroke="oklch(0.83 0.13 210 / 38%)"
            strokeWidth="0.9"
            strokeLinecap="round"
          >
            {arcs.map((d, index) => (
              <path
                key={index}
                d={d}
                strokeDasharray="4 8"
                className="animate-hud-dash"
                style={{ animationDelay: `${index * -700}ms` }}
              />
            ))}
          </g>

          {/* Glow halos, breathing, under the markers. */}
          <g aria-hidden="true">
            {placed.map((marker, index) => {
              const radius = markerRadius(marker.country.variant_count);
              return (
                <circle
                  key={marker.slug}
                  cx={marker.x}
                  cy={marker.y}
                  r={radius * 2.6}
                  fill={`url(#${ids.glow})`}
                  className="animate-pulse-glow"
                  style={{ animationDelay: `${index * -400}ms` }}
                />
              );
            })}
          </g>

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
                    stroke={isActive ? "var(--color-cyan-200)" : "var(--color-cyan-400)"}
                    strokeWidth={isActive ? 1.2 : 0.8}
                    strokeOpacity={isActive ? 0.95 : 0.45}
                    className="pointer-events-none transition-[stroke-opacity] duration-(--duration-fast)"
                  />
                  <circle
                    r={radius}
                    className={cn(
                      "pointer-events-none transition-[fill] duration-(--duration-fast)",
                      isActive ? "fill-cyan-100" : "fill-cyan-300",
                    )}
                  />
                  {/* Keyboard focus ring: SVG links draw no outline of their own. */}
                  <circle
                    r={radius + 7.5}
                    fill="none"
                    stroke="var(--color-cyan-300)"
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
                    fontSize="12"
                    letterSpacing="1"
                    className={cn(
                      "font-mono transition-[fill] duration-(--duration-fast)",
                      isActive ? "fill-cyan-100" : "fill-ink-300",
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
            <g aria-hidden="true" className="pointer-events-none">
              <circle
                cx={active.x}
                cy={active.y}
                r={activeRadius + 3.5}
                fill="none"
                stroke="var(--color-cyan-200)"
                strokeWidth="1.2"
              />
              {/* A spinning dashed reticle around the active marker. */}
              <circle
                cx={active.x}
                cy={active.y}
                r={activeRadius + 12}
                fill="none"
                stroke="var(--color-cyan-300)"
                strokeWidth="0.9"
                strokeDasharray="3 5"
                className="origin-center animate-spin-slow [transform-box:fill-box]"
              />
            </g>
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
            <div className="relative rounded-card p-4 shadow-overlay hud-panel [--panel-bg:oklch(0.16_0.025_245/92%)]">
              <span aria-hidden="true" className="hud-brackets -m-px [--hud-l:10px]" />
              <p className="flex items-center gap-2.5 text-h4">
                <span className="text-xl leading-none">{active.country.flag_emoji}</span>
                <span className="min-w-0 truncate">{active.country.name}</span>
              </p>
              <p className="mt-1.5 font-mono text-[11px] tracking-hud text-cyan-200 uppercase">
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
            <circle cx="5" cy="6" r="2.5" className="fill-cyan-300" />
            <circle cx="22" cy="6" r="5" className="fill-cyan-300" />
          </svg>
          Marker area grows with the number of catalogued cars.
        </span>
        <span>
          Land: Natural Earth 1:110m (public domain). Markers are approximate centroids;
          the arcs are decoration.
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
