import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { GlassCard } from "@/components/ui/GlassCard";
import { ButtonLink } from "@/components/ui/Button";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { CarGrid } from "@/components/cars/CarGrid";
import { getCountryDetail, getAllCountrySlugs } from "@/lib/queries/countries";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllCountrySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/countries/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getCountryDetail(slug);
  if (!detail) return { title: "Country not found" };

  const description =
    detail.country.description ??
    `Cars, manufacturers and automotive history of ${detail.country.name}.`;

  return {
    title: detail.country.name,
    description,
    alternates: { canonical: `${siteConfig.url}/countries/${slug}` },
    openGraph: { title: detail.country.name, description, type: "website" },
  };
}

export default async function CountryPage({ params }: PageProps<"/countries/[slug]">) {
  const { slug } = await params;
  const detail = await getCountryDetail(slug);
  if (!detail) notFound();

  const { country, segments, cars } = detail;
  const manufacturerCount = segments.reduce(
    (sum, group) => sum + group.manufacturers.length,
    0,
  );

  return (
    <Container className="py-10">
      <Breadcrumbs
        items={[{ label: "Countries", href: "/countries" }, { label: country.name }]}
      />

      <header className="mt-8">
        <p className="text-6xl leading-none sm:text-7xl" aria-hidden="true">
          {country.flag_emoji}
        </p>
        <h1 className="mt-6 font-display text-3xl tracking-[0.04em] text-ink-50 sm:text-4xl lg:text-5xl">
          {country.name}
        </h1>
        {country.description ? (
          <p className="mt-7 max-w-3xl leading-relaxed text-ink-300">
            {country.description}
          </p>
        ) : null}
      </header>

      <StatRow className="mt-12 max-w-2xl lg:grid-cols-2">
        <StatCard
          label="Manufacturers"
          value={formatNumber(manufacturerCount)}
          size="sm"
        />
        <StatCard label="Cars in catalogue" value={formatNumber(cars.length)} size="sm" />
      </StatRow>

      {country.automotive_history ? (
        <section className="mt-20" aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Automotive History
          </h2>
          <p className="mt-7 max-w-3xl leading-relaxed text-ink-300">
            {country.automotive_history}
          </p>
        </section>
      ) : null}

      {segments.length > 0 ? (
        <section className="mt-20" aria-labelledby="makers-heading">
          <h2
            id="makers-heading"
            className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Manufacturers
          </h2>

          <div className="mt-8 space-y-12">
            {segments.map((group) => (
              <div key={group.segment}>
                <h3 className="text-label">{group.label}</h3>
                <div className="mt-5 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                  {group.manufacturers.map((maker) => (
                    <GlassCard
                      key={maker.id}
                      as={Link}
                      href={`/manufacturers/${maker.slug}`}
                      interactive
                      className="rounded-none p-6"
                    >
                      <p className="font-display text-sm tracking-[0.1em] text-ink-50">
                        {maker.name}
                      </p>
                      <p className="mt-2 text-xs text-ink-500">
                        {maker.founded_year ? `est. ${maker.founded_year}` : ""}
                        {maker.headquarters ? ` · ${maker.headquarters}` : ""}
                      </p>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {cars.length > 0 ? (
        <section className="mt-20" aria-labelledby="cars-heading">
          <h2
            id="cars-heading"
            className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Cars from {country.name}
          </h2>
          <CarGrid cars={cars} className="mt-8" />
          <div className="mt-10">
            <ButtonLink
              href={`/cars?country=${country.slug}`}
              variant="secondary"
              size="sm"
            >
              See all in the collection
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-600">
        {siteConfig.disclaimer}
      </p>
    </Container>
  );
}
