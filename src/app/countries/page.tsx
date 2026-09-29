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
  "Automotive nations: the engineering traditions behind the catalogue, the brands each country is home to and the cars they build.";

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
        title="Countries"
        lead={
          <p>
            Where a car is engineered shapes what it is engineered for.
            {hasData
              ? ` ${formatNumber(countries.length)} countries, ${formatNumber(makers)} brands and ${formatNumber(cars)} cars: explore the map, or open a country for its history, its brands and every car it builds.`
              : " Open a country for its history, its brands and every car it builds."}
          </p>
        }
      />

      <Container className="pb-24 lg:pb-32">
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
