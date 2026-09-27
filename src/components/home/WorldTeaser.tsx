import Link from "next/link";
import { ArrowRight, Globe2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { CountryListItem } from "@/lib/queries/countries";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Monogram } from "@/components/manufacturers/Monogram";
import {
  CELL,
  MAP_HEIGHT,
  MAP_WIDTH,
  landPath,
  markerRadius,
  placeMarkers,
} from "@/components/countries/atlas";
import { stripOrder } from "./home-data";

/**
 * Explore by country (a light, static teaser of the /countries world map)
 * and the manufacturers strip. Both are plain server-rendered links; the
 * interactive map lives on its own page.
 */

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

function MiniMap({ countries }: { countries: CountryListItem[] }) {
  const { placed } = placeMarkers(countries);
  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT.toFixed(1)}`}
      className="block h-auto w-full"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="home-map-dots"
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
        <clipPath id="home-map-land">
          <path d={landPath()} />
        </clipPath>
      </defs>
      <rect
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        fill="url(#home-map-dots)"
        clipPath="url(#home-map-land)"
        opacity={0.7}
      />
      {placed.map((marker) => {
        const radius = markerRadius(marker.country.variant_count);
        return (
          <g key={marker.slug}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius * 2.4}
              fill="var(--color-gold-500)"
              opacity={0.12}
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius}
              fill="var(--color-gold-500)"
              stroke="var(--color-gold-200)"
              strokeWidth={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function WorldTeaser({
  countries,
  manufacturers,
}: {
  countries: CountryListItem[];
  manufacturers: ManufacturerListItem[];
}) {
  // Countries that actually have cars, most catalogued first.
  const ranked = countries
    .filter((country) => country.variant_count > 0)
    .sort((a, b) => b.variant_count - a.variant_count || a.name.localeCompare(b.name));
  const makers = stripOrder(manufacturers);

  return (
    <section
      aria-labelledby="world-heading"
      className="border-t border-line py-20 sm:py-24"
    >
      <Container>
        <SectionHeading
          overline="Explore by country"
          title={<span id="world-heading">Where the cars come from</span>}
          description="Every car sits under the country its manufacturer comes from, so a nation's engineering tradition is one click away."
          action={
            <ButtonLink href="/countries" variant="secondary" size="sm">
              <Globe2 className="size-3.5" aria-hidden="true" />
              Open the world map
            </ButtonLink>
          }
        />

        {ranked.length === 0 ? (
          <p className="mt-10 border border-dashed border-line px-6 py-8 text-sm text-ink-400">
            No countries could be read from the catalogue just now.{" "}
            <Link
              href="/countries"
              className="text-gold-300 underline underline-offset-4"
            >
              Try the world map
            </Link>
            .
          </p>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
            {/* A pointer shortcut only: the same link is the button above, so
                keyboard and screen-reader users are not given it twice. */}
            <Link
              href="/countries"
              tabIndex={-1}
              aria-hidden="true"
              className="group relative block overflow-hidden border border-line bg-surface-1/60 p-3 transition-colors hover:border-gold-700/70 sm:p-5"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-2 opacity-60 hud-corners"
              />
              <MiniMap countries={ranked} />
              <span className="absolute bottom-3 left-4 font-mono text-micro tracking-hud text-ink-400 uppercase transition-colors group-hover:text-gold-300 sm:bottom-4 sm:left-6">
                {plural(ranked.length, "country", "countries")} ·{" "}
                {plural(
                  ranked.reduce((sum, country) => sum + country.variant_count, 0),
                  "car",
                  "cars",
                )}
              </span>
            </Link>

            <ul className="grid grid-cols-1 border-t border-line-subtle sm:grid-cols-2 lg:grid-cols-1">
              {ranked.slice(0, 6).map((country) => (
                <li key={country.id} className="border-b border-line-subtle">
                  <Link
                    href={`/countries/${country.slug}`}
                    className="group flex min-h-14 items-center gap-4 py-3 pr-2 transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className="w-7 shrink-0 text-xl leading-none"
                    >
                      {country.flag_emoji ?? ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-xs tracking-[0.08em] text-ink-50 uppercase transition-colors group-hover:text-gold-300">
                        {country.name}
                      </span>
                      <span className="mt-1 block font-mono text-micro text-ink-400">
                        {plural(country.manufacturer_count, "maker", "makers")} ·{" "}
                        {plural(country.variant_count, "car", "cars")}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-3.5 shrink-0 text-ink-600 transition-colors group-hover:text-gold-400"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ------------------------------------------------ Manufacturers */}
        <div className="mt-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-label">Manufacturers</p>
              <h3 className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50">
                The marques
              </h3>
            </div>
            <Link
              href="/manufacturers"
              className="inline-flex min-h-11 items-center gap-2 font-display text-micro tracking-button text-gold-300 uppercase transition-colors hover:text-gold-200"
            >
              {manufacturers.length > 0
                ? `All ${formatNumber(manufacturers.length)} manufacturers`
                : "All manufacturers"}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {makers.length === 0 ? (
            <p className="mt-6 text-sm text-ink-400">
              No manufacturers could be read from the catalogue just now.
            </p>
          ) : (
            <div className="relative mt-6">
              {/* More marques to the right: a fade says the row scrolls. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-void to-transparent max-lg:hidden"
              />
              <ul
                aria-label="Manufacturers, most catalogued cars first"
                className="-mx-5 flex snap-x snap-mandatory scroll-px-5 [scrollbar-width:thin] gap-3 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:scroll-px-0 lg:px-0"
              >
                {makers.map((maker) => (
                  <li key={maker.id} className="w-40 shrink-0 snap-start sm:w-44">
                    <Link
                      href={`/manufacturers/${maker.slug}`}
                      className="group flex h-full flex-col gap-4 border border-line bg-surface-1/60 p-4 transition-colors hover:border-gold-700/70 hover:bg-surface-2/60"
                    >
                      <Monogram name={maker.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[11px] tracking-[0.08em] text-ink-50 uppercase transition-colors group-hover:text-gold-300">
                          {maker.name}
                        </span>
                        <span className="mt-1.5 block truncate font-mono text-micro text-ink-400">
                          {maker.country?.flag_emoji ? (
                            <span aria-hidden="true">{maker.country.flag_emoji} </span>
                          ) : null}
                          {plural(maker.variant_count, "car", "cars")}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
