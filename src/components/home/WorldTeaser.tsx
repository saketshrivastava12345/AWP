import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { CountryListItem } from "@/lib/queries/countries";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  GlowOrbs,
  GridBackground,
  Parallax,
  Reveal,
  ScrambleText,
  Spotlight,
  TiltCard,
} from "@/components/fx";
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
 * Two ways in by origin: an editorial split with a static world map (cyan
 * markers pulsing over a dotted globe, drifting on a slow parallax) beside
 * the countries with the most catalogued cars, then the brands as tilting
 * HUD plates. Both are plain server-rendered links; the interactive map
 * lives on /countries.
 */

/** Brands shown on the home page; the rest are one link away. */
const BRANDS_SHOWN = 12;

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

const pad = (value: number) => String(value).padStart(2, "0");

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
            fill="var(--color-cyan-300)"
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
        opacity={0.28}
      />
      {placed.map((marker) => {
        const radius = markerRadius(marker.country.variant_count);
        return (
          <g key={marker.slug}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius * 2.6}
              fill="var(--color-cyan-400)"
              opacity={0.14}
              className="animate-pulse-glow"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius * 1.7}
              fill="none"
              stroke="var(--color-cyan-300)"
              strokeWidth={1}
              opacity={0.55}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={marker.x}
              cy={marker.y}
              r={radius}
              fill="var(--color-cyan-200)"
              style={{ filter: "drop-shadow(0 0 6px var(--color-cyan-400))" }}
            />
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
    <section
      aria-labelledby="world-heading"
      className="relative isolate overflow-hidden py-16 lg:py-24"
    >
      <GlowOrbs tone="cyan" />
      <GridBackground size={56} />
      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="min-w-0">
            <Reveal variant="rise">
              <SectionHeading
                id="world-heading"
                overline="Origins"
                code="04"
                scramble
                title="Where the cars come from"
                description="Every car sits under its maker's country, so a nation's engineering tradition is one click away."
              />
            </Reveal>

            {ranked.length === 0 ? (
              <p className="mt-8 text-body">
                No countries could be read from the catalogue just now.
              </p>
            ) : (
              <Reveal as="ul" stagger className="mt-8 border-t border-line-subtle">
                {ranked.slice(0, 6).map((country, index) => (
                  <li key={country.id} className="border-b border-line-subtle">
                    <Link
                      href={`/countries/${country.slug}`}
                      className="group flex min-h-16 items-center gap-4 py-3"
                    >
                      <span
                        aria-hidden="true"
                        className="w-6 shrink-0 hud-label text-ink-600"
                      >
                        {pad(index + 1)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="w-7 shrink-0 text-2xl leading-none"
                      >
                        {country.flag_emoji ?? ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-h4 transition-colors duration-(--duration-fast) group-hover:text-cyan-200">
                          {country.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-xs tracking-hud text-ink-400 uppercase">
                          {plural(country.manufacturer_count, "brand", "brands")} ·{" "}
                          {plural(country.variant_count, "car", "cars")}
                        </span>
                      </span>
                      <ArrowRight
                        className="size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover:translate-x-1 group-hover:text-cyan-300 motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </Reveal>
            )}

            <ButtonLink href="/countries" variant="link" className="mt-6">
              {ranked.length > 0
                ? `All ${plural(ranked.length, "country", "countries")}`
                : "Open the world map"}
            </ButtonLink>
          </div>

          {ranked.length > 0 ? (
            <Reveal variant="scale" className="lg:order-first">
              <Parallax speed={-0.08}>
                {/* A pointer shortcut only: the same destination is the link
                    above, so keyboard and screen-reader users meet it once. */}
                <Link
                  href="/countries"
                  tabIndex={-1}
                  aria-hidden="true"
                  className="relative block rounded-card opacity-90 transition-opacity duration-(--duration-fast) hover:opacity-100"
                >
                  <span className="hud-brackets [--hud-c:oklch(0.83_0.13_210/55%)] [--hud-l:20px]" />
                  <span className="absolute top-3 left-4 hud-label">MAP // Origins</span>
                  <span className="block p-4 sm:p-6">
                    <MiniMap countries={ranked} />
                  </span>
                </Link>
              </Parallax>
            </Reveal>
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
    <section
      aria-labelledby="brands-heading"
      data-spotlight=""
      className="relative isolate py-16 lg:py-24"
    >
      <GridBackground size={48} />
      <Spotlight rest="50% 20%" />
      <Container className="relative">
        <Reveal variant="rise">
          <SectionHeading
            id="brands-heading"
            overline="Brands"
            code="05"
            scramble
            title="Brands in the collection"
            description="Most catalogued first."
            actionHref="/manufacturers"
            actionLabel={
              manufacturers.length > 0
                ? `All ${formatNumber(manufacturers.length)} brands`
                : "All brands"
            }
          />
        </Reveal>

        {shown.length === 0 ? (
          <p className="mt-10 text-body">
            No brands could be read from the catalogue just now.
          </p>
        ) : (
          <Reveal
            as="ul"
            stagger={60}
            className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-5"
          >
            {shown.map((maker, index) => (
              <li key={maker.id}>
                <TiltCard
                  as={Link}
                  href={`/manufacturers/${maker.slug}`}
                  data-spotlight=""
                  className="group/brand fx-card flex h-full min-h-28 flex-col justify-between gap-4 rounded-card border border-line-subtle bg-surface-1 p-4 sm:p-5"
                >
                  <span
                    aria-hidden="true"
                    className="hud-brackets opacity-0 transition-opacity duration-(--duration-base) group-hover/brand:opacity-100 group-focus-visible/brand:opacity-100"
                  />
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    {/* Michroma is wide: a long name may break mid-word on a phone
                        rather than push the code out of the plate. */}
                    <span className="min-w-0 font-hud text-xs tracking-hud [overflow-wrap:anywhere] text-ink-50 uppercase transition-colors duration-(--duration-fast) group-hover/brand:text-cyan-200 sm:text-[13px]">
                      <ScrambleText text={maker.name} trigger="hover" />
                    </span>
                    <span aria-hidden="true" className="shrink-0 hud-label text-ink-600">
                      {pad(index + 1)}
                    </span>
                  </span>
                  <span className="font-mono text-xs tracking-hud text-ink-400 uppercase">
                    {maker.country?.name ? `${maker.country.name} · ` : null}
                    {plural(maker.variant_count, "car", "cars")}
                  </span>
                </TiltCard>
              </li>
            ))}
          </Reveal>
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
