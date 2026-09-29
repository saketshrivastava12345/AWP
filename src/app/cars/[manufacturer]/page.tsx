import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { SubNav } from "@/components/ui/SubNav";
import { ModelCard } from "@/components/cars/catalogue/ModelCard";
import { ModelLineFilter } from "@/components/cars/catalogue/ModelLineFilter";
import { HierarchyHero } from "@/components/cars/catalogue/HierarchyHero";
import { CatalogueUnavailable } from "@/components/cars/catalogue/CatalogueUnavailable";
import { JsonLdScript } from "@/components/cars/catalogue/JsonLdScript";
import { formatRange } from "@/components/cars/catalogue/SpecRange";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { Reveal } from "@/components/fx/Reveal";
import {
  getCatalogueManufacturerSlugs,
  getManufacturerCatalogue,
  READ_FAILED,
} from "@/lib/queries/models";
import { catalogueHref } from "@/lib/search-params";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";
import { firstSentence, formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

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
  if (catalogue === READ_FAILED)
    return { title: "Catalogue unavailable", robots: { index: false } };
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
  if (catalogue === READ_FAILED)
    return <CatalogueUnavailable retryHref={`/cars/${slug}`} />;
  if (!catalogue) notFound();

  const { manufacturer, country, groups, modelCount, variantCount, power } = catalogue;
  const crumbs = [
    { name: "Cars", path: "/cars" },
    { name: manufacturer.name, path: `/cars/${manufacturer.slug}` },
  ];
  const models = groups.flatMap((group) => group.models);
  // The hero borrows the first catalogued photograph of the line-up; with
  // none it falls back to a drawing of the lead model's body style.
  const heroModel = models.find((model) => model.imageUrl) ?? models[0];
  const meta = [
    country.name,
    manufacturer.founded_year ? `Founded ${manufacturer.founded_year}` : null,
    manufacturer.headquarters,
  ]
    .filter(Boolean)
    .join(" · ");
  const lead = firstSentence(manufacturer.description);

  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(crumbs, siteConfig.url)} />

      <HierarchyHero
        image={heroModel?.imageUrl ?? null}
        imageAlt={heroModel ? `${manufacturer.name} ${heroModel.name}` : ""}
        bodyType={heroModel?.bodyType ?? null}
        fuelType={heroModel?.leadFuel ?? null}
      >
        <Breadcrumbs
          items={[{ label: "Cars", href: "/cars" }, { label: manufacturer.name }]}
        />
        <p
          aria-hidden="true"
          className="mt-6 hud-label text-cyan-300/70"
        >{`BRAND // ${country.name}`}</p>
        <h1 className="mt-3 text-display-l">
          <ScrambleText text={manufacturer.name} />
        </h1>
        {lead ? <p className="mt-5 max-w-2xl text-lead">{lead}</p> : null}
        {meta ? (
          <p className="mt-3 font-mono text-xs tracking-hud text-ink-300 uppercase">
            {meta}
          </p>
        ) : null}

        <StatRow className="mt-10 max-w-5xl lg:grid-cols-3">
          <StatCard label="Models" value={formatNumber(modelCount)} countUp />
          <StatCard label="Variants" value={formatNumber(variantCount)} countUp />
          <StatCard label="Power" value={power ? formatRange(power) : null} unit="hp" />
        </StatRow>
      </HierarchyHero>

      <SubNav
        label="On this page"
        items={[
          { label: "Models", href: "#models" },
          { label: "About the brand", href: `/manufacturers/${manufacturer.slug}` },
        ]}
        action={
          variantCount > 0 ? (
            <ButtonLink
              href={catalogueHref({ filters: { manufacturer: [manufacturer.slug] } })}
              variant="secondary"
              size="sm"
            >
              <span className="sm:hidden">Filter</span>
              <span className="hidden sm:inline">
                Filter all {formatNumber(variantCount)} variants
              </span>
            </ButtonLink>
          ) : undefined
        }
      />

      <Container
        as="section"
        id="models"
        aria-labelledby="models-heading"
        className="py-16 lg:py-24"
      >
        <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="mb-4 flex items-center gap-3 text-eyebrow">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
              />
              Line-up
              <span aria-hidden="true" className="hud-label text-ink-600">
                {"// 01"}
              </span>
            </p>
            <h2 id="models-heading" className="text-h2">
              <ScrambleText text={modelCount === 1 ? "The model" : "Models"} />
            </h2>
          </div>
          {models.length > 0 ? (
            <p className="font-mono text-xs tracking-hud text-ink-400 uppercase">
              {formatNumber(modelCount)} {modelCount === 1 ? "model" : "models"}{" "}
              <span aria-hidden="true">{"//"}</span> {formatNumber(variantCount)}{" "}
              {variantCount === 1 ? "variant" : "variants"}
            </p>
          ) : null}
        </Reveal>

        {models.length === 0 ? (
          <EmptyState
            className="mt-10"
            title="No models catalogued"
            description={`No ${manufacturer.name} variant is published in the catalogue. The brand page covers its history.`}
            action={
              <ButtonLink
                href={`/manufacturers/${manufacturer.slug}`}
                variant="secondary"
                size="md"
              >
                Read about {manufacturer.name}
              </ButtonLink>
            }
          />
        ) : (
          <ModelLineFilter
            className="mt-10"
            segments={groups.map((group) => ({
              slug: group.slug,
              name: group.name,
              count: group.models.length,
            }))}
            items={groups.flatMap((group) =>
              group.models.map((model) => ({
                key: model.id,
                segment: group.slug,
                node: (
                  <ModelCard
                    model={model}
                    manufacturerName={manufacturer.name}
                    href={`/cars/${manufacturer.slug}/${model.slug}`}
                    sizes={
                      models.length > 2
                        ? "(min-width: 1360px) 410px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        : "(min-width: 1360px) 620px, (min-width: 640px) 50vw, 100vw"
                    }
                  />
                ),
              })),
            )}
          />
        )}

        <p className="mt-20 max-w-3xl border-t border-line-subtle pt-8 text-caption text-ink-400">
          {siteConfig.disclaimer}
        </p>
      </Container>
    </>
  );
}
