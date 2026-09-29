import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { IndexHero } from "@/components/manufacturers/IndexHero";
import { ManufacturerDirectory } from "@/components/manufacturers/ManufacturerDirectory";
import { listManufacturers } from "@/lib/queries/manufacturers";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

const DESCRIPTION =
  "The brands behind the machines: where each was founded, where it is based, what it specialises in and the models it builds.";

export const metadata: Metadata = {
  title: "Brands",
  description: DESCRIPTION,
  alternates: { canonical: `${siteConfig.url}/manufacturers` },
  openGraph: {
    title: "Brands",
    description: DESCRIPTION,
    type: "website",
    url: `${siteConfig.url}/manufacturers`,
  },
};

export default async function ManufacturersPage() {
  const makers = await listManufacturers();

  const countries = new Set(makers.map((maker) => maker.country?.slug).filter(Boolean));
  const hasData = makers.length > 0;

  return (
    <>
      <IndexHero
        title="Brands"
        lead={
          hasData ? (
            <p>
              {formatNumber(makers.length)} brands from {formatNumber(countries.size)}{" "}
              countries, each with the history that explains what it builds and why.
              Filter by segment or country, or open a brand for its full line-up.
            </p>
          ) : (
            <p>The brands behind the machines, and the models each one builds.</p>
          )
        }
      />

      <Container className="pb-24 lg:pb-32">
        {hasData ? (
          <ManufacturerDirectory makers={makers} />
        ) : (
          <EmptyState
            icon={<Factory className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="The brand directory is unavailable"
            description="The catalogue could not be reached just now, so there is nothing to list. Reloading the page usually resolves it."
          />
        )}
      </Container>
    </>
  );
}
