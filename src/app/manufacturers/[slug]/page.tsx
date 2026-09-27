import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CarFront } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { SubNav, type SubNavItem } from "@/components/ui/SubNav";
import { CarGrid } from "@/components/cars/CarGrid";
import { BrandHero } from "@/components/manufacturers/BrandHero";
import { BrandTabs } from "@/components/manufacturers/BrandTabs";
import { ModelLineup } from "@/components/manufacturers/ModelLineup";
import {
  SEGMENT_LABELS,
  brandTabs,
  buildLineup,
  heroVisual,
  powerRange,
  rangeLabel,
  websiteLink,
} from "@/components/manufacturers/brand";
import { firstSentence } from "@/components/parts/parts-helpers";
import {
  getAllManufacturerSlugs,
  getManufacturerDetail,
} from "@/lib/queries/manufacturers";
import { breadcrumbJsonLd, serializeJsonLd, type JsonLd } from "@/lib/json-ld";
import { carDisplayName, formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllManufacturerSlugs();
  return withPlaceholder(
    slugs.map((slug) => ({ slug })),
    { slug: PLACEHOLDER_PARAM },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/manufacturers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getManufacturerDetail(slug);
  if (!detail) return { title: "Manufacturer not found", robots: { index: false } };

  const { manufacturer, country } = detail;
  const description =
    manufacturer.description ??
    `${manufacturer.name} of ${country.name}: its history, its models and their published specifications.`;
  const url = `${siteConfig.url}/manufacturers/${manufacturer.slug}`;

  return {
    title: manufacturer.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${manufacturer.name} — ${country.name}`,
      description,
      type: "website",
      url,
    },
  };
}

const linkClass =
  "text-ink-100 underline decoration-ink-600 underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink-50 hover:decoration-ink-300";

export default async function ManufacturerPage({
  params,
}: PageProps<"/manufacturers/[slug]">) {
  const { slug } = await params;
  const detail = await getManufacturerDetail(slug);
  if (!detail) notFound();

  const { manufacturer, country, cars, models } = detail;
  const lineup = buildLineup(models, cars);
  const tabs = brandTabs(cars);
  const power = powerRange(cars);
  const website = websiteLink(manufacturer.website);
  const visual = heroVisual(cars);
  const path = `/manufacturers/${manufacturer.slug}`;
  const catalogueHref = `/cars/${manufacturer.slug}`;

  // Structured data asserts only what the row holds: no invented logo, no
  // guessed address beyond the recorded headquarters and country.
  const organization: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}${path}#organization`,
    name: manufacturer.name,
    ...(manufacturer.description ? { description: manufacturer.description } : {}),
    ...(manufacturer.founded_year
      ? { foundingDate: String(manufacturer.founded_year) }
      : {}),
    ...(website ? { url: website.href } : {}),
    address: {
      "@type": "PostalAddress",
      ...(manufacturer.headquarters
        ? { addressLocality: manufacturer.headquarters }
        : {}),
      addressCountry: country.iso_code,
    },
  };
  const breadcrumbs = breadcrumbJsonLd(
    [
      { name: siteConfig.name, path: "/" },
      { name: "Brands", path: "/manufacturers" },
      { name: manufacturer.name, path },
    ],
    siteConfig.url,
  );

  const sections: SubNavItem[] = [
    { label: "History", href: "#history" },
    ...(cars.length > 0
      ? [
          { label: "Models", href: "#models" },
          { label: "Cars", href: "#cars" },
        ]
      : []),
  ];

  const facts: { term: string; detail: ReactNode }[] = [
    {
      term: "Founded",
      detail: manufacturer.founded_year ? String(manufacturer.founded_year) : null,
    },
    { term: "Headquarters", detail: manufacturer.headquarters },
    {
      term: "Country",
      detail: (
        <Link href={`/countries/${country.slug}`} className={linkClass}>
          {country.name}
        </Link>
      ),
    },
    { term: "Segment", detail: SEGMENT_LABELS[manufacturer.segment] },
    {
      term: "Website",
      detail: website ? (
        <a
          href={website.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 ${linkClass}`}
        >
          {website.label}
          <ArrowUpRight className="size-4 text-ink-400" aria-hidden="true" />
          <span className="sr-only"> (official website, opens in a new tab)</span>
        </a>
      ) : null,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([organization, breadcrumbs]) }}
      />

      <BrandHero
        crumbs={[
          { label: "Brands", href: "/manufacturers" },
          { label: manufacturer.name },
        ]}
        title={manufacturer.name}
        lead={firstSentence(manufacturer.description, 240)}
        meta={[
          <Link
            key="country"
            href={`/countries/${country.slug}`}
            className="inline-flex items-center gap-2 transition-colors duration-(--duration-fast) hover:text-ink-50"
          >
            {country.flag_emoji ? (
              <span aria-hidden="true" className="text-base leading-none">
                {country.flag_emoji}
              </span>
            ) : null}
            {country.name}
          </Link>,
          manufacturer.founded_year ? `Founded ${manufacturer.founded_year}` : null,
          manufacturer.headquarters,
        ]}
        actions={
          <>
            {cars.length > 0 ? (
              <ButtonLink href={catalogueHref}>
                View all {cars.length} {cars.length === 1 ? "car" : "cars"}
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/countries/${country.slug}`} variant="secondary">
              More from {country.name}
            </ButtonLink>
          </>
        }
        photo={
          visual?.kind === "photo"
            ? {
                src: visual.src,
                alt: carDisplayName(
                  visual.car.manufacturer_name,
                  visual.car.model_name,
                  visual.car.variant_name,
                ),
                href: `/cars/${visual.car.manufacturer_slug}/${visual.car.model_slug}/${visual.car.variant_slug}`,
                bodyType: visual.car.body_type,
                fuelType: visual.car.fuel_type,
              }
            : null
        }
        drawing={
          visual?.kind === "drawing"
            ? { bodyType: visual.car.body_type, fuelType: visual.car.fuel_type }
            : null
        }
      >
        {/* Founded is in the meta line above and the history below; three
            figures leave room for a wide power range ("720–1,000 hp"). */}
        <StatRow className="lg:grid-cols-3">
          <StatCard
            label="Models"
            value={formatNumber(lineup.length)}
            hint="Models with at least one published variant in the catalogue."
          />
          <StatCard label="Variants" value={formatNumber(cars.length)} />
          <StatCard
            label="Power"
            value={power ? rangeLabel(power, formatNumber) : null}
            unit={power ? "hp" : undefined}
            hint={
              power
                ? `Lowest and highest published output across ${power.count} of ${cars.length} variants, as the maker publishes it: European makers quote metric PS, US and Japanese makers SAE net hp.`
                : undefined
            }
          />
        </StatRow>
      </BrandHero>

      <SubNav items={sections} label={`${manufacturer.name}: on this page`} />

      <Container
        as="section"
        id="history"
        aria-labelledby="history-heading"
        className="py-16 lg:py-24"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <h2 id="history-heading" className="text-h2 lg:col-span-4">
            History
          </h2>
          <div className="lg:col-span-8">
            {manufacturer.description ? (
              <p className="max-w-[60ch] text-lead">{manufacturer.description}</p>
            ) : (
              <p className="max-w-[60ch] text-body text-ink-400">
                No history is recorded for {manufacturer.name} yet.
              </p>
            )}
            <dl className="mt-10 grid border-t border-line sm:grid-cols-2 sm:gap-x-12">
              {facts.map((fact) => (
                <div
                  key={fact.term}
                  className="flex items-baseline justify-between gap-6 border-b border-line-subtle py-4"
                >
                  <dt className="text-body-s text-ink-400">{fact.term}</dt>
                  <dd className="text-right text-body-s text-ink-100">
                    {fact.detail ?? <span className="text-ink-400">Not available</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>

      {cars.length === 0 ? (
        <Container className="pb-24">
          <EmptyState
            icon={<CarFront className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="No published cars yet"
            description={`${manufacturer.name} is in the catalogue, but none of its models has a published variant yet.`}
          />
        </Container>
      ) : (
        <>
          <Container
            as="section"
            id="models"
            aria-labelledby="models-heading"
            className="border-t border-line-subtle py-16 lg:py-24"
          >
            <SectionHeading
              id="models-heading"
              title="Models"
              description="Every model with a published variant, newest generation first. Open a model for its catalogue page, or a variant for its full specification."
              actionHref={catalogueHref}
              actionLabel="Brand catalogue"
            />
            <div className="mt-10">
              <ModelLineup manufacturerSlug={manufacturer.slug} models={lineup} />
            </div>
          </Container>

          <Container
            as="section"
            id="cars"
            aria-labelledby="cars-heading"
            className="border-t border-line-subtle py-16 lg:py-24"
          >
            <SectionHeading
              id="cars-heading"
              title={`Every ${manufacturer.name} in the catalogue`}
              description="Most powerful first. A figure the maker does not publish is shown as a dash, never estimated."
            />
            <div className="mt-10">
              {tabs.length > 1 ? (
                <BrandTabs
                  label={`${manufacturer.name} cars by type`}
                  tabs={tabs.map((tab) => ({
                    id: tab.id,
                    label: tab.label,
                    count: tab.cars.length,
                    content: <CarGrid cars={tab.cars} />,
                  }))}
                />
              ) : (
                <CarGrid cars={cars} />
              )}
            </div>
          </Container>
        </>
      )}
    </>
  );
}
