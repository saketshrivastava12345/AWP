import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { ModelCard } from "@/components/cars/catalogue/ModelCard";
import { JsonLdScript } from "@/components/cars/catalogue/JsonLdScript";
import { formatRange } from "@/components/cars/catalogue/SpecRange";
import {
  getCatalogueManufacturerSlugs,
  getManufacturerCatalogue,
} from "@/lib/queries/models";
import { catalogueHref } from "@/lib/search-params";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";
import { formatEnumLabel, formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export async function generateStaticParams(): Promise<{ manufacturer: string }[]> {
  const slugs = await getCatalogueManufacturerSlugs();
  return withPlaceholder(
    slugs.map((manufacturer) => ({ manufacturer })),
    { manufacturer: PLACEHOLDER_PARAM },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/cars/[manufacturer]">): Promise<Metadata> {
  const { manufacturer: slug } = await params;
  const catalogue = await getManufacturerCatalogue(slug);
  if (!catalogue) return { title: "Manufacturer not found", robots: { index: false } };

  const { manufacturer, modelCount, variantCount } = catalogue;
  const title = `${manufacturer.name} cars`;
  const description =
    modelCount > 0
      ? `Every ${manufacturer.name} in the AURIX catalogue: ${modelCount} ${modelCount === 1 ? "model" : "models"} and ${variantCount} ${variantCount === 1 ? "variant" : "variants"}, with generations, specifications and listed prices.`
      : `${manufacturer.name} in the AURIX catalogue.`;
  const url = `${siteConfig.url}/cars/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function ManufacturerCataloguePage({
  params,
}: PageProps<"/cars/[manufacturer]">) {
  const { manufacturer: slug } = await params;
  const catalogue = await getManufacturerCatalogue(slug);
  if (!catalogue) notFound();

  const { manufacturer, country, groups, modelCount, variantCount, power } = catalogue;
  const crumbs = [
    { name: "Cars", path: "/cars" },
    { name: manufacturer.name, path: `/cars/${manufacturer.slug}` },
  ];

  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(crumbs, siteConfig.url)} />

      <Container className="pt-10 pb-20 sm:pt-12">
        <Breadcrumbs
          items={[{ label: "Cars", href: "/cars" }, { label: manufacturer.name }]}
        />

        <header className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-400">
              <Link
                href={`/countries/${country.slug}`}
                className="inline-flex min-h-11 items-center gap-2 transition-colors hover:text-gold-300 sm:min-h-0"
              >
                {country.flag_emoji ? (
                  <span aria-hidden="true">{country.flag_emoji}</span>
                ) : null}
                {country.name}
              </Link>
              <Badge tone={manufacturer.segment === "performance" ? "gold" : "neutral"}>
                {formatEnumLabel(manufacturer.segment)}
              </Badge>
            </div>

            <h1 className="mt-5 font-display text-3xl tracking-[0.04em] text-ink-50 sm:text-4xl lg:text-5xl">
              {manufacturer.name}
            </h1>

            {manufacturer.description ? (
              <p className="mt-6 line-clamp-4 max-w-2xl leading-relaxed text-ink-300">
                {manufacturer.description}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink
                href={`/manufacturers/${manufacturer.slug}`}
                variant="secondary"
                size="sm"
              >
                The {manufacturer.name} story
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </ButtonLink>
              {variantCount > 0 ? (
                <ButtonLink
                  href={catalogueHref({ filters: { manufacturer: [manufacturer.slug] } })}
                  variant="ghost"
                  size="sm"
                >
                  <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  Filter all {formatNumber(variantCount)} variants
                </ButtonLink>
              ) : null}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line">
            {[
              {
                label: "Founded",
                value: manufacturer.founded_year
                  ? String(manufacturer.founded_year)
                  : null,
              },
              { label: "Headquarters", value: manufacturer.headquarters },
              { label: "Models", value: formatNumber(modelCount) },
              { label: "Variants", value: formatNumber(variantCount) },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-1 px-4 py-4">
                <dt className="text-label text-nano">{stat.label}</dt>
                <dd
                  className={
                    stat.value
                      ? "tabular mt-2 font-mono text-sm break-words text-ink-50"
                      : "mt-2 text-xs text-ink-500 italic"
                  }
                >
                  {stat.value ?? "Not available"}
                </dd>
              </div>
            ))}
            <div className="col-span-2 bg-surface-1 px-4 py-4">
              <dt className="text-label text-nano">Power across the range</dt>
              <dd
                className={
                  power
                    ? "tabular mt-2 font-mono text-sm text-ink-50"
                    : "mt-2 text-xs text-ink-500 italic"
                }
              >
                {power ? `${formatRange(power)} hp` : "Not available"}
              </dd>
            </div>
          </dl>
        </header>

        {groups.length === 0 ? (
          <EmptyState
            className="mt-16"
            title="No models catalogued"
            description={`No ${manufacturer.name} variant is published in the catalogue. The brand page covers its history.`}
            action={
              <ButtonLink
                href={`/manufacturers/${manufacturer.slug}`}
                variant="secondary"
                size="sm"
              >
                Read about {manufacturer.name}
              </ButtonLink>
            }
          />
        ) : (
          <div className="mt-16 sm:mt-20">
            {groups.map((group) => {
              const variants = group.models.reduce(
                (total, model) => total + model.variantCount,
                0,
              );
              return (
                <section
                  key={group.slug}
                  aria-labelledby={`group-${group.slug}`}
                  className="grid gap-6 border-t border-line py-10 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10"
                >
                  {/* The category is an index column on wide screens, so a
                      category with a single model does not leave a row of
                      empty slots beside it. */}
                  <div className="lg:sticky lg:top-24 lg:self-start">
                    <h2
                      id={`group-${group.slug}`}
                      className="font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
                    >
                      {group.name}
                    </h2>
                    <p className="mt-2 text-xs text-ink-400">
                      <span className="tabular font-mono text-ink-200">
                        {group.models.length}
                      </span>{" "}
                      {group.models.length === 1 ? "model" : "models"} ·{" "}
                      <span className="tabular font-mono text-ink-200">{variants}</span>{" "}
                      {variants === 1 ? "variant" : "variants"}
                    </p>
                    <Link
                      href={catalogueHref({
                        filters: {
                          manufacturer: [manufacturer.slug],
                          category: [group.slug],
                        },
                      })}
                      className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs text-gold-400 transition-colors hover:text-gold-200 lg:min-h-0"
                    >
                      Filter in the collection
                      <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  </div>
                  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
                    {group.models.map((model) => (
                      <li key={model.id}>
                        <ModelCard
                          model={model}
                          manufacturerName={manufacturer.name}
                          href={`/cars/${manufacturer.slug}/${model.slug}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <p
          className={cn(
            "border-t border-line pt-8 text-xs leading-relaxed text-ink-500",
            groups.length === 0 && "mt-16",
          )}
        >
          {siteConfig.disclaimer}
        </p>
      </Container>
    </>
  );
}
