import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Factory } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { SubNav, type SubNavItem } from "@/components/ui/SubNav";
import { CarGrid } from "@/components/cars/CarGrid";
import { CountryLocator } from "@/components/countries/CountryLocator";
import { BrandHero } from "@/components/manufacturers/BrandHero";
import { ManufacturerCard } from "@/components/manufacturers/ManufacturerCard";
import { SEGMENT_LABELS, SEGMENT_ORDER } from "@/components/manufacturers/brand";
import { getAllCountrySlugs, getCountryDetail } from "@/lib/queries/countries";
import { breadcrumbJsonLd, serializeJsonLd } from "@/lib/json-ld";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllCountrySlugs();
  return withPlaceholder(
    slugs.map((slug) => ({ slug })),
    { slug: PLACEHOLDER_PARAM },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/countries/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCountryDetail(slug);
  if (!detail) return { title: "Country not found", robots: { index: false } };

  const { country } = detail;
  const description =
    country.description ??
    `Cars, manufacturers and automotive history of ${country.name}.`;
  const url = `${siteConfig.url}/countries/${country.slug}`;

  return {
    title: country.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${country.name} — automotive nation`,
      description,
      type: "website",
      url,
    },
  };
}

export default async function CountryPage({ params }: PageProps<"/countries/[slug]">) {
  const { slug } = await params;
  const detail = await getCountryDetail(slug);
  if (!detail) notFound();

  const { country, makers, cars, totalCars } = detail;
  const modelCount = makers.reduce((sum, maker) => sum + maker.models.length, 0);
  const segments = SEGMENT_ORDER.map((segment) => ({
    segment,
    label: SEGMENT_LABELS[segment],
    makers: makers.filter((maker) => maker.segment === segment),
  })).filter((group) => group.makers.length > 0);
  const collectionHref = `/cars?country=${encodeURIComponent(country.slug)}`;

  const breadcrumbs = breadcrumbJsonLd(
    [
      { name: siteConfig.name, path: "/" },
      { name: "Countries", path: "/countries" },
      { name: country.name, path: `/countries/${country.slug}` },
    ],
    siteConfig.url,
  );

  const sections: SubNavItem[] = [
    ...(country.automotive_history ? [{ label: "History", href: "#history" }] : []),
    { label: "Brands", href: "#brands" },
    ...(cars.length > 0 ? [{ label: "Cars", href: "#cars" }] : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />

      <BrandHero
        crumbs={[{ label: "Countries", href: "/countries" }, { label: country.name }]}
        eyebrow={
          <>
            {country.flag_emoji ? (
              <span
                aria-hidden="true"
                className="text-[2rem] leading-none tracking-normal"
              >
                {country.flag_emoji}
              </span>
            ) : null}
            Automotive nation
          </>
        }
        title={country.name}
        lead={country.description}
        actions={
          <>
            {totalCars > 0 ? (
              <ButtonLink href={collectionHref}>
                Browse {formatNumber(totalCars)} {totalCars === 1 ? "car" : "cars"}
              </ButtonLink>
            ) : null}
            <ButtonLink href="/countries" variant="secondary">
              All countries
            </ButtonLink>
          </>
        }
        media={
          <CountryLocator
            slug={country.slug}
            name={country.name}
            className="mx-auto w-full max-w-md lg:max-w-xl"
          />
        }
      >
        <StatRow className="lg:grid-cols-3">
          <StatCard label="Brands" value={formatNumber(makers.length)} />
          <StatCard
            label="Models"
            value={formatNumber(modelCount)}
            hint="Models with at least one published variant."
          />
          <StatCard label="Cars" value={formatNumber(totalCars)} />
        </StatRow>
        {country.currency_code ? (
          <p className="mt-8 text-caption">
            Prices for this market are shown in {country.currency_code}, as published.
            AURIX never converts between currencies.
          </p>
        ) : null}
      </BrandHero>

      <SubNav items={sections} label={`${country.name}: on this page`} />

      {country.automotive_history ? (
        <Container
          as="section"
          id="history"
          aria-labelledby="history-heading"
          className="py-16 lg:py-24"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <h2 id="history-heading" className="text-h2 lg:col-span-4">
              Automotive history
            </h2>
            <p className="max-w-[62ch] text-lead lg:col-span-8">
              {country.automotive_history}
            </p>
          </div>
        </Container>
      ) : null}

      <Container
        as="section"
        id="brands"
        aria-labelledby="brands-heading"
        className={
          country.automotive_history
            ? "border-t border-line-subtle py-16 lg:py-24"
            : "py-16 lg:py-24"
        }
      >
        <SectionHeading
          id="brands-heading"
          title={`Brands from ${country.name}`}
          description="Grouped by segment, with the models each one builds."
        />
        {segments.length === 0 ? (
          <EmptyState
            className="mt-10"
            icon={<Factory className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="No brands recorded"
            description={`No brand from ${country.name} is in the catalogue yet.`}
          />
        ) : (
          <div className="mt-12 space-y-12 lg:space-y-16">
            {segments.map((group) => (
              <div key={group.segment}>
                <h3 className="flex items-baseline gap-3 border-b border-line-subtle pb-4 text-h4">
                  {group.label}
                  <span className="text-caption">
                    {group.makers.length} {group.makers.length === 1 ? "brand" : "brands"}
                  </span>
                </h3>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  {group.makers.map((maker) => (
                    <li key={maker.id}>
                      <ManufacturerCard
                        headingLevel="h4"
                        showCountry={false}
                        maker={{
                          ...maker,
                          model_count: maker.models.length,
                          variant_count: maker.variantCount,
                          modelNames: maker.models.map((model) => model.name),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Container>

      {cars.length > 0 ? (
        <Container
          as="section"
          id="cars"
          aria-labelledby="cars-heading"
          className="border-t border-line-subtle py-16 lg:py-24"
        >
          <SectionHeading
            id="cars-heading"
            title={`Cars from ${country.name}`}
            description={
              totalCars > cars.length
                ? `The ${cars.length} most powerful of ${formatNumber(totalCars)} catalogued cars. The collection has every one, with filters.`
                : `All ${formatNumber(totalCars)} catalogued ${totalCars === 1 ? "car" : "cars"}, most powerful first.`
            }
            actionHref={collectionHref}
            actionLabel={
              totalCars > cars.length
                ? `See all ${formatNumber(totalCars)}`
                : "Open in the collection"
            }
          />
          <CarGrid cars={cars} className="mt-10" />
        </Container>
      ) : null}
    </>
  );
}
