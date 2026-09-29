import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import { formatFigure, formatNatural, ordinal, toFinite } from "@/lib/detail/figures";
import {
  buildPerformanceMetrics,
  type PerformanceMetric,
  type PerformanceMetricId,
  type PerformancePopulation,
} from "@/lib/detail/performance";
import type { VariantDetail } from "@/types/domain";
import { CatalogueScale } from "./CatalogueScale";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { CountUp } from "@/components/fx/CountUp";
import { Reveal } from "@/components/fx/Reveal";
import { DetailHeading } from "./DetailHeading";

/**
 * Performance, and where it stands in the catalogue.
 *
 * Props:
 *   detail      the variant (performance_specs + kerb weight)
 *   population  every published figure across the catalogue:
 *               buildPerformancePopulation(await getCatalogueFigures())
 *   headingLevel  2 when used as a chapter's first block (default 3)
 *
 * Four headline figures, shown as published: they count up to the published
 * value on first view, and the server HTML and resting state are that exact
 * value (fx/CountUp). Under each, a distribution strip places the car among every
 * catalogued car that publishes the same figure — rank, percentile and range.
 * A figure the car does not publish shows "Not available" and no strip; a
 * figure too few cars publish shows no strip either. Secondary figures appear
 * only when published. Power and torque curves are deliberately absent: the
 * catalogue records peak figures only.
 */
export function PerformancePanel({
  detail,
  population,
  headingLevel = 3,
  className,
}: {
  detail: VariantDetail;
  population: PerformancePopulation;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const performance = detail.performance;
  const metrics = buildPerformanceMetrics(
    {
      powerHp: performance?.power_hp ?? null,
      torqueNm: performance?.torque_nm ?? null,
      zeroTo100s: performance?.zero_to_100_s ?? null,
      topSpeedKmh: performance?.top_speed_kmh ?? null,
      kerbWeightKg: detail.dimensions?.kerb_weight_kg ?? null,
    },
    population,
  );
  const byId = new Map(metrics.map((metric) => [metric.id, metric]));

  const headline: {
    id: PerformanceMetricId;
    label: string;
    unit: string;
    rpm?: number | null;
  }[] = [
    { id: "power", label: "Power", unit: "hp", rpm: performance?.power_rpm },
    { id: "torque", label: "Torque", unit: "Nm", rpm: performance?.torque_rpm },
    { id: "acceleration", label: "0–100 km/h", unit: "s" },
    { id: "topSpeed", label: "Top speed", unit: "km/h" },
  ];

  const powerToWeight = byId.get("powerToWeight") ?? null;
  const secondary = [
    {
      label: "0–200 km/h",
      value: toFinite(performance?.zero_to_200_s),
      unit: "s",
      decimals: 1,
    },
    {
      label: "Quarter mile",
      value: toFinite(performance?.quarter_mile_s),
      unit: "s",
      decimals: 1,
    },
    // Distances are shown at the precision they were published with.
    {
      label: "Braking 100–0",
      value: toFinite(performance?.braking_100_0_m),
      unit: "m",
      decimals: null,
    },
  ].filter((entry): entry is typeof entry & { value: number } => entry.value !== null);

  const headingId = "performance-panel-heading";
  const source = performance?.source?.trim() || null;

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title="Where it stands in the catalogue"
        description="Each strip places this car among every catalogued car that publishes the same figure: one faint tick per car, this car in gold, and better always to the right."
      />

      {/* ------------------------------------------------ Figure strips */}
      <Reveal stagger={110} className="mt-10 grid gap-x-16 gap-y-12 md:grid-cols-2">
        {headline.map((tile) => (
          <FigureStrip
            key={tile.id}
            label={tile.label}
            unit={tile.unit}
            metric={byId.get(tile.id) ?? null}
            rpm={toFinite(tile.rpm)}
          />
        ))}
        {powerToWeight ? (
          <FigureStrip
            label="Power-to-weight"
            unit="hp/t"
            metric={powerToWeight}
            rpm={null}
            noun="cars that publish power and kerb weight"
            note="Computed from published power and kerb weight."
          />
        ) : null}
      </Reveal>

      {/* ------------------------------------------- Secondary figures */}
      {secondary.length > 0 ? (
        <StatRow aria-label="More published figures" className="mt-14">
          {secondary.map((entry) => (
            <StatCard
              key={entry.label}
              size="sm"
              countUp
              label={entry.label}
              value={
                entry.decimals === null
                  ? formatNatural(entry.value)
                  : formatFigure(entry.value, entry.decimals)
              }
              unit={entry.unit}
            />
          ))}
        </StatRow>
      ) : null}

      {/* ---------------------------------------------------- Footnote */}
      <div className="mt-10 max-w-[72ch] space-y-1.5 text-caption">
        <p>
          Power and torque curves are not drawn: the catalogue records the published peak
          figures only, not the manufacturer&apos;s curves, and AURIX does not reconstruct
          them.
        </p>
        {source ? <p>Source: {source}</p> : null}
      </div>
    </section>
  );
}

/**
 * One figure, as published, and where it stands: the value, the rank in words
 * ("23rd of 51 cars") and the distribution strip. Static — the published
 * number from the first frame.
 */
function FigureStrip({
  label,
  unit,
  metric,
  rpm,
  noun,
  note,
}: {
  label: string;
  unit: string;
  metric: PerformanceMetric | null;
  rpm: number | null;
  noun?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col pt-6">
      <span aria-hidden="true" className="-mt-6 mb-6 block hud-rule" />
      <p className="font-mono text-[12px] tracking-hud text-ink-300 uppercase">{label}</p>

      {metric ? (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-figure-xl text-ink-50 glow-text">
            <CountUp value={formatFigure(metric.value, metric.decimals)} />
          </span>
          <span className="font-mono text-sm text-cyan-200">{unit}</span>
        </p>
      ) : (
        <p className="mt-3 text-lead text-ink-400">{NOT_AVAILABLE}</p>
      )}

      <p className="mt-2 min-h-5 text-caption">
        {[
          metric?.standing
            ? `${ordinal(metric.standing.rank)} of ${metric.standing.count} cars`
            : null,
          metric && rpm !== null ? `at ${formatFigure(rpm)} rpm` : null,
          metric ? note : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      <div className="mt-auto pt-5">
        {metric?.standing ? (
          <CatalogueScale
            standing={metric.standing}
            label={label}
            unit={unit}
            decimals={metric.decimals}
            noun={
              noun ??
              `cars that publish ${label.toLowerCase().startsWith("0") ? "a 0–100 km/h time" : label.toLowerCase()}`
            }
            better={metric.better}
          />
        ) : (
          <p className="text-caption">
            {metric
              ? "Too few catalogued cars publish this figure to compare."
              : "Not recorded in the catalogue for this car, so it is not ranked."}
          </p>
        )}
      </div>
    </div>
  );
}
