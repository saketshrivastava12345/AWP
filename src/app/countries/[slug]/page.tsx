import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Factory } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { CarGrid } from "@/components/cars/CarGrid";
import { CountryLocator } from "@/components/countries/CountryLocator";
import { Monogram } from "@/components/manufacturers/Monogram";
import { SEGMENT_LABELS, SEGMENT_ORDER } from "@/components/manufacturers/brand";
import {
  getAllCountrySlugs,
  getCountryDetail,
  type CountryMaker,
} from "@/lib/queries/countries";
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

function MakerCard({ maker }: { maker: CountryMaker }) {
  return (
    <article className="edge-light flex h-full flex-col border border-line bg-surface-1/70 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Monogram name={maker.name} />
        <div className="min-w-0 pt-0.5">
          <h4 className="font-display text-sm leading-snug tracking-[0.08em] break-words text-ink-50">
            <Link
              href={`/manufacturers/${maker.slug}`}
              className="transition-colors duration-(--duration-fast) hover:text-gold-300"
            >
              {maker.name}
            </Link>
          </h4>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">
            {[
              maker.founded_year ? `Est. ${maker.founded_year}` : null,
              maker.headquarters,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {maker.models.length > 0 ? (
        <ul
          className="mt-5 border-t border-line-subtle"
          aria-label={`${maker.name} models`}
        >
          {maker.models.map((model) => (
            <li key={model.id} className="border-b border-line-subtle">
              <Link
                href={`/cars/${maker.slug}/${model.slug}`}
                className="group flex min-h-11 items-center justify-between gap-4 py-2.5 text-sm text-ink-100 transition-colors duration-(--duration-fast) hover:text-gold-200"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="break-words">{model.name}</span>
                  {model.generation ? (
                    <span className="rounded-xs border border-gold-800 px-1.5 py-0.5 font-mono text-[10px] leading-none text-gold-300">
                      <span className="sr-only">Generation </span>
                      {model.generation}
                    </span>
                  ) : null}
                </span>
                <span className="tabular flex shrink-0 items-center gap-2 font-mono text-xs text-ink-400">
                  {model.variantCount} {model.variantCount === 1 ? "variant" : "variants"}
                  <ArrowRight
                    className="size-3.5 text-ink-500 transition-colors group-hover:text-gold-300"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 border-t border-line-subtle pt-4 text-sm text-ink-500">
          No published cars yet.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 pt-5">
        <Link
          href={`/manufacturers/${maker.slug}`}
          className="inline-flex min-h-11 items-center font-display text-micro tracking-hud text-gold-300 uppercase transition-colors duration-(--duration-fast) hover:text-gold-200"
        >
          Marque profile →
        </Link>
        {maker.variantCount > 0 ? (
          <Link
            href={`/cars/${maker.slug}`}
            className="inline-flex min-h-11 items-center font-display text-micro tracking-hud text-ink-300 uppercase transition-colors duration-(--duration-fast) hover:text-gold-200"
          >
            All {maker.variantCount} {maker.variantCount === 1 ? "car" : "cars"} →
          </Link>
        ) : null}
      </div>
    </article>
  );
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs) }}
      />

      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="absolute inset-0 -z-10 tech-grid opacity-80" />
        <div
          aria-hidden="true"
          className="absolute -top-48 -left-40 -z-10 h-[30rem] w-[42rem] max-w-none rounded-full bg-gold-700/10 blur-[150px]"
        />
        <Container className="pt-8 pb-14 sm:pt-10 sm:pb-20">
          <Breadcrumbs
            items={[{ label: "Countries", href: "/countries" }, { label: country.name }]}
          />

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
            <div className="min-w-0">
              <p className="text-hud text-gold-400">
                {country.iso_code} · Automotive nation
              </p>
              <div className="mt-4 flex items-center gap-4 sm:gap-6">
                <span className="text-5xl leading-none sm:text-7xl" aria-hidden="true">
                  {country.flag_emoji}
                </span>
                <h1 className="min-w-0 font-display text-[clamp(1.9rem,6.5vw,4.5rem)] leading-[1.04] tracking-[0.04em] break-words text-ink-50">
                  {country.name}
                </h1>
              </div>
              {country.description ? (
                <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
                  {country.description}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                {totalCars > 0 ? (
                  <ButtonLink href={collectionHref}>
                    Browse {formatNumber(totalCars)} {totalCars === 1 ? "car" : "cars"}
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/countries" variant="secondary">
                  All countries
                </ButtonLink>
              </div>
            </div>
            <CountryLocator
              slug={country.slug}
              name={country.name}
              className="w-full max-w-md lg:max-w-none"
            />
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-16">
        <StatRow>
          <StatCard label="Marques" value={formatNumber(makers.length)} size="sm" />
          <StatCard
            label="Models"
            value={formatNumber(modelCount)}
            hint="Models with at least one published variant."
            size="sm"
          />
          <StatCard label="Cars" value={formatNumber(totalCars)} size="sm" />
          <StatCard
            label="Market currency"
            value={country.currency_code}
            hint="Prices in this market are shown in this currency, as published. AURIX never converts between currencies."
            size="sm"
          />
        </StatRow>

        {country.automotive_history ? (
          <section
            className="mt-20 grid gap-6 border-t border-line pt-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12"
            aria-labelledby="history-heading"
          >
            <h2 id="history-heading" className="text-label">
              Automotive history
            </h2>
            <p className="max-w-3xl text-base leading-[1.85] text-ink-200 sm:text-lg">
              {country.automotive_history}
            </p>
          </section>
        ) : null}

        <section className="mt-20" aria-labelledby="makers-heading">
          <SectionHeading
            overline="Country → Manufacturer → Model"
            title={<span id="makers-heading">Manufacturers and their models</span>}
            description="Grouped by segment. Each model opens its catalogue page; each marque its full profile."
          />
          {segments.length === 0 ? (
            <EmptyState
              className="mt-10"
              icon={<Factory className="size-7" strokeWidth={1.25} aria-hidden="true" />}
              title="No manufacturers recorded"
              description={`No manufacturer from ${country.name} is in the catalogue yet.`}
            />
          ) : (
            <div className="mt-10 space-y-12">
              {segments.map((group) => (
                <div key={group.segment}>
                  <h3 className="flex items-center gap-3 text-label">
                    {group.label}
                    <span className="tabular font-mono text-ink-500">
                      {group.makers.length}
                    </span>
                  </h3>
                  <ul className="mt-5 grid gap-4 lg:grid-cols-2">
                    {group.makers.map((maker) => (
                      <li key={maker.id}>
                        <MakerCard maker={maker} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {cars.length > 0 ? (
          <section className="mt-20" aria-labelledby="cars-heading">
            <SectionHeading
              overline="Vehicles"
              title={<span id="cars-heading">Cars from {country.name}</span>}
              description={
                totalCars > cars.length
                  ? `The ${cars.length} most powerful of ${formatNumber(totalCars)} catalogued cars. The collection has every one, with filters.`
                  : `All ${formatNumber(totalCars)} catalogued ${totalCars === 1 ? "car" : "cars"}, most powerful first.`
              }
              action={
                <ButtonLink href={collectionHref} variant="secondary" size="sm">
                  {totalCars > cars.length
                    ? `See all ${formatNumber(totalCars)}`
                    : "Open in the collection"}
                </ButtonLink>
              }
            />
            <CarGrid cars={cars} className="mt-10" />
          </section>
        ) : null}
      </Container>
    </>
  );
}
