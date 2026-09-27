import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { IndexHero } from "@/components/manufacturers/IndexHero";
import { CountryAtlas } from "@/components/countries/CountryAtlas";
import { listCountries } from "@/lib/queries/countries";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

const DESCRIPTION =
  "Automotive nations: the engineering traditions behind the catalogue, the manufacturers each country is home to and the cars they build.";

export const metadata: Metadata = {
  title: "Countries",
  description: DESCRIPTION,
  alternates: { canonical: `${siteConfig.url}/countries` },
  openGraph: {
    title: "Countries",
    description: DESCRIPTION,
    type: "website",
    url: `${siteConfig.url}/countries`,
  },
};

export default async function CountriesPage() {
  const countries = await listCountries();
  const makers = countries.reduce((sum, country) => sum + country.manufacturer_count, 0);
  const cars = countries.reduce((sum, country) => sum + country.variant_count, 0);
  const hasData = countries.length > 0;

  return (
    <>
      <IndexHero
        overline="Origins"
        title="AUTOMOTIVE NATIONS"
        lead={
          <p>
            Where a car is engineered shapes what it is engineered for. Explore the map,
            or open a country for its history, its manufacturers and every car it builds.
          </p>
        }
        stats={
          hasData
            ? [
                { label: "Countries", value: formatNumber(countries.length) },
                { label: "Marques", value: formatNumber(makers) },
                {
                  label: "Cars",
                  value: formatNumber(cars),
                  hint: "Published variants in the catalogue.",
                },
              ]
            : []
        }
      />

      <Container className="py-12 sm:py-16">
        {hasData ? (
          <CountryAtlas countries={countries} />
        ) : (
          <EmptyState
            icon={<Globe className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="The atlas is unavailable"
            description="The catalogue could not be reached just now, so there are no countries to show. Reloading the page usually resolves it."
          />
        )}
      </Container>
    </>
  );
}
