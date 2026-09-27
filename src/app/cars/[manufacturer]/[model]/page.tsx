import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { CarGrid } from "@/components/cars/CarGrid";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";
import { CatalogueUnavailable } from "@/components/cars/catalogue/CatalogueUnavailable";
import { JsonLdScript } from "@/components/cars/catalogue/JsonLdScript";
import { SpecRange } from "@/components/cars/catalogue/SpecRange";
import {
  getAllModelPaths,
  getModelCatalogue,
  READ_FAILED,
  type NumberRange,
} from "@/lib/queries/models";
import { compareHref, toCompareSlug, MAX_COMPARE } from "@/lib/compare-slug";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";
import { BODY_LABELS } from "@/lib/facets";
import { formatNumber, formatYearRange } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export async function generateStaticParams(): Promise<
  { manufacturer: string; model: string }[]
> {
  const paths = await getAllModelPaths();
  return withPlaceholder(paths, {
    manufacturer: PLACEHOLDER_PARAM,
    model: PLACEHOLDER_PARAM,
  });
}

export async function generateMetadata({
  params,
}: PageProps<"/cars/[manufacturer]/[model]">): Promise<Metadata> {
  const { manufacturer, model } = await params;
  const catalogue = await getModelCatalogue(manufacturer, model);
  if (catalogue === READ_FAILED)
    return { title: "Catalogue unavailable", robots: { index: false } };
  if (!catalogue) return { title: "Model not found", robots: { index: false } };

  const name = `${catalogue.manufacturer.name} ${catalogue.model.name}`;
  const count = catalogue.variants.length;
  const power = catalogue.ranges.power;
  const description =
    catalogue.model.description ??
    [
      `${name}: ${count} ${count === 1 ? "variant" : "variants"} in the AURIX catalogue`,
      power ? `${formatNumber(power[0])}–${formatNumber(power[1])} hp` : null,
    ]
      .filter(Boolean)
      .join(", ") + ".";
  const url = `${siteConfig.url}/cars/${manufacturer}/${model}`;
  const image = catalogue.variants.find(
    (variant) => variant.primary_image_url,
  )?.primary_image_url;

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: name,
      description,
      url,
      type: "website",
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
  };
}

function yearsLabel(start: number | null, end: number | null): string | null {
  return start !== null ? formatYearRange(start, end) : null;
}

/** "2 of 3 variants publish this", when not all of them do. */
function coverage(
  values: readonly (number | null)[],
  range: NumberRange | null,
): string | undefined {
  if (!range) return undefined;
  const published = values.filter((value) => value !== null).length;
  return published < values.length
    ? `${published} of ${values.length} variants publish this`
    : undefined;
}

export default async function ModelPage({
  params,
}: PageProps<"/cars/[manufacturer]/[model]">) {
  const { manufacturer: makerSlug, model: modelSlug } = await params;
  const catalogue = await getModelCatalogue(makerSlug, modelSlug);
  if (catalogue === READ_FAILED) return <CatalogueUnavailable retryHref={`/cars/${makerSlug}/${modelSlug}`} />;
  if (!catalogue) notFound();

  const { manufacturer, country, model, category, generations, variants, years, ranges } =
    catalogue;
  const name = `${manufacturer.name} ${model.name}`;
  const lead = variants.find((variant) => variant.primary_image_url) ?? variants[0];
  const compareSlugs = variants
    .map(toCompareSlug)
    .filter((slug): slug is string => slug !== null)
    .slice(0, MAX_COMPARE);
  const hasElectric = ranges.electricRange !== null;

  const crumbs = [
    { name: "Cars", path: "/cars" },
    { name: manufacturer.name, path: `/cars/${manufacturer.slug}` },
    { name: model.name, path: `/cars/${manufacturer.slug}/${model.slug}` },
  ];

  const variantsByGeneration = new Map<string, number>();
  for (const variant of variants) {
    if (!variant.generation_name) continue;
    variantsByGeneration.set(
      variant.generation_name,
      (variantsByGeneration.get(variant.generation_name) ?? 0) + 1,
    );
  }

  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(crumbs, siteConfig.url)} />

      <Container className="pt-10 pb-20 sm:pt-12">
        <Breadcrumbs
          items={[
            { label: "Cars", href: "/cars" },
            { label: manufacturer.name, href: `/cars/${manufacturer.slug}` },
            { label: model.name },
          ]}
        />

        <header className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_17rem] md:items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label">
              <Link
                href={`/cars/${manufacturer.slug}`}
                className="text-gold-400 transition-colors hover:text-gold-200"
              >
                {manufacturer.name}
              </Link>
              <span aria-hidden="true" className="text-ink-600">
                /
              </span>
              <span>{category.name}</span>
              <span aria-hidden="true" className="text-ink-600">
                /
              </span>
              <span>{BODY_LABELS[model.body_type]}</span>
            </p>

            <h1 className="mt-5 font-display text-3xl tracking-[0.04em] text-ink-50 sm:text-4xl lg:text-5xl">
              <span className="sr-only">{manufacturer.name} </span>
              {model.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {generations.map((generation) => (
                <Badge key={generation.id} tone="gold">
                  {generation.name}
                </Badge>
              ))}
              {yearsLabel(years.start, years.end) ? (
                <span className="tabular font-mono text-xs text-ink-400">
                  {yearsLabel(years.start, years.end)}
                </span>
              ) : null}
              <span className="text-xs text-ink-500">
                ·{" "}
                {country.flag_emoji ? (
                  <span aria-hidden="true">{country.flag_emoji} </span>
                ) : null}
                {country.name}
              </span>
            </div>

            {model.description ? (
              <p className="mt-6 max-w-2xl leading-relaxed text-ink-300">
                {model.description}
              </p>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-3">
              {compareSlugs.length >= 2 ? (
                <ButtonLink href={compareHref(compareSlugs)} size="md">
                  <ArrowLeftRight className="size-4" aria-hidden="true" />
                  {variants.length <= MAX_COMPARE
                    ? `Compare all ${variants.length} variants`
                    : `Compare the top ${MAX_COMPARE} of ${variants.length}`}
                </ButtonLink>
              ) : null}
              <ButtonLink
                href={`/cars/${manufacturer.slug}`}
                variant="secondary"
                size="md"
              >
                All {manufacturer.name} models
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>

          {lead ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-line bg-surface-2">
              {lead.primary_image_url ? (
                <CarPhoto
                  src={lead.primary_image_url}
                  alt={`${name} ${lead.variant_name ?? ""}`.trim()}
                  sizes="(min-width: 1024px) 416px, (min-width: 768px) 272px, 100vw"
                  loading="preload"
                  fallback={
                    <Silhouette bodyType={model.body_type} fuelType={lead.fuel_type} />
                  }
                />
              ) : (
                <Silhouette bodyType={model.body_type} fuelType={lead.fuel_type} />
              )}
            </div>
          ) : null}
        </header>

        <section aria-labelledby="range-heading" className="mt-16">
          <h2
            id="range-heading"
            className="font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Across the range
          </h2>
          <p className="mt-2 text-sm text-ink-400">
            Lowest to highest published figure among the {formatNumber(variants.length)}{" "}
            {variants.length === 1 ? "variant" : "variants"} below.
          </p>
          <dl
            className={cn(
              "mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3",
              hasElectric ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
          >
            <SpecRange
              label="Power"
              unit="hp"
              range={ranges.power}
              note={coverage(
                variants.map((variant) => variant.power_hp),
                ranges.power,
              )}
            />
            <SpecRange
              label="Torque"
              unit="Nm"
              range={ranges.torque}
              note={coverage(
                variants.map((variant) => variant.torque_nm),
                ranges.torque,
              )}
            />
            <SpecRange
              label="0–100 km/h"
              unit="s"
              decimals={1}
              range={ranges.zeroTo100}
              note={coverage(
                variants.map((variant) => variant.zero_to_100_s),
                ranges.zeroTo100,
              )}
            />
            <SpecRange
              label="Top speed"
              unit="km/h"
              range={ranges.topSpeed}
              note={coverage(
                variants.map((variant) => variant.top_speed_kmh),
                ranges.topSpeed,
              )}
            />
            {hasElectric ? (
              <SpecRange
                label="Electric range"
                unit="km"
                range={ranges.electricRange}
                note={coverage(
                  variants.map((variant) => variant.range_km),
                  ranges.electricRange,
                )}
              />
            ) : null}
          </dl>
        </section>

        {generations.length > 0 ? (
          <section aria-labelledby="generations-heading" className="mt-16">
            <h2
              id="generations-heading"
              className="font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
            >
              {generations.length === 1 ? "Generation" : "Generations"}
            </h2>
            <ol
              className={cn(
                "mt-6 grid gap-4",
                generations.length > 1 && "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {generations.map((generation, index) => {
                const count = variantsByGeneration.get(generation.name) ?? 0;
                const span = yearsLabel(generation.year_start, generation.year_end);
                return (
                  <li
                    key={generation.id}
                    className="relative rounded-md border border-line bg-surface-1 px-5 py-5"
                  >
                    {generations.length > 1 ? (
                      <span className="text-hud text-ink-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    ) : null}
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-lg tracking-[0.04em] text-gold-200">
                        {generation.name}
                      </span>
                      <span className="tabular font-mono text-xs text-ink-400">
                        {span ?? "Years not recorded"}
                      </span>
                    </p>
                    {generation.description ? (
                      <p className="mt-3 text-sm leading-relaxed text-ink-300">
                        {generation.description}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-ink-500">
                      {count > 0
                        ? `${formatNumber(count)} ${count === 1 ? "variant" : "variants"} in the catalogue`
                        : "No variant of this generation is catalogued"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <section aria-labelledby="variants-heading" className="mt-16">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <h2
              id="variants-heading"
              className="font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
            >
              Variants
            </h2>
            <span className="tabular font-mono text-xs text-ink-500">
              {formatNumber(variants.length)}
            </span>
          </div>
          <CarGrid cars={variants} className="mt-8" />
        </section>

        <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-500">
          {siteConfig.disclaimer}
        </p>
      </Container>
    </>
  );
}
