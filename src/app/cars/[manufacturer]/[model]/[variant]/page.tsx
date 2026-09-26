import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { SpecSection } from "@/components/cars/SpecSection";
import { SectionNav } from "@/components/cars/SectionNav";
import { CarGrid } from "@/components/cars/CarGrid";
import { CarViewer } from "@/components/3d/CarViewer";
import { FavoriteButton } from "@/components/cars/FavoriteButton";
import { CarDNA } from "@/components/cars/CarDNA";
import { PowertrainVisualizer } from "@/components/cars/PowertrainVisualizer";
import { buildDna, buildDistribution } from "@/lib/dna";
import { getSessionUser } from "@/lib/queries/auth";
import { isFavorited } from "@/lib/queries/favorites";
import {
  getVariantDetail,
  getSiblingVariants,
  getAllVariantPaths,
  getDnaPopulation,
} from "@/lib/queries/cars";
import { buildSpecSections, visibleSections } from "@/lib/spec-sections";
import { powertrainKind, type Part, type ViewerGroup } from "@/types/domain";
import { formatEnumLabel, formatNumber, formatYearRange } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

type Params = { manufacturer: string; model: string; variant: string };

/**
 * Prerender every variant at build time. The catalogue is small and changes
 * rarely, so this trades a slightly longer build for instant detail pages.
 */
export async function generateStaticParams(): Promise<Params[]> {
  return getAllVariantPaths();
}

export async function generateMetadata({
  params,
}: PageProps<"/cars/[manufacturer]/[model]/[variant]">): Promise<Metadata> {
  const { manufacturer, model, variant } = await params;
  const detail = await getVariantDetail(manufacturer, model, variant);

  if (!detail) {
    return { title: "Car not found" };
  }

  const name = `${detail.manufacturer.name} ${detail.model.name} ${detail.variant.name}`;
  const figures = [
    detail.performance?.power_hp ? `${detail.performance.power_hp} hp` : null,
    detail.performance?.top_speed_kmh ? `${detail.performance.top_speed_kmh} km/h` : null,
    detail.performance?.zero_to_100_s
      ? `0–100 km/h in ${detail.performance.zero_to_100_s}s`
      : null,
  ].filter(Boolean);

  const description = figures.length
    ? `${name}: ${figures.join(", ")}. Full specifications, dimensions and components.`
    : `${name}. Full specifications, dimensions and components.`;

  const url = `${siteConfig.url}/cars/${manufacturer}/${model}/${variant}`;

  return {
    title: name,
    description,
    alternates: { canonical: url },
    openGraph: { title: name, description, url, type: "website" },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export default async function VariantPage({
  params,
}: PageProps<"/cars/[manufacturer]/[model]/[variant]">) {
  const { manufacturer, model, variant } = await params;
  const detail = await getVariantDetail(manufacturer, model, variant);

  if (!detail) notFound();

  const [siblings, sessionUser, dnaPopulation] = await Promise.all([
    getSiblingVariants(detail.model.id, detail.variant.id),
    getSessionUser(),
    getDnaPopulation(),
  ]);
  // Only ask about favourite state when there is someone to ask about.
  const favorited = sessionUser ? await isFavorited(detail.variant.id) : false;
  const sections = buildSpecSections(detail);
  const navSections = visibleSections(sections);
  const kind = powertrainKind(detail.variant.fuel_type);

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
  const performance = detail.performance;

  // Group this variant's catalogued components by the 3D subsystem they belong
  // to, so clicking a group in the viewer opens the real parts, not filler.
  const partsByGroup: Partial<Record<ViewerGroup, Part[]>> = {};
  for (const { part } of detail.parts) {
    if (!part.viewer_group) continue;
    (partsByGroup[part.viewer_group] ??= []).push(part);
  }

  // Short factual notes drawn from the variant's own specifications.
  const groupNotes: Partial<Record<ViewerGroup, string>> = {};
  if (detail.engine) {
    groupNotes.engine = [
      detail.engine.name,
      detail.engine.configuration,
      detail.engine.displacement_cc ? `${detail.engine.displacement_cc} cc` : null,
      formatEnumLabel(detail.engine.aspiration, ""),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (detail.ev) {
    groupNotes.battery = [
      detail.ev.battery_kwh ? `${detail.ev.battery_kwh} kWh battery` : null,
      detail.ev.motor_count
        ? `${detail.ev.motor_count} motor${detail.ev.motor_count === 1 ? "" : "s"}`
        : null,
      detail.ev.range_km && detail.ev.range_standard
        ? `${detail.ev.range_km} km (${detail.ev.range_standard.toUpperCase()})`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (detail.transmission) {
    groupNotes.transmission = [
      detail.transmission.name,
      detail.transmission.gears ? `${detail.transmission.gears} gears` : null,
      formatEnumLabel(detail.variant.drive_type, ""),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  if (detail.dimensions) {
    groupNotes.body = [
      detail.dimensions.length_mm ? `${detail.dimensions.length_mm} mm long` : null,
      detail.dimensions.width_mm ? `${detail.dimensions.width_mm} mm wide` : null,
      detail.dimensions.height_mm ? `${detail.dimensions.height_mm} mm tall` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  // Only a GLB registered against this variant is loaded; there are none yet,
  // so every car currently falls back to the procedural representation.
  const glbMedia = detail.media.find((item) => item.type === "glb") ?? null;
  const glbUrl = glbMedia?.url ?? null;

  const fullName = `${detail.manufacturer.name} ${detail.model.name}`;

  // JSON-LD for the car. Only asserts figures that actually exist.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: `${fullName} ${detail.variant.name}`,
    brand: { "@type": "Brand", name: detail.manufacturer.name },
    model: detail.model.name,
    vehicleConfiguration: detail.variant.name,
    bodyType: detail.model.body_type,
    fuelType: detail.variant.fuel_type,
    driveWheelConfiguration: detail.variant.drive_type,
    ...(detail.variant.year_start
      ? { productionDate: String(detail.variant.year_start) }
      : {}),
    ...(performance?.power_hp
      ? {
          vehicleEngine: {
            "@type": "EngineSpecification",
            enginePower: {
              "@type": "QuantitativeValue",
              value: performance.power_hp,
              unitText: "hp",
            },
            ...(detail.engine?.displacement_cc
              ? {
                  engineDisplacement: {
                    "@type": "QuantitativeValue",
                    value: detail.engine.displacement_cc,
                    unitCode: "CMQ",
                  },
                }
              : {}),
          },
        }
      : {}),
    ...(performance?.top_speed_kmh
      ? {
          speed: {
            "@type": "QuantitativeValue",
            value: performance.top_speed_kmh,
            unitCode: "KMH",
          },
        }
      : {}),
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
            { label: "Cars", href: "/cars" },
            {
              label: detail.manufacturer.name,
              href: `/manufacturers/${detail.manufacturer.slug}`,
            },
            { label: detail.model.name },
            { label: detail.variant.name },
          ]}
        />

        {/* ------------------------------------------------------- Identity */}
        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-2">
            {detail.variant.fuel_type ? (
              <Badge tone={fuelTone(detail.variant.fuel_type)}>
                {formatEnumLabel(detail.variant.fuel_type)}
              </Badge>
            ) : null}
            <Badge>{formatEnumLabel(detail.variant.drive_type)}</Badge>
            <Badge>{detail.category.name}</Badge>
            {detail.model.generation ? <Badge>{detail.model.generation}</Badge> : null}
          </div>

          <p className="mt-6 text-label">
            <Link
              href={`/countries/${detail.country.slug}`}
              className="transition-colors hover:text-gold-300"
            >
              {detail.country.flag_emoji} {detail.country.name}
            </Link>
            {" · "}
            <Link
              href={`/manufacturers/${detail.manufacturer.slug}`}
              className="transition-colors hover:text-gold-300"
            >
              {detail.manufacturer.name}
            </Link>
          </p>

          <h1 className="mt-4 font-display text-3xl leading-tight tracking-[0.04em] text-ink-50 sm:text-4xl lg:text-5xl">
            {detail.model.name}
            <span className="block gold-gradient-text text-2xl sm:text-3xl lg:text-4xl">
              {detail.variant.name}
            </span>
          </h1>

          <p className="mt-4 font-mono text-xs text-ink-500">
            {formatYearRange(detail.variant.year_start, detail.variant.year_end)}
            {detail.model.body_type
              ? ` · ${formatEnumLabel(detail.model.body_type)}`
              : ""}
          </p>

          <FavoriteButton
            className="mt-8"
            variantId={detail.variant.id}
            initialFavorited={favorited}
            signedIn={sessionUser !== null}
          />

          {detail.variant.description ? (
            <p className="mt-7 max-w-2xl leading-relaxed text-ink-300">
              {detail.variant.description}
            </p>
          ) : null}
        </header>

        {/* ------------------------------------------------------- 3D viewer */}
        <CarViewer
          className="mt-12"
          bodyType={detail.model.body_type}
          dimensions={detail.dimensions}
          powertrain={kind}
          glbUrl={glbUrl}
          modelCredit={glbMedia?.credit ?? null}
          partsByGroup={partsByGroup}
          groupNotes={groupNotes}
          dimensionLabels={{
            ...(detail.dimensions?.length_mm
              ? { length: `${formatNumber(detail.dimensions.length_mm)} mm` }
              : {}),
            ...(detail.dimensions?.width_mm
              ? { width: `${formatNumber(detail.dimensions.width_mm)} mm` }
              : {}),
            ...(detail.dimensions?.wheelbase_mm
              ? { wheelbase: `${formatNumber(detail.dimensions.wheelbase_mm)} mm` }
              : {}),
          }}
        />

        {/* ---------------------------------------------------- Key figures */}
        <StatRow className="mt-12">
          <StatCard
            label="0–100 km/h"
            value={
              performance?.zero_to_100_s === null ||
              performance?.zero_to_100_s === undefined
                ? null
                : performance.zero_to_100_s.toFixed(1)
            }
            unit="SEC"
          />
          <StatCard
            label="Top Speed"
            value={
              performance?.top_speed_kmh === null ||
              performance?.top_speed_kmh === undefined
                ? null
                : formatNumber(performance.top_speed_kmh)
            }
            unit="KM/H"
          />
          <StatCard
            label="Power"
            value={
              performance?.power_hp === null || performance?.power_hp === undefined
                ? null
                : formatNumber(performance.power_hp)
            }
            unit="HP"
            hint={detail.performance?.source ?? undefined}
          />
          <StatCard
            label={kind === "electric" ? "Battery" : "Torque"}
            value={
              kind === "electric"
                ? detail.ev?.battery_kwh
                  ? String(detail.ev.battery_kwh)
                  : null
                : performance?.torque_nm
                  ? formatNumber(performance.torque_nm)
                  : null
            }
            unit={kind === "electric" ? "KWH" : "NM"}
          />
        </StatRow>

        {/* ------------------------------------------- Specifications + nav */}
        <div className="mt-8 gap-12 lg:grid lg:grid-cols-[minmax(0,13rem)_1fr]">
          <aside className="hidden lg:block">
            <SectionNav
              sections={navSections.map((s) => ({ id: s.id, title: s.title }))}
            />
          </aside>

          <div>
            {sections.map((section) => (
              <SpecSection
                key={section.id}
                id={section.id}
                title={section.title}
                rows={section.rows}
                note={section.note}
              />
            ))}

            <PowertrainVisualizer
              fuelType={detail.variant.fuel_type}
              driveType={detail.variant.drive_type}
            />

            <CarDNA metrics={dnaMetrics} populationSize={dnaPopulation.length} />

            {/* ------------------------------------------------- Features */}
            {detail.features.length > 0 ? (
              <section
                id="features"
                aria-labelledby="features-heading"
                className="scroll-mt-32 pt-14"
              >
                <h2
                  id="features-heading"
                  className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
                >
                  Features
                </h2>
                <ul className="mt-1">
                  {detail.features.map(({ feature, detail: note }) => (
                    <li key={feature.id} className="border-b border-line-subtle py-3.5">
                      <p className="text-sm text-ink-100">{feature.name}</p>
                      {note ? (
                        <p className="mt-1 text-xs leading-relaxed text-ink-500">
                          {note}
                        </p>
                      ) : feature.description ? (
                        <p className="mt-1 text-xs leading-relaxed text-ink-500">
                          {feature.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* --------------------------------------------- Related parts */}
            {detail.parts.length > 0 ? (
              <section
                id="parts"
                aria-labelledby="parts-heading"
                className="scroll-mt-32 pt-14"
              >
                <h2
                  id="parts-heading"
                  className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
                >
                  Notable Components
                </h2>
                <ul className="mt-1">
                  {detail.parts.map(({ part, detail: note }) => (
                    <li key={part.id} className="border-b border-line-subtle py-4">
                      <Link
                        href={`/parts/${part.slug}`}
                        className="text-sm text-gold-300 transition-colors hover:text-gold-200"
                      >
                        {part.name} →
                      </Link>
                      {note ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                          {note}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>

        {/* --------------------------------------------- Other variants */}
        {siblings.length > 0 ? (
          <section className="mt-24" aria-labelledby="siblings-heading">
            <h2
              id="siblings-heading"
              className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
            >
              Other {detail.model.name} variants
            </h2>
            <CarGrid cars={siblings} className="mt-8" />
          </section>
        ) : null}

        <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-600">
          {siteConfig.disclaimer}
          {detail.variant.source
            ? ` Figures sourced from: ${detail.variant.source}.`
            : ""}
        </p>
      </Container>
    </>
  );
}
