"use client";

import { carDisplayName } from "@/lib/format";
import { useCatalogCards, useRecentlyViewed } from "@/lib/favorites/recent-hooks";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarCard } from "@/components/cars/CarCard";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { CAROUSEL_TRACK, HomeCarousel } from "./HomeCarousel";

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
        <HomeCarousel
          label="recently viewed cars"
          heading={
            <SectionHeading
              id="recent-heading"
              title="Recently viewed"
              actionHref="/favorites#recently-viewed-heading"
              actionLabel="Your history"
            />
          }
        >
          <ul className={`grid ${CAROUSEL_TRACK}`}>
            {ready.map(({ id, car }) => (
              <li key={id}>
                <CarCard
                  car={car}
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
          </ul>
        </HomeCarousel>
      </Container>
    </section>
  );
}
