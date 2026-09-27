import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";
import type { HomeSegment } from "./home-data";

/**
 * Ways into the collection by kind of car — "shop by segment". Each tile is a
 * /cars filter, counted over the same rows the filter rail counts, and only a
 * segment with at least one car is offered (see pickSegments).
 *
 * A tile shows a real photograph of one of its cars when the catalogue has
 * one, and otherwise the segment's body-style drawing, which labels itself
 * as a drawing. Either is decorative: the tile's name is its label.
 */

const SIZES = "(min-width: 1360px) 420px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 76vw";

function SegmentTile({ segment }: { segment: HomeSegment }) {
  const drawing = <Silhouette bodyType={segment.bodyType} fuelType={segment.fuelType} />;
  return (
    <Link
      href={segment.href}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface-1 transition-colors duration-(--duration-fast) hover:bg-surface-2"
    >
      {/* Decorative: the tile's name is its label. */}
      <span
        aria-hidden="true"
        className="relative block aspect-[16/10] overflow-hidden bg-surface-2"
      >
        <span className="absolute inset-0 transition-transform duration-(--duration-normal) ease-standard group-hover:scale-[1.03] motion-reduce:group-hover:scale-100">
          {segment.photo ? (
            <CarPhoto
              src={segment.photo.url}
              alt=""
              sizes={SIZES}
              fallback={drawing}
            />
          ) : (
            drawing
          )}
        </span>
      </span>
      <span className="flex flex-1 items-end justify-between gap-4 p-5">
        <span className="min-w-0">
          <span className="block text-h4">{segment.label}</span>
          <span className="mt-1 block text-body-s text-ink-400">
            {formatNumber(segment.count)} {segment.count === 1 ? "car" : "cars"}
          </span>
        </span>
        <ArrowRight
          className="mb-1 size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover:translate-x-1 group-hover:text-ink-50 motion-reduce:group-hover:translate-x-0"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

export function CatalogueIndex({ segments }: { segments: HomeSegment[] }) {
  // Nothing to offer (the catalogue could not be read): the section would be
  // a heading over nothing, and the hero already links to the collection.
  if (segments.length === 0) return null;

  return (
    <section aria-labelledby="segments-heading" className="py-16 lg:py-24">
      <Container>
        <SectionHeading
          id="segments-heading"
          title="Find your kind of car"
          actionHref="/cars"
          actionLabel="All cars"
        />
        {/* Phones: a swipeable row. From sm: a grid, every tile whole. */}
        <ul
          className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:p-0 lg:grid-cols-3 lg:gap-6"
        >
          {segments.map((segment) => (
            <li
              key={segment.href}
              className="w-[76%] max-w-80 shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <SegmentTile segment={segment} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
