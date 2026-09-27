"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { carDisplayName, distinctVariantName } from "@/lib/format";
import { useCatalogCards, useRecentlyViewed } from "@/lib/favorites/recent-hooks";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { Container } from "@/components/ui/Container";
import { carHref } from "@/components/cars/CarCard";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";

/**
 * "Continue where you left off": the cars this visitor opened recently (this
 * device's history, merged with the account's when signed in).
 *
 * Renders nothing at all until there is at least one car to show — a
 * first-time visitor never sees an empty shelf — and it sits low on the page,
 * below the first screen, so appearing after hydration shifts nothing the
 * visitor is looking at.
 */

const SHOWN = 6;
const SIZES = "(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw";

function Tile({ car }: { car: CatalogCardRow }) {
  const name = carDisplayName(car.manufacturer_name, car.model_name, car.variant_name);
  const variant = distinctVariantName(car.model_name, car.variant_name);
  return (
    <Link
      href={carHref(car)}
      className="group block h-full border border-line bg-surface-1/60 transition-colors hover:border-gold-700/70 focus-visible:border-gold-600"
    >
      <span className="relative block aspect-[16/10] overflow-hidden bg-surface-2">
        {car.primary_image_url ? (
          <CarPhoto
            src={car.primary_image_url}
            alt=""
            sizes={SIZES}
            fallback={<Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />}
          />
        ) : (
          <Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />
        )}
      </span>
      <span className="block px-3 pt-2.5 pb-3">
        <span className="block truncate text-label text-nano">
          {car.manufacturer_name}
        </span>
        <span className="mt-1 block truncate font-display text-[11px] tracking-[0.04em] text-ink-50 transition-colors group-hover:text-gold-300">
          <span className="sr-only">{name}</span>
          <span aria-hidden="true">
            {car.model_name}
            {variant ? <span className="text-ink-400"> {variant}</span> : null}
          </span>
        </span>
      </span>
    </Link>
  );
}

export function RecentlyViewedStrip() {
  const { entries } = useRecentlyViewed();
  const cards = useCatalogCards(entries.slice(0, SHOWN).map((entry) => entry.id));
  const ready = cards.flatMap(({ id, entry }) =>
    entry.status === "ready" ? [{ id, car: entry.car }] : [],
  );
  if (ready.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-heading"
      className="animate-rise-in border-t border-line py-16 sm:py-20"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label">Continue where you left off</p>
            <h2
              id="recent-heading"
              className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
            >
              Recently viewed
            </h2>
          </div>
          <Link
            href="/favorites#recently-viewed-heading"
            className="inline-flex min-h-11 items-center gap-2 font-display text-micro tracking-button text-gold-300 uppercase transition-colors hover:text-gold-200"
          >
            Your history
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ready.map(({ id, car }) => (
            <li key={id}>
              <Tile car={car} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
