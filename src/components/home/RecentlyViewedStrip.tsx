"use client";

import { carDisplayName } from "@/lib/format";
import { useCatalogCards, useRecentlyViewed } from "@/lib/favorites/recent-hooks";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarCard } from "@/components/cars/CarCard";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { CardCarousel } from "@/components/cars/catalogue/CardCarousel";

/**
 * "Continue where you left off": the cars this visitor opened recently (this
 * device's history, merged with the account's when signed in), as a snap row
 * of the same car cards the rest of the site uses.
 *
 * Renders nothing at all until there is at least one car to show — a
 * first-time visitor never sees an empty shelf — and it sits low on the page,
 * below the first screen, so appearing after hydration shifts nothing the
 * visitor is looking at.
 */

const SHOWN = 6;
const SIZES =
  "(min-width: 1360px) 400px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 82vw";

export function RecentlyViewedStrip() {
  const { entries } = useRecentlyViewed();
  const cards = useCatalogCards(entries.slice(0, SHOWN).map((entry) => entry.id));
  const ready = cards.flatMap(({ id, entry }) =>
    entry.status === "ready" ? [{ id, car: entry.car }] : [],
  );
  if (ready.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="animate-rise-in py-16 lg:py-24">
      <Container>
        <SectionHeading
          id="recent-heading"
          overline="History"
          code="09"
          scramble
          title="Recently viewed"
          actionHref="/favorites#recently-viewed-heading"
          actionLabel="Your history"
        />
        <CardCarousel label="Recently viewed cars" className="mt-10">
          {ready.map(({ id, car }) => (
            <li
              key={id}
              className="w-[70%] shrink-0 snap-start sm:w-[calc((100%-3rem)/3.2)] lg:w-[calc((100%-4.5rem)/4)]"
            >
              <CarCard
                car={car}
                variant="compact"
                sizes={SIZES}
                actions={
                  <FavoriteToggle
                    appearance="icon"
                    variantId={id}
                    carName={carDisplayName(
                      car.manufacturer_name,
                      car.model_name,
                      car.variant_name,
                    )}
                  />
                }
              />
            </li>
          ))}
        </CardCarousel>
      </Container>
    </section>
  );
}
