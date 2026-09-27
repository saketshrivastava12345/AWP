import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ListedPrice } from "@/components/cars/ListedPrice";
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
import { ChapterIndicator } from "@/components/cars/detail/ChapterIndicator";
import { VehicleHeader } from "@/components/cars/detail/VehicleHeader";
import { DetailViewer } from "@/components/cars/detail/DetailViewer";
import { Gallery } from "@/components/cars/detail/Gallery";
import { PerformancePanel } from "@/components/cars/detail/PerformancePanel";
import { EvPanel } from "@/components/cars/detail/EvPanel";
import { DimensionDrawing } from "@/components/cars/detail/DimensionDrawing";
import { FeatureGroup, groupFeatures } from "@/components/cars/detail/FeatureSections";
import { PartsShowcase } from "@/components/cars/detail/PartsShowcase";
import { DataConfidence } from "@/components/cars/detail/DataConfidence";
import { RelatedVehicles } from "@/components/cars/detail/RelatedVehicles";
import { CompareWith } from "@/components/cars/detail/CompareWith";
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
  planChapters,
  sourcedOffer,
  type ChapterId,
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

  // ----------------------------------------------------------- Chapters
  // A chapter with nothing in it is left out, and the rest close up.
  const chapters = planChapters({
    technology: features.technology.length + features.other.length > 0,
  });
  const chapter = (id: ChapterId) => {
    const found = chapters.find((entry) => entry.id === id);
    return found ?? { id, number: "", label: "" };
  };

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

  const machine = chapter("the-machine");
  const performance = chapter("performance");
  const engineering = chapter("engineering");
  const technology = chapter("technology");
  const design = chapter("design");
  const pricingChapter = chapter("pricing");
  const explore = chapter("explore");

  const engineeringHeader = (
    <ChapterHeader
      id={engineering.id}
      number={engineering.number}
      label={engineering.label}
      title={`How the ${carName} is built`}
      description="Scroll through its systems one by one, then read the full specification."
    />
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <RecordView variantId={variant.id} />

      {/* ============================================ 01 · The Machine */}
      <Container>
        <DetailChapter
          id={machine.id}
          number={machine.number}
          label={machine.label}
          title={`The ${model.name}`}
          description={model.description}
          className="pb-20 sm:pb-28"
          lead={
            <div id="car-hero" className="pt-6 pb-16 sm:pt-8 lg:pb-24">
              <Breadcrumbs
                items={[
                  { label: "Cars", href: "/cars" },
                  { label: manufacturer.name, href: `/cars/${manufacturer.slug}` },
                  { label: model.name, href: `/cars/${manufacturer.slug}/${model.slug}` },
                  { label: variantLabel },
                ]}
              />
              {/* Phones: the 3D stage first, then the name, key figures and
                  price. Desktop: the header beside the stage. The header comes
                  first in the source either way, so the h1 and the actions
                  lead the reading and tab order. */}
              <div className="mt-6 flex flex-col gap-8 lg:mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-12">
                <VehicleHeader
                  detail={detail}
                  shareUrl={url}
                  price={
                    listedPrice ? <ListedPrice price={listedPrice} size="hero" /> : null
                  }
                  save={
                    <FavoriteToggle
                      variantId={variant.id}
                      carName={carName}
                      className="w-full"
                    />
                  }
                />
                <DetailViewer
                  className={
                    // Beside the header the stage is taller than the viewer's
                    // default 2:1, so the car is not dwarfed by the text
                    // column. (Not in fullscreen, where the root is fixed.)
                    "max-lg:order-first lg:[&>div:not(.fixed)>[data-viewer-ready]]:aspect-[16/10]"
                  }
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
                  carbonCeramic={hasCarbonCeramicBrakes(detail)}
                />
              </div>
            </div>
          }
        >
          <Gallery detail={detail} id="gallery" />
        </DetailChapter>
      </Container>

      {/* ============================================== 02 · Performance */}
      <Container>
        <DetailChapter
          id={performance.id}
          number={performance.number}
          label={performance.label}
          title="Performance"
          description="Published figures only, each placed among every car in the AURIX catalogue that publishes the same figure."
          className="border-t border-line-subtle py-20 sm:py-28"
        >
          <div className="space-y-20">
            <PerformancePanel detail={detail} population={performancePopulation} />
            <EvPanel detail={detail} rangeSamples={rangeSamples} />
            <CarDNA metrics={dnaMetrics} populationSize={dnaPopulation.length} />
          </div>
        </DetailChapter>
      </Container>

      {/* ============================================== 03 · Engineering */}
      <DetailChapter
        id={engineering.id}
        number={engineering.number}
        label={engineering.label}
        header={tour.length === 0}
        headerClassName="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-28"
        title={`How the ${carName} is built`}
        className="border-t border-line-subtle pb-20 sm:pb-28"
      >
        {tour.length > 0 ? (
          // The tour brings its own stop rail; the chapter rail steps aside.
          <div data-chapter-rail="hide">
            <CarShowcase
              build={build}
              stops={tour}
              label={carName}
              intro={engineeringHeader}
            />
          </div>
        ) : null}

        <Container className="pt-16 sm:pt-24">
          <div className="lg:grid lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-12">
            <aside className="hidden lg:block">
              <SectionNav
                sections={navSections.map((section) => ({
                  id: section.id,
                  title: section.title,
                }))}
              />
            </aside>
            <div className="min-w-0">
              <p className="text-hud text-gold-400">Full specification</p>
              <div className="mt-6">
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
          </div>

          <div className="mt-20 space-y-20 sm:mt-24">
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
          </div>
        </Container>
      </DetailChapter>

      {/* =============================================== 04 · Technology */}
      {technology.number ? (
        <Container>
          <DetailChapter
            id={technology.id}
            number={technology.number}
            label={technology.label}
            title="Technology"
            description="Features catalogued for this car, with the note recorded for it where there is one."
            className="border-t border-line-subtle py-20 sm:py-28"
          >
            <div className="space-y-16">
              <FeatureGroup features={detail.features} group="technology" />
              <FeatureGroup features={detail.features} group="other" />
            </div>
          </DetailChapter>
        </Container>
      ) : null}

      {/* =================================================== 05 · Design */}
      <Container>
        <DetailChapter
          id={design.id}
          number={design.number}
          label={design.label}
          title="Design & dimensions"
          description="Drawn from the published dimensions where they exist, and to typical proportions for the body style where they do not."
          className="border-t border-line-subtle py-20 sm:py-28"
        >
          <div className="space-y-20">
            <DimensionDrawing detail={detail} />
            <FeatureGroup features={detail.features} group="aerodynamics" />
            <FeatureGroup features={detail.features} group="interior" />
          </div>
        </DetailChapter>
      </Container>

      {/* ================================================== 06 · Pricing */}
      <Container>
        <DetailChapter
          id={pricingChapter.id}
          number={pricingChapter.number}
          label={pricingChapter.label}
          title="Price"
          description="Recorded prices by market, each with its type, source and verification date. Prices are never converted between currencies."
          className="border-t border-line-subtle py-20 sm:py-28"
        >
          <PricingSection
            geography={geography}
            pricing={pricing}
            variantName={
              distinctVariantName(model.name, variant.name)
                ? `${model.name} ${variant.name}`
                : model.name
            }
          />
        </DetailChapter>
      </Container>

      {/* ================================================== 07 · Explore */}
      <Container>
        <DetailChapter
          id={explore.id}
          number={explore.number}
          label={explore.label}
          title="Compare & related"
          className="border-t border-line-subtle pt-20 pb-16 sm:pt-28"
        >
          <div className="space-y-20">
            <CompareWith self={{ slug: compareSlug, name: carName }} rivals={related} />
            <RelatedVehicles
              cars={related}
              modelName={model.name}
              categoryName={detail.category.name}
            />
            <DataConfidence detail={detail} />
          </div>

          <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-500">
            {siteConfig.disclaimer}
          </p>
        </DetailChapter>
      </Container>

      {/* Fixed to the viewport edge; last in the source so the tab order
          reaches the car itself before the chapter list. */}
      <ChapterIndicator
        chapters={chapters.map(({ id, number, label }) => ({ id, number, label }))}
        pillClearOf="car-hero"
      />
    </>
  );
}
