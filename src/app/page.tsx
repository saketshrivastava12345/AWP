import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarGrid } from "@/components/cars/CarGrid";
import { HomeHero } from "@/components/home/HomeHero";
import { CatalogueIndex } from "@/components/home/CatalogueIndex";
import { WorldTeaser } from "@/components/home/WorldTeaser";
import { ExploreTeasers } from "@/components/home/ExploreTeasers";
import { RecentlyViewedStrip } from "@/components/home/RecentlyViewedStrip";
import { PrinciplesStrip } from "@/components/home/PrinciplesStrip";
import { getHomePageData } from "@/lib/queries/home";

/**
 * The home page.
 *
 * Everything on it is read from the catalogue — counts, the car on the hero
 * stage and its story, the featured cars, countries, makers, parts and the
 * rivals in the compare teaser — through the cookie-free static client, so
 * the page prerenders and every section has an honest state for a failed or
 * empty read. The only client-rendered section is the visitor's own recently
 * viewed list, which exists only in their browser (or account).
 */
export default async function HomePage() {
  const data = await getHomePageData();
  const { counts, featured, hero } = data;

  return (
    <>
      <HomeHero car={hero} counts={counts} />

      <CatalogueIndex counts={counts} />

      <section
        aria-labelledby="featured-heading"
        className="border-t border-line py-20 sm:py-24"
      >
        <Container>
          <SectionHeading
            overline="From the collection"
            title={<span id="featured-heading">The most powerful in the catalogue</span>}
            description="Ordered by published output, as each maker states it. A figure a maker does not publish is shown as a dash, never estimated."
            action={
              <ButtonLink href="/cars" variant="secondary" size="sm">
                View all
              </ButtonLink>
            }
          />
          {featured.length > 0 ? (
            <CarGrid cars={featured} className="mt-12" />
          ) : (
            <p className="mt-12 border border-dashed border-line px-6 py-8 text-sm text-ink-400">
              The collection could not be read just now. The full catalogue is one click
              away under “View all”.
            </p>
          )}
        </Container>
      </section>

      <WorldTeaser countries={data.countries} manufacturers={data.manufacturers} />

      <ExploreTeasers parts={data.parts} rivals={data.rivals} />

      <RecentlyViewedStrip />

      <PrinciplesStrip />
    </>
  );
}
