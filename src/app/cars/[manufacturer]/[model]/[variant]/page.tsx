import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { SubNav } from "@/components/ui/SubNav";
import { SpecSection } from "@/components/cars/SpecSection";
import { SectionNav } from "@/components/cars/SectionNav";
import { CarDNA } from "@/components/cars/CarDNA";
import { PowertrainVisualizer } from "@/components/cars/PowertrainVisualizer";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { RecordView } from "@/components/account/RecordView";
import { CarShowcase } from "@/components/3d/CarShowcase";
import { drawnGroups } from "@/components/3d/viewer-config";
import { PricingSection } from "@/components/pricing/PricingSection";
import { ChapterHeader, DetailChapter } from "@/components/cars/detail/DetailChapter";
import { VehicleHeader } from "@/components/cars/detail/VehicleHeader";
import { DetailViewer } from "@/components/cars/detail/DetailViewer";
import { BlueprintDiagram } from "@/components/cars/detail/BlueprintDiagram";
import { Gallery } from "@/components/cars/detail/Gallery";
import { PerformancePanel } from "@/components/cars/detail/PerformancePanel";
import { EvPanel } from "@/components/cars/detail/EvPanel";
import { BlueprintSheet } from "@/components/cars/detail/BlueprintSheet";
import { FeatureGroup, groupFeatures } from "@/components/cars/detail/FeatureSections";
import { PartsShowcase } from "@/components/cars/detail/PartsShowcase";
import { DataConfidence } from "@/components/cars/detail/DataConfidence";
import { RelatedVehicles } from "@/components/cars/detail/RelatedVehicles";
import { CompareWith } from "@/components/cars/detail/CompareWith";
import { CarFeatureShowcase } from "@/components/cars/detail/CarFeatureShowcase";
import { buildShowcaseCards } from "@/components/cars/detail/feature-cards";
import { carSilhouette } from "@/components/cars/car-silhouette";
import {
  getAllVariantPaths,
  getDnaPopulation,
  getVariantDetail,
  getVariantListedPrice,
} from "@/lib/queries/cars";
import { getCatalogueFigures, getRelatedCars } from "@/lib/queries/related";
import { listPartCategories } from "@/lib/queries/parts";
import { getMarketGeography, getVariantPricing } from "@/lib/queries/pricing";
import { buildSpecSections, visibleSections } from "@/lib/spec-sections";
import { buildDna, buildDistribution } from "@/lib/dna";
import { carBuildFromDetail } from "@/lib/car-build";
import { buildAnatomyTour } from "@/lib/anatomy-tour";
import { blueprintGroups, buildBlueprint } from "@/lib/blueprint";
import { buildPerformancePopulation } from "@/lib/detail/performance";
import { buildRangeSamples } from "@/lib/detail/ev";
import {
  buildBreadcrumbJsonLd,
  buildCarJsonLd,
  serializeJsonLd,
} from "@/lib/detail/json-ld";
import {
  absoluteUrl,
  detailDescription,
  detailPath,
  detailTitle,
  sourcedOffer,
} from "@/lib/detail/metadata";
import {
  groupNotesFor,
  hasCarbonCeramicBrakes,
  hudFor,
  partDetailsFor,
  partsByGroupFor,
  primaryPhoto,
  tourParts,
  viewerDimensionsFor,
  viewerModelFor,
} from "@/lib/detail/viewer";
import { carDisplayName, distinctVariantName } from "@/lib/format";
import { detailSubNav } from "@/lib/detail/chapters";
import { compareHref } from "@/lib/detail/vehicle";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";
import { powertrainKind } from "@/types/domain";

type Params = { manufacturer: string; model: string; variant: string };

/**
 * Prerender every variant at build time. The catalogue is small and changes
 * rarely, so this trades a slightly longer build for instant detail pages. A
 * fresh checkout without a database still builds: the placeholder param
 * resolves to notFound().
 */
export async function generateStaticParams(): Promise<Params[]> {
  return withPlaceholder(await getAllVariantPaths(), {
    manufacturer: PLACEHOLDER_PARAM,
    model: PLACEHOLDER_PARAM,
    variant: PLACEHOLDER_PARAM,
  });
}

function isPlaceholder({ manufacturer, model, variant }: Params): boolean {
  return [manufacturer, model, variant].includes(PLACEHOLDER_PARAM);
}

export async function generateMetadata({
  params,
}: PageProps<"/cars/[manufacturer]/[model]/[variant]">): Promise<Metadata> {
  const slugs = await params;
  const detail = isPlaceholder(slugs)
    ? null
    : await getVariantDetail(slugs.manufacturer, slugs.model, slugs.variant);

  if (!detail) {
    return { title: "Car not found", robots: { index: false, follow: true } };
  }

  const title = detailTitle(detail);
  const description = detailDescription(detail);
  const url = absoluteUrl(detailPath(detail), siteConfig.url);
  const photo = primaryPhoto(detail);
  // With a catalogued photograph, that is the social image; without one the
  // route's generated card (opengraph-image.tsx) supplies it.
  const images = photo
    ? [
        {
          url: absoluteUrl(photo.url, siteConfig.url),
          alt:
            photo.alt?.trim() ||
            carDisplayName(
              detail.manufacturer.name,
              detail.model.name,
              detail.variant.name,
            ),
          ...(photo.width && photo.height
            ? { width: photo.width, height: photo.height }
            : {}),
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: siteConfig.name,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images: images.map((image) => image.url) } : {}),
    },
  };
}

export default async function VariantPage({
  params,
}: PageProps<"/cars/[manufacturer]/[model]/[variant]">) {
  const slugs = await params;
  if (isPlaceholder(slugs)) notFound();
  const detail = await getVariantDetail(slugs.manufacturer, slugs.model, slugs.variant);
  if (!detail) notFound();

  const [
    listedPrice,
    related,
    catalogueFigures,
    dnaPopulation,
    partCategories,
    geography,
    pricing,
  ] = await Promise.all([
    getVariantListedPrice(detail.variant.id),
    getRelatedCars(detail, 6),
    getCatalogueFigures(),
    getDnaPopulation(),
    listPartCategories(),
    getMarketGeography(),
    getVariantPricing(detail.variant.id),
  ]);

  const { manufacturer, model, variant } = detail;
  const carName = carDisplayName(manufacturer.name, model.name, variant.name);
  const variantLabel = distinctVariantName(model.name, variant.name) ?? variant.name;
  const path = detailPath(detail);
  const url = absoluteUrl(path, siteConfig.url);
  const compareSlug = `${manufacturer.slug}/${model.slug}/${variant.slug}`;
  const kind = powertrainKind(variant.fuel_type);

  // ------------------------------------------------------------- 3D + tour
  // Both are built from this variant's own rows: dimensions, engine layout and
  // position, drivetrain, seats, and the parts and features catalogued for it.
  const build = carBuildFromDetail(detail);
  const allParts = partCategories.flatMap((category) => category.parts);
  const tour = buildAnatomyTour(detail, allParts);
  // The tour, told as an exploded drawing: one card per subsystem the 3D car
  // actually draws (an EV has no engine or exhaust), in the order it comes apart.
  const blueprintOrder = blueprintGroups(drawnGroups(build));
  const blueprint = buildBlueprint(detail, tour, allParts, blueprintOrder);
  const photo = primaryPhoto(detail);

  // ------------------------------------------------------------ Figures
  const sections = buildSpecSections(detail);
  const navSections = visibleSections(sections);
  const performancePopulation = buildPerformancePopulation(catalogueFigures);
  const rangeSamples = buildRangeSamples(catalogueFigures);
  // DNA is a rank within the catalogue, so it needs the whole population.
  const dnaMetrics = buildDna(
    {
      powerHp: detail.performance?.power_hp ?? null,
      kerbWeightKg: detail.dimensions?.kerb_weight_kg ?? null,
      zeroTo100s: detail.performance?.zero_to_100_s ?? null,
      mileageKmpl: detail.fuel?.mileage_kmpl ?? null,
      rangeKm: detail.ev?.range_km ?? null,
      lengthMm: detail.dimensions?.length_mm ?? null,
      isElectric: kind === "electric",
    },
    buildDistribution(dnaPopulation),
  );
  const features = groupFeatures(detail.features);

  // ------------------------------------------------------------ Sections
  // The sticky sub-nav lists the sections this car's page renders; one with
  // nothing in it is left out of both.
  const hasTour = tour.length > 0;
  const showcaseCards = buildShowcaseCards(detail);
  const hasShowcase = showcaseCards.length > 0 || detail.colors.length > 0;
  const subNav = detailSubNav({ features: hasShowcase });
  const technologyFeatures = features.technology.length + features.other.length > 0;
  const carbonCeramic = hasCarbonCeramicBrakes(detail);

  // ------------------------------------------------------ Structured data
  const jsonLd = serializeJsonLd([
    buildCarJsonLd(detail, {
      url,
      imageUrl: photo ? absoluteUrl(photo.url, siteConfig.url) : null,
      price: sourcedOffer(listedPrice),
    }),
    buildBreadcrumbJsonLd([
      { name: "Cars", url: absoluteUrl("/cars", siteConfig.url) },
      {
        name: manufacturer.name,
        url: absoluteUrl(`/cars/${manufacturer.slug}`, siteConfig.url),
      },
      {
        name: model.name,
        url: absoluteUrl(`/cars/${manufacturer.slug}/${model.slug}`, siteConfig.url),
      },
      { name: variantLabel, url },
    ]),
  ]);

  const variantName = distinctVariantName(model.name, variant.name)
    ? `${model.name} ${variant.name}`
    : model.name;
  // A base price recorded on the variant, without a market or source: the
  // Price section says so rather than claiming there is no price at all.
  const recordedBasePrice =
    listedPrice?.listed_price_type === "base_price" ? listedPrice : null;

  const engineeringHeader = (
    <ChapterHeader
      id="engineering"
      code="03"
      title={`How the ${carName} is built`}
      description="Scroll and it turns into a blueprint, then comes apart one system at a time, each with the figures published for it."
    />
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <RecordView variantId={variant.id} />

      {/* ======================================================= Hero */}
      <Container>
        <VehicleHeader
          detail={detail}
          shareUrl={url}
          price={listedPrice}
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Cars", href: "/cars" },
                { label: manufacturer.name, href: `/cars/${manufacturer.slug}` },
                { label: model.name, href: `/cars/${manufacturer.slug}/${model.slug}` },
                { label: variantLabel },
              ]}
            />
          }
          save={
            <FavoriteToggle
              variantId={variant.id}
              carName={carName}
              className={SAVE_BUTTON}
            />
          }
          stage={
            <DetailViewer
              // Beside the name the stage is at least 560px tall, so the car
              // is the largest thing on the first screen. (Not in
              // fullscreen, where the root is fixed.)
              className="lg:[&>div:not(.fixed)>[data-viewer-ready]]:aspect-auto lg:[&>div:not(.fixed)>[data-viewer-ready]]:min-h-[560px]"
              title={carName}
              build={build}
              model={viewerModelFor(detail)}
              posterUrl={photo?.url ?? null}
              partsByGroup={partsByGroupFor(detail, tour, allParts)}
              partDetails={partDetailsFor(detail)}
              groupNotes={groupNotesFor(detail)}
              hud={hudFor(detail)}
              dimensions={viewerDimensionsFor(detail)}
              colors={detail.colors}
              carbonCeramic={carbonCeramic}
            />
          }
        />
      </Container>

      {/* A direct child of the page, so it stays pinned for the whole
          length of it. */}
      <SubNav
        items={subNav.map(({ label, href }) => ({ label, href }))}
        progress
        action={
          <ButtonLink href={compareHref(detail)} size="sm">
            Compare
          </ButtonLink>
        }
      />

      {/* =================================================== Overview */}
      <Container>
        <DetailChapter
          id="overview"
          title={`The ${model.name}`}
          header={false}
          className={SECTION}
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-5">
              <ChapterHeader
                id="overview"
                code="01"
                title={`The ${model.name}`}
                description={model.description}
              />
            </div>
            <div className="lg:col-span-7">
              <Gallery detail={detail} id="gallery" />
            </div>
          </div>
        </DetailChapter>
      </Container>

      {/* ================================================ Performance */}
      <Container>
        <DetailChapter
          id="performance"
          code="02"
          title="Performance"
          description="Published figures only, each placed among every car in the AURIX catalogue that publishes the same figure."
          className={cn(SECTION, RULE)}
        >
          <div className="space-y-20 lg:space-y-24">
            <PerformancePanel detail={detail} population={performancePopulation} />
            <EvPanel detail={detail} rangeSamples={rangeSamples} />
            <CarDNA metrics={dnaMetrics} populationSize={dnaPopulation.length} />
          </div>
        </DetailChapter>
      </Container>

      {/* ================================================ Engineering */}
      {/* Full width: the blueprint's sticky stage needs the whole viewport,
          and no ancestor here may clip or transform it. */}
      <DetailChapter
        id="engineering"
        code="03"
        title={`How the ${carName} is built`}
        description="The powertrain, the chassis and the components behind them."
        header={!hasTour}
        headerClassName="mx-auto max-w-[1360px] px-5 pt-16 sm:px-8 lg:px-12 lg:pt-24 min-[1440px]:px-16"
        className={cn(RULE, "pb-16 lg:pb-24")}
      >
        {hasTour ? (
          <CarShowcase
            build={build}
            steps={blueprint}
            label={carName}
            intro={engineeringHeader}
            fallback={
              <BlueprintDiagram build={build} groups={blueprintOrder} label={carName} />
            }
          />
        ) : null}

        <Container className="space-y-20 pt-16 lg:space-y-24 lg:pt-24">
          <PowertrainVisualizer
            fuelType={variant.fuel_type}
            driveType={variant.drive_type}
          />
          <FeatureGroup features={detail.features} group="chassis" />
          <PartsShowcase
            parts={detail.parts}
            generalParts={tourParts(tour, allParts)}
            inspectable={drawnGroups(build)}
          />
        </Container>
      </DetailChapter>

      {/* ===================================================== Design */}
      <Container>
        <DetailChapter
          id="design"
          code="04"
          title="Design and dimensions"
          description="Drawn from the published dimensions where they exist, and to typical proportions for the body style where they do not."
          className={cn(SECTION, RULE)}
        >
          <div className="space-y-20 lg:space-y-24">
            <BlueprintSheet detail={detail} />
            <FeatureGroup features={detail.features} group="aerodynamics" />
            <FeatureGroup features={detail.features} group="interior" />
          </div>
        </DetailChapter>
      </Container>

      {/* =================================================== Features */}
      {hasShowcase ? (
        <Container>
          <DetailChapter
            id="features"
            code="05"
            title="Features"
            description="What is catalogued for this car, one card at a time, and the paint colours its maker publishes. Every figure and colour here comes from the catalogue; nothing is illustrative."
            className={cn(SECTION, RULE)}
          >
            <CarFeatureShowcase
              carName={carName}
              cards={showcaseCards}
              colors={detail.colors}
              build={build}
              carbonCeramic={carbonCeramic}
              silhouette={carSilhouette(
                model.body_type,
                kind,
                model.engine_position ?? null,
              )}
              headingId="features-heading"
            />
          </DetailChapter>
        </Container>
      ) : null}

      {/* ============================================= Technical data */}
      <Container>
        <DetailChapter
          id="technical-data"
          code="06"
          title="Technical data"
          description="Every figure recorded for this car. A figure the manufacturer does not publish says so."
          className={cn(SECTION, RULE)}
        >
          <div className="lg:grid lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] lg:gap-16">
            <aside className="hidden lg:block">
              <SectionNav
                sections={navSections.map((section) => ({
                  id: section.id,
                  title: section.title,
                }))}
              />
            </aside>
            <div className="min-w-0">
              {sections.map((section) => (
                <SpecSection
                  key={section.id}
                  id={section.id}
                  title={section.title}
                  rows={section.rows}
                  note={section.note}
                />
              ))}
            </div>
          </div>

          {technologyFeatures ? (
            <div className="mt-20 space-y-16 lg:mt-24">
              <FeatureGroup features={detail.features} group="technology" />
              <FeatureGroup features={detail.features} group="other" />
            </div>
          ) : null}
        </DetailChapter>
      </Container>

      {/* ====================================================== Price */}
      <Container>
        <DetailChapter
          id="pricing"
          code="07"
          title="Price"
          description="Recorded prices by market, each with its type, source and verification date. Prices are never converted between currencies."
          className={cn(SECTION, RULE)}
        >
          <PricingSection
            geography={geography}
            pricing={pricing}
            variantName={variantName}
            recordedBasePrice={recordedBasePrice}
          />
        </DetailChapter>
      </Container>

      {/* =================================================== Compare */}
      <Container>
        <DetailChapter
          id="compare"
          code="08"
          title="Compare and related"
          className={cn(RULE, "pt-16 pb-16 lg:pt-24")}
        >
          <div className="space-y-20 lg:space-y-24">
            <CompareWith self={{ slug: compareSlug, name: carName }} rivals={related} />
            <RelatedVehicles
              cars={related}
              modelName={model.name}
              categoryName={detail.category.name}
            />
            <DataConfidence detail={detail} />
          </div>

          <p className="mt-20 max-w-[80ch] border-t border-line-subtle pt-8 text-caption">
            {siteConfig.disclaimer}
          </p>
        </DetailChapter>
      </Container>
    </>
  );
}

/** Vertical rhythm between chapters, and the hairline that separates them. */
const SECTION = "py-16 lg:py-24";
const RULE = "border-t border-line-subtle";

/** The favourite toggle at the hero's button size (its colours are its own). */
const SAVE_BUTTON =
  "h-12 gap-2 rounded-control px-6 font-display text-[15px] font-medium tracking-normal normal-case [&_svg]:size-[18px]";
