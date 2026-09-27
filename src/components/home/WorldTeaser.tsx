import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { CountryListItem } from "@/lib/queries/countries";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
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
 * Two ways in by origin: an editorial split with a quiet, static world map
 * beside the countries with the most catalogued cars, then a grid of the
 * brands. Both are plain server-rendered links; the interactive map lives on
 * /countries.
 */

/** Brands shown on the home page; the rest are one link away. */
const BRANDS_SHOWN = 12;

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
        opacity={0.6}
      />
      {placed.map((marker) => {
        const radius = markerRadius(marker.country.variant_count);
        return (
          <g key={marker.slug}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius * 2.2}
              fill="var(--color-ink-50)"
              opacity={0.08}
            />
            <circle cx={marker.x} cy={marker.y} r={radius} fill="var(--color-ink-100)" />
          </g>
        );
      })}
    </svg>
  );
}

function Countries({ countries }: { countries: CountryListItem[] }) {
  // Countries that actually have cars, most catalogued first.
  const ranked = countries
    .filter((country) => country.variant_count > 0)
    .sort((a, b) => b.variant_count - a.variant_count || a.name.localeCompare(b.name));

  return (
    <section aria-labelledby="world-heading" className="py-16 lg:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="min-w-0">
            <SectionHeading
              id="world-heading"
              title="Where the cars come from"
              description="Every car sits under its maker's country, so a nation's engineering tradition is one click away."
            />

            {ranked.length === 0 ? (
              <p className="mt-8 text-body">
                No countries could be read from the catalogue just now.
              </p>
            ) : (
              <ul className="mt-8 border-t border-line-subtle">
                {ranked.slice(0, 6).map((country) => (
                  <li key={country.id} className="border-b border-line-subtle">
                    <Link
                      href={`/countries/${country.slug}`}
                      className="group flex min-h-16 items-center gap-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className="w-7 shrink-0 text-2xl leading-none"
                      >
                        {country.flag_emoji ?? ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-h4">{country.name}</span>
                        <span className="mt-0.5 block text-caption">
                          {plural(country.manufacturer_count, "brand", "brands")} ·{" "}
                          {plural(country.variant_count, "car", "cars")}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover:translate-x-1 group-hover:text-ink-50 motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <ButtonLink href="/countries" variant="link" className="mt-6">
              {ranked.length > 0
                ? `All ${plural(ranked.length, "country", "countries")}`
                : "Open the world map"}
            </ButtonLink>
          </div>

          {ranked.length > 0 ? (
            // A pointer shortcut only: the same destination is the link
            // above, so keyboard and screen-reader users meet it once.
            <Link
              href="/countries"
              tabIndex={-1}
              aria-hidden="true"
              className="block opacity-90 transition-opacity duration-(--duration-fast) hover:opacity-100 lg:order-first"
            >
              <MiniMap countries={ranked} />
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

function Brands({ manufacturers }: { manufacturers: ManufacturerListItem[] }) {
  const makers = stripOrder(manufacturers);
  const shown = makers.slice(0, BRANDS_SHOWN);

  return (
    <section aria-labelledby="brands-heading" className="py-16 lg:py-24">
      <Container>
        <SectionHeading
          id="brands-heading"
          title="Brands in the collection"
          description="Most catalogued first."
          actionHref="/manufacturers"
          actionLabel={
            manufacturers.length > 0
              ? `All ${formatNumber(manufacturers.length)} brands`
              : "All brands"
          }
        />

        {shown.length === 0 ? (
          <p className="mt-10 text-body">
            No brands could be read from the catalogue just now.
          </p>
        ) : (
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {shown.map((maker) => (
              <li key={maker.id}>
                <Link
                  href={`/manufacturers/${maker.slug}`}
                  className="group flex h-full min-h-28 flex-col justify-between gap-4 rounded-card bg-surface-1 p-4 transition-colors duration-(--duration-fast) hover:bg-surface-2 sm:p-5"
                >
                  <span className="text-h4">{maker.name}</span>
                  <span className="text-caption">
                    {maker.country?.name ? `${maker.country.name} · ` : null}
                    {plural(maker.variant_count, "car", "cars")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </section>
  );
}

export function WorldTeaser({
  countries,
  manufacturers,
}: {
  countries: CountryListItem[];
  manufacturers: ManufacturerListItem[];
}) {
  return (
    <>
      <Countries countries={countries} />
      <Brands manufacturers={manufacturers} />
    </>
  );
}
