import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";
import { CountUp, GridBackground, Reveal, ScrambleText, TiltCard } from "@/components/fx";
import type { HomeSegment } from "./home-data";

/**
 * Ways into the collection by kind of car — "shop by segment". Each tile is a
 * /cars filter, counted over the same rows the filter rail counts, and only a
 * segment with at least one car is offered (see pickSegments).
 *
 * A tile shows a real photograph of one of its cars when the catalogue has
 * one, and otherwise the segment's body-style drawing, which labels itself
 * as a drawing. Either is decorative: the tile's name is its label.
 *
 * Each tile is a HUD plate: it tilts under the pointer, its corner brackets
 * light up, its name decodes on hover and its count counts up into place.
 */

const SIZES =
  "(min-width: 1360px) 420px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 76vw";

const pad = (value: number) => String(value).padStart(2, "0");

function SegmentTile({ segment, index }: { segment: HomeSegment; index: number }) {
  const drawing = <Silhouette bodyType={segment.bodyType} fuelType={segment.fuelType} />;
  return (
    <TiltCard
      as={Link}
      href={segment.href}
      data-spotlight=""
      className="group/tile fx-card flex h-full flex-col overflow-hidden rounded-card border border-line-subtle bg-surface-1"
    >
      <span
        aria-hidden="true"
        className="hud-brackets z-20 opacity-0 transition-opacity duration-(--duration-base) [--hud-l:18px] group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
      />
      {/* Decorative: the tile's name is its label. */}
      <span
        aria-hidden="true"
        className="relative block aspect-[16/10] overflow-hidden bg-surface-2"
      >
        <span className="absolute inset-0 transition-transform duration-(--duration-normal) ease-standard group-hover/tile:scale-[1.04] motion-reduce:group-hover/tile:scale-100">
          {segment.photo ? (
            <CarPhoto src={segment.photo.url} alt="" sizes={SIZES} fallback={drawing} />
          ) : (
            drawing
          )}
        </span>
        {/* A scan glint sweeping the picture on hover. */}
        <span className="absolute inset-0 translate-y-[-110%] bg-[linear-gradient(to_bottom,transparent,oklch(0.9_0.12_205/22%)_50%,transparent)] transition-transform duration-(--duration-slow) ease-standard group-hover/tile:translate-y-[110%] motion-reduce:hidden" />
        <span className="absolute top-3 right-3 bg-void/60 px-1.5 py-1 hud-label backdrop-blur-sm">
          SEG.{pad(index + 1)}
        </span>
      </span>
      <span className="flex flex-1 items-end justify-between gap-4 p-5">
        <span className="min-w-0">
          <span className="block text-h4 transition-colors duration-(--duration-fast) group-hover/tile:text-cyan-200">
            <ScrambleText text={segment.label} trigger="hover" />
          </span>
          <span className="mt-1 block font-mono text-xs tracking-hud text-ink-400 uppercase">
            <CountUp value={formatNumber(segment.count)} className="text-ink-200" />{" "}
            {segment.count === 1 ? "car" : "cars"}
          </span>
        </span>
        <ArrowRight
          className="mb-1 size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover/tile:translate-x-1 group-hover/tile:text-cyan-300 motion-reduce:group-hover/tile:translate-x-0"
          aria-hidden="true"
        />
      </span>
    </TiltCard>
  );
}

export function CatalogueIndex({ segments }: { segments: HomeSegment[] }) {
  // Nothing to offer (the catalogue could not be read): the section would be
  // a heading over nothing, and the hero already links to the collection.
  if (segments.length === 0) return null;

  return (
    <section
      aria-labelledby="segments-heading"
      className="relative isolate py-16 lg:py-24"
    >
      <GridBackground size={48} />
      <Container className="relative">
        <Reveal variant="rise">
          <SectionHeading
            id="segments-heading"
            overline="Segments"
            code="02"
            scramble
            title="Find your kind of car"
            actionHref="/cars"
            actionLabel="All cars"
          />
        </Reveal>
        {/* Phones: a swipeable row. From sm: a grid, every tile whole. */}
        <Reveal
          as="ul"
          stagger
          className="-mx-5 mt-10 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:p-0 lg:grid-cols-3 lg:gap-6"
        >
          {segments.map((segment, index) => (
            <li
              key={segment.href}
              className="w-[76%] max-w-80 shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <SegmentTile segment={segment} index={index} />
            </li>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
