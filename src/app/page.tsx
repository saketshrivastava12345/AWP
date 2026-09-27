import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GridBackground, Reveal, Spotlight } from "@/components/fx";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeTelemetry } from "@/components/home/HomeTelemetry";
import { CatalogueIndex } from "@/components/home/CatalogueIndex";
import { FeaturedShowcase } from "@/components/home/FeaturedShowcase";
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
 *
 * The motion (reveals, counting figures, decoding headlines, tilting cards)
 * is the fx kit's data attributes on server-rendered HTML: nothing here is
 * hidden without JavaScript or under reduced motion.
 */
export default async function HomePage() {
  const data = await getHomePageData();
  const { counts, featured, hero } = data;

  return (
    <>
      <HomeHero car={hero} counts={counts} />

      <HomeTelemetry counts={counts} manufacturers={data.manufacturers} />

      <CatalogueIndex segments={data.segments} />

      <section
        aria-labelledby="featured-heading"
        data-spotlight=""
        className="relative isolate py-16 lg:py-24"
      >
        <GridBackground size={48} />
        <Spotlight rest="50% 30%" />
        <Container className="relative">
          <Reveal variant="rise">
            <SectionHeading
              id="featured-heading"
              overline="Featured"
              code="03"
              scramble
              title="The most powerful"
              description="Ordered by published output, as each maker states it."
              actionHref="/cars"
              actionLabel="All cars"
            />
          </Reveal>
          {featured.length > 0 ? (
            <FeaturedShowcase
              cars={featured}
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
