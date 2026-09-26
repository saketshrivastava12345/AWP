import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { CarGrid } from "@/components/cars/CarGrid";
import {
  getManufacturerDetail,
  getAllManufacturerSlugs,
} from "@/lib/queries/manufacturers";
import { formatEnumLabel, formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllManufacturerSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/manufacturers/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getManufacturerDetail(slug);
  if (!detail) return { title: "Manufacturer not found" };

  const description =
    detail.manufacturer.description ??
    `${detail.manufacturer.name}: models, specifications and history.`;

  return {
    title: detail.manufacturer.name,
    description,
    alternates: { canonical: `${siteConfig.url}/manufacturers/${slug}` },
    openGraph: { title: detail.manufacturer.name, description, type: "profile" },
  };
}

export default async function ManufacturerPage({
  params,
}: PageProps<"/manufacturers/[slug]">) {
  const { slug } = await params;
  const detail = await getManufacturerDetail(slug);
  if (!detail) notFound();

  const { manufacturer, country, groups, totalVariants } = detail;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: manufacturer.name,
    ...(manufacturer.description ? { description: manufacturer.description } : {}),
    ...(manufacturer.founded_year
      ? { foundingDate: String(manufacturer.founded_year) }
      : {}),
    ...(manufacturer.headquarters
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: manufacturer.headquarters,
            addressCountry: country.name,
          },
        }
      : {}),
    ...(manufacturer.website ? { url: manufacturer.website } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Container className="py-10">
        <Breadcrumbs
          items={[
            { label: "Manufacturers", href: "/manufacturers" },
            { label: manufacturer.name },
          ]}
        />

        <header className="mt-8">
          <Badge tone={manufacturer.segment === "performance" ? "gold" : "neutral"}>
            {formatEnumLabel(manufacturer.segment)}
          </Badge>

          <h1 className="mt-6 font-display text-3xl tracking-[0.04em] text-ink-50 sm:text-4xl lg:text-5xl">
            {manufacturer.name}
          </h1>

          <p className="mt-5 text-sm text-ink-400">
            <Link
              href={`/countries/${country.slug}`}
              className="transition-colors hover:text-gold-300"
            >
              {country.flag_emoji} {country.name}
            </Link>
            {manufacturer.headquarters ? ` · ${manufacturer.headquarters}` : ""}
          </p>

          {manufacturer.description ? (
            <p className="mt-7 max-w-3xl leading-relaxed text-ink-300">
              {manufacturer.description}
            </p>
          ) : null}
        </header>

        <StatRow className="mt-12 max-w-3xl lg:grid-cols-3">
          <StatCard
            label="Founded"
            value={manufacturer.founded_year ? String(manufacturer.founded_year) : null}
            size="sm"
          />
          <StatCard label="Models" value={formatNumber(groups.length)} size="sm" />
          <StatCard label="Variants" value={formatNumber(totalVariants)} size="sm" />
        </StatRow>

        {manufacturer.website ? (
          <p className="mt-8">
            <a
              href={manufacturer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-display text-[10px] tracking-[0.18em] text-gold-300 uppercase transition-colors hover:text-gold-200"
            >
              Official website ↗
            </a>
          </p>
        ) : null}

        {groups.length === 0 ? (
          <p className="mt-16 text-sm text-ink-500">
            No cars from this manufacturer are in the catalogue yet.
          </p>
        ) : (
          <div className="mt-20 space-y-16">
            {groups.map((group) => (
              <section
                key={group.categorySlug}
                aria-labelledby={`cat-${group.categorySlug}`}
              >
                <h2
                  id={`cat-${group.categorySlug}`}
                  className="flex items-baseline justify-between border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
                >
                  {group.category}
                  <span className="tabular font-mono text-xs text-ink-600">
                    {group.cars.length}
                  </span>
                </h2>
                <CarGrid cars={group.cars} className="mt-8" />
              </section>
            ))}
          </div>
        )}

        <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-600">
          {siteConfig.disclaimer}
        </p>
      </Container>
    </>
  );
}
