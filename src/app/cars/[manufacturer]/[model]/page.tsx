import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { StatRow } from "@/components/ui/StatCard";
import { SubNav } from "@/components/ui/SubNav";
import { CarGrid } from "@/components/cars/CarGrid";
import { HierarchyHero } from "@/components/cars/catalogue/HierarchyHero";
import { CatalogueUnavailable } from "@/components/cars/catalogue/CatalogueUnavailable";
import { JsonLdScript } from "@/components/cars/catalogue/JsonLdScript";
import { SpecRange } from "@/components/cars/catalogue/SpecRange";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { Reveal } from "@/components/fx/Reveal";
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
import { firstSentence, formatNumber, formatYearSpan } from "@/lib/format";
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
  return start !== null ? formatYearSpan(start, end) : null;
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
  if (catalogue === READ_FAILED)
    return <CatalogueUnavailable retryHref={`/cars/${makerSlug}/${modelSlug}`} />;
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
  const span = yearsLabel(years.start, years.end);

  // One sentence in the hero; the rest of the description, if any, opens
  // the overview.
  const opening = firstSentence(model.description);
  const remainder =
    model.description && opening && model.description.trim().length > opening.length
      ? model.description.trim().slice(opening.length).trim()
      : null;

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

  const facts = [
    { label: "Brand", value: manufacturer.name },
    { label: "Segment", value: category.name },
    { label: "Body style", value: BODY_LABELS[model.body_type] },
    { label: "Country", value: country.name },
  ];

  return (
    <>
      <JsonLdScript data={breadcrumbJsonLd(crumbs, siteConfig.url)} />

      <HierarchyHero
        image={lead?.primary_image_url ?? null}
        imageAlt={`${name} ${lead?.variant_name ?? ""}`.trim()}
        bodyType={model.body_type}
        fuelType={lead?.fuel_type ?? null}
      >
        <Breadcrumbs
          items={[
            { label: "Cars", href: "/cars" },
            { label: manufacturer.name, href: `/cars/${manufacturer.slug}` },
            { label: model.name },
          ]}
        />
        <p className="mt-6 flex items-center gap-3 font-mono text-xs tracking-hud text-cyan-200 uppercase">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          {manufacturer.name}
          <span aria-hidden="true" className="hud-label text-ink-600">
            {`// ${category.name}`}
          </span>
        </p>
        <h1 className="mt-2 text-display-xl">
          <span className="sr-only">{manufacturer.name} </span>
          <ScrambleText text={model.name} />
        </h1>
        {generations.length > 0 || span ? (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            {generations.map((generation) => (
              <Badge key={generation.id} className="bg-void/50 backdrop-blur-md">
                {generation.name}
              </Badge>
            ))}
            {span ? (
              <span className="font-mono text-xs tracking-hud text-ink-300 uppercase">
                Model years {span}
              </span>
            ) : null}
          </div>
        ) : null}
        {opening ? <p className="mt-5 max-w-2xl text-lead">{opening}</p> : null}

        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          {compareSlugs.length >= 2 ? (
            <ButtonLink href={compareHref(compareSlugs)} size="md">
              <ArrowLeftRight aria-hidden="true" />
              {variants.length <= MAX_COMPARE
                ? `Compare all ${variants.length} variants`
                : `Compare the top ${MAX_COMPARE} of ${variants.length}`}
            </ButtonLink>
          ) : null}
          <ButtonLink href={`/cars/${manufacturer.slug}`} variant="link" size="md">
            All {manufacturer.name} models
          </ButtonLink>
        </div>
      </HierarchyHero>

      <SubNav
        items={[
          { label: "Overview", href: "#overview" },
          { label: "Variants", href: "#variants" },
          ...(generations.length > 0
            ? [
                {
                  label: generations.length === 1 ? "Generation" : "Generations",
                  href: "#generation",
                },
              ]
            : []),
        ]}
      />

      <Container
        as="section"
        id="overview"
        aria-labelledby="overview-heading"
        className="pt-16 lg:pt-24"
      >
        <p className="mb-4 flex items-center gap-3 text-eyebrow">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          Telemetry
          <span aria-hidden="true" className="hud-label text-ink-600">
            {"// 01"}
          </span>
        </p>
        <h2 id="overview-heading" className="text-h2">
          <ScrambleText text="Across the range" />
        </h2>
        <p className="mt-4 max-w-2xl text-lead">
          Lowest to highest published figure among the{" "}
          {variants.length === 1
            ? "one variant"
            : `${formatNumber(variants.length)} variants`}{" "}
          below.
        </p>

        <StatRow
          className={cn("mt-10", hasElectric ? "lg:grid-cols-5" : "lg:grid-cols-4")}
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
        </StatRow>

        <Reveal className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {remainder ? <p className="text-body lg:col-span-7">{remainder}</p> : null}
          <dl
            className={cn(
              "grid grid-cols-2 gap-x-8 sm:grid-cols-4",
              remainder ? "lg:col-span-5 lg:grid-cols-2" : "lg:col-span-12",
            )}
          >
            {facts.map((fact) => (
              <div
                key={fact.label}
                className="relative py-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,oklch(0.83_0.13_210/45%),oklch(0.9_0.03_230/12%)_60%)] before:content-['']"
              >
                <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
                  {fact.label}
                </dt>
                <dd className="mt-1.5 text-body-s text-ink-100">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>

      <Container
        as="section"
        id="variants"
        aria-labelledby="variants-heading"
        className="pt-20 lg:pt-28"
      >
        <Reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="mb-4 flex items-center gap-3 text-eyebrow">
              <span
                aria-hidden="true"
                className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
              />
              Catalogue
              <span aria-hidden="true" className="hud-label text-ink-600">
                {"// 02"}
              </span>
            </p>
            <h2 id="variants-heading" className="text-h2">
              <ScrambleText text={variants.length === 1 ? "The variant" : "Variants"} />
            </h2>
          </div>
          <p className="font-mono text-xs tracking-hud text-ink-400 uppercase">
            {formatNumber(variants.length)} in the catalogue
          </p>
        </Reveal>
        <CarGrid
          cars={variants}
          columns={variants.length <= 2 ? "two" : "three"}
          label={`${name} variants`}
          className="mt-10"
        />
      </Container>

      {generations.length > 0 ? (
        <Container
          as="section"
          id="generation"
          aria-labelledby="generation-heading"
          className="pt-20 lg:pt-28"
        >
          <p className="mb-4 flex items-center gap-3 text-eyebrow">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
            />
            Timeline
            <span aria-hidden="true" className="hud-label text-ink-600">
              {"// 03"}
            </span>
          </p>
          <h2 id="generation-heading" className="text-h2">
            <ScrambleText text={generations.length === 1 ? "Generation" : "Generations"} />
          </h2>
          <Reveal
            as="ol"
            stagger
            className={cn(
              "mt-10 grid gap-x-10 border-t border-line",
              generations.length > 1 && "sm:grid-cols-2 lg:grid-cols-3",
            )}
          >
            {generations.map((generation) => {
              const count = variantsByGeneration.get(generation.name) ?? 0;
              const genSpan = yearsLabel(generation.year_start, generation.year_end);
              return (
                <li key={generation.id} className="relative pt-8 pb-4">
                  {/* A lit mark on the timeline rule above. */}
                  <span
                    aria-hidden="true"
                    className="absolute -top-[5px] left-0 size-[9px] rounded-full border border-cyan-300 bg-void shadow-[0_0_8px_var(--color-cyan-400)]"
                  />
                  <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-h3">{generation.name}</span>
                    <span className="tabular font-mono text-xs tracking-hud text-cyan-200 uppercase">
                      {genSpan ?? "Years not recorded"}
                    </span>
                  </p>
                  {generation.description ? (
                    <p className="mt-3 max-w-prose text-body">{generation.description}</p>
                  ) : null}
                  <p className="mt-3 text-caption text-ink-400">
                    {count > 0
                      ? `${formatNumber(count)} ${count === 1 ? "variant" : "variants"} in the catalogue`
                      : "No variant of this generation is catalogued"}
                  </p>
                </li>
              );
            })}
          </Reveal>
        </Container>
      ) : null}

      <Container className="pt-20 pb-24 lg:pt-28">
        <p className="max-w-3xl border-t border-line-subtle pt-8 text-caption text-ink-400">
          {siteConfig.disclaimer}
        </p>
      </Container>
    </>
  );
}
