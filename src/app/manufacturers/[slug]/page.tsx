import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, CarFront, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { CarGrid } from "@/components/cars/CarGrid";
import { BrandTabs } from "@/components/manufacturers/BrandTabs";
import { Monogram } from "@/components/manufacturers/Monogram";
import { ModelLineup } from "@/components/manufacturers/ModelLineup";
import {
  SEGMENT_LABELS,
  brandTabs,
  buildLineup,
  monogramOf,
  powerRange,
  websiteLink,
} from "@/components/manufacturers/brand";
import {
  getAllManufacturerSlugs,
  getManufacturerDetail,
} from "@/lib/queries/manufacturers";
import { breadcrumbJsonLd, serializeJsonLd, type JsonLd } from "@/lib/json-ld";
import { formatNumber } from "@/lib/format";
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

function powerLabel(range: { min: number; max: number }): string {
  return range.min === range.max
    ? formatNumber(range.min)
    : `${formatNumber(range.min)}–${formatNumber(range.max)}`;
}

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
  const path = `/manufacturers/${manufacturer.slug}`;

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
      { name: "Manufacturers", path: "/manufacturers" },
      { name: manufacturer.name, path },
    ],
    siteConfig.url,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([organization, breadcrumbs]) }}
      />

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="absolute inset-0 -z-10 tech-grid opacity-80" />
        <div
          aria-hidden="true"
          className="absolute -top-48 -right-40 -z-10 h-[32rem] w-[44rem] max-w-none rounded-full bg-gold-700/10 blur-[150px]"
        />
        <p
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -bottom-10 -z-10 font-display text-[clamp(9rem,26vw,20rem)] leading-none text-ink-50/[0.03] select-none"
        >
          {monogramOf(manufacturer.name)}
        </p>

        <Container className="pt-8 pb-14 sm:pt-10 sm:pb-20">
          <Breadcrumbs
            items={[
              { label: "Manufacturers", href: "/manufacturers" },
              { label: manufacturer.name },
            ]}
          />

          <div className="mt-10 flex flex-col gap-7 sm:flex-row sm:items-end sm:gap-9">
            <Monogram name={manufacturer.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/countries/${country.slug}`}
                  className="inline-flex items-center gap-2 text-hud transition-colors duration-(--duration-fast) hover:text-gold-300"
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {country.flag_emoji}
                  </span>
                  {country.name}
                </Link>
                {manufacturer.founded_year ? (
                  <span className="tabular text-hud">
                    Est. {manufacturer.founded_year}
                  </span>
                ) : null}
                <Badge tone={manufacturer.segment === "performance" ? "gold" : "neutral"}>
                  {SEGMENT_LABELS[manufacturer.segment]}
                </Badge>
              </div>
              <h1 className="mt-4 font-display text-[clamp(2rem,7vw,4.75rem)] leading-[1.04] tracking-[0.04em] break-words text-ink-50">
                {manufacturer.name}
              </h1>
            </div>
          </div>

          {manufacturer.description ? (
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-ink-300 sm:text-lg">
              {manufacturer.description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
            {manufacturer.headquarters ? (
              <p className="flex items-center gap-2 text-ink-300">
                <MapPin className="size-4 text-ink-500" aria-hidden="true" />
                <span className="sr-only">Headquarters: </span>
                {manufacturer.headquarters}
              </p>
            ) : null}
            {website ? (
              <a
                href={website.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 text-gold-300 transition-colors duration-(--duration-fast) hover:text-gold-200"
              >
                {website.label}
                <ArrowUpRight className="size-4" aria-hidden="true" />
                <span className="sr-only"> (official website, opens in a new tab)</span>
              </a>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {cars.length > 0 ? (
              <ButtonLink href={`/cars/${manufacturer.slug}`}>
                View all {cars.length} {cars.length === 1 ? "car" : "cars"}
              </ButtonLink>
            ) : null}
            <ButtonLink href={`/countries/${country.slug}`} variant="secondary">
              More from {country.name}
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-16">
        <StatRow>
          <StatCard
            label="Founded"
            value={manufacturer.founded_year ? String(manufacturer.founded_year) : null}
            size="sm"
          />
          <StatCard
            label="Models"
            value={formatNumber(lineup.length)}
            hint="Models with at least one published variant in the catalogue."
            size="sm"
          />
          <StatCard label="Variants" value={formatNumber(cars.length)} size="sm" />
          <StatCard
            label="Power range"
            value={power ? powerLabel(power) : null}
            unit={power ? "hp" : undefined}
            hint={
              power
                ? `Lowest and highest published output across ${power.count} of ${cars.length} variants, as the maker publishes it: European makers quote metric PS, US and Japanese makers SAE net hp.`
                : undefined
            }
            size="sm"
          />
        </StatRow>

        {cars.length === 0 ? (
          <EmptyState
            className="mt-16"
            icon={<CarFront className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="No published cars yet"
            description={`${manufacturer.name} is in the catalogue, but none of its models has a published variant yet.`}
          />
        ) : (
          <>
            <section className="mt-20" aria-labelledby="lineup-heading">
              <SectionHeading
                overline="Line-up"
                title={<span id="lineup-heading">Models and generations</span>}
                description="Every model with a published variant, newest generation first. Open a model for its catalogue page, or a variant for its full specification."
                action={
                  <ButtonLink
                    href={`/cars/${manufacturer.slug}`}
                    variant="secondary"
                    size="sm"
                  >
                    Brand catalogue
                  </ButtonLink>
                }
              />
              <div className="mt-10">
                <ModelLineup manufacturerSlug={manufacturer.slug} models={lineup} />
              </div>
            </section>

            <section className="mt-20" aria-labelledby="cars-heading">
              <SectionHeading
                overline="The cars"
                title={
                  <span id="cars-heading">
                    Every {manufacturer.name} in the catalogue
                  </span>
                }
                description="Most powerful first. A figure the maker does not publish is shown as a dash, never estimated."
              />
              <div className="mt-8">
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
            </section>
          </>
        )}
      </Container>
    </>
  );
}
