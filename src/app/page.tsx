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
 * stage and its story, the segments, the featured cars, countries, brands,
 * parts and the rivals in the compare teaser — through the cookie-free static
 * client, so the page prerenders and every section has an honest state for a
 * failed or empty read. The only client-rendered section is the visitor's own
 * recently viewed list, which exists only in their browser (or account).
 */
export default async function HomePage() {
  const data = await getHomePageData();
  const { counts, featured, hero } = data;

  return (
    <>
      <HomeHero car={hero} counts={counts} />

      <CatalogueIndex segments={data.segments} />

      <section aria-labelledby="featured-heading" className="py-16 lg:py-24">
        <Container>
          <SectionHeading
            id="featured-heading"
            title="The most powerful"
            description="Ordered by published output, as each maker states it."
            actionHref="/cars"
            actionLabel="All cars"
          />
          {featured.length > 0 ? (
            <CarGrid
              cars={featured}
              columns="carousel"
              label="The most powerful cars"
              className="mt-10"
            />
          ) : (
            <p className="mt-10 text-body">
              The collection could not be read just now. The full catalogue is one click
              away under “All cars”.
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
