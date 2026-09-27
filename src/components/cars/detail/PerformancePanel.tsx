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
import { CountUp } from "./CountUp";
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
 * Four headline figures count up once when scrolled into view (the final value
 * is in the HTML). Under each, a distribution strip places the car among every
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
        eyebrow="Published figures"
        title="Figures & catalogue standing"
        meta="Relative to the AURIX catalogue"
      />

      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-ink-400">
        Each strip places this car among every catalogued car that publishes the same
        figure: one faint tick per car, this car in gold, and better always to the right.
      </p>

      {/* ------------------------------------------------ Headline tiles */}
      <div className="mt-8 grid gap-px overflow-hidden rounded-xs border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        {headline.map((tile) => (
          <FigureTile
            key={tile.id}
            label={tile.label}
            unit={tile.unit}
            metric={byId.get(tile.id) ?? null}
            rpm={toFinite(tile.rpm)}
          />
        ))}
      </div>

      {/* ------------------------------------------- Secondary figures */}
      {powerToWeight || secondary.length > 0 ? (
        // A flex row, so however many secondary figures a car publishes they
        // always fill the width — no empty cell.
        <dl className="mt-px flex flex-col gap-px overflow-hidden rounded-xs border border-line bg-line sm:flex-row">
          {powerToWeight ? (
            <div className="bg-surface-1/60 px-5 py-5 sm:flex-[2]">
              <dt className="flex items-center justify-between gap-3 text-hud text-ink-500">
                <span>Power-to-weight</span>
                {powerToWeight.standing ? <RankChip metric={powerToWeight} /> : null}
              </dt>
              <dd className="mt-2">
                <p className="flex items-baseline gap-2 font-mono tabular-nums">
                  <span className="text-xl text-ink-50">
                    {formatFigure(powerToWeight.value, 1)}
                  </span>
                  <span className="text-micro text-ink-400 uppercase">hp / tonne</span>
                </p>
                {powerToWeight.standing ? (
                  <CatalogueScale
                    className="mt-2"
                    standing={powerToWeight.standing}
                    label="Power-to-weight"
                    unit="hp/t"
                    decimals={0}
                    noun="cars that publish power and kerb weight"
                    better={powerToWeight.better}
                  />
                ) : null}
              </dd>
            </div>
          ) : null}
          {secondary.map((entry) => (
            <div key={entry.label} className="bg-surface-1/60 px-5 py-5 sm:flex-1">
              <dt className="text-hud text-ink-500">{entry.label}</dt>
              <dd className="mt-2 flex items-baseline gap-2 font-mono tabular-nums">
                <span className="text-xl text-ink-50">
                  {entry.decimals === null
                    ? formatNatural(entry.value)
                    : formatFigure(entry.value, entry.decimals)}
                </span>
                <span className="text-micro text-ink-400 uppercase">{entry.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {/* ---------------------------------------------------- Footnote */}
      <div className="mt-6 grid gap-2 text-xs leading-relaxed text-ink-500 sm:grid-cols-[auto_1fr] sm:gap-x-6">
        <p className="text-hud text-ink-600">Note</p>
        <p>
          Power and torque curves are not drawn: the catalogue records the published peak
          figures only, not the manufacturer&apos;s curves, and AURIX does not reconstruct
          them.
          {powerToWeight
            ? " Power-to-weight is computed from published power and kerb weight."
            : ""}
        </p>
        {source ? (
          <>
            <p className="text-hud text-ink-600">Source</p>
            <p>{source}</p>
          </>
        ) : null}
      </div>
    </section>
  );
}

function RankChip({ metric }: { metric: PerformanceMetric }) {
  if (!metric.standing) return null;
  return (
    <span className="font-mono text-micro tracking-normal text-gold-300 normal-case tabular-nums">
      #{metric.standing.rank}
      <span className="text-ink-500"> / {metric.standing.count}</span>
    </span>
  );
}

function FigureTile({
  label,
  unit,
  metric,
  rpm,
}: {
  label: string;
  unit: string;
  metric: PerformanceMetric | null;
  rpm: number | null;
}) {
  return (
    <div className="flex flex-col bg-surface-1/60 px-5 pt-5 pb-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-hud text-ink-400">{label}</p>
        {metric?.standing ? <RankChip metric={metric} /> : null}
      </div>

      {metric ? (
        <p className="mt-4 flex items-baseline gap-2">
          <CountUp
            value={metric.value}
            decimals={metric.decimals}
            className="font-display text-4xl leading-none text-ink-50 sm:text-[2.6rem]"
          />
          <span className="font-mono text-xs text-ink-400 uppercase">{unit}</span>
        </p>
      ) : (
        <p className="mt-4 text-sm leading-[2.6rem] text-ink-500 italic">
          {NOT_AVAILABLE}
        </p>
      )}

      <p className="mt-2 h-4 font-mono text-micro text-ink-500 tabular-nums">
        {metric && rpm !== null ? `at ${formatFigure(rpm)} rpm` : ""}
      </p>

      <div className="mt-auto pt-4">
        {metric?.standing ? (
          <>
            <CatalogueScale
              standing={metric.standing}
              label={label}
              unit={unit}
              decimals={metric.decimals}
              noun={`cars that publish ${label.toLowerCase().startsWith("0") ? "a 0–100 km/h time" : label.toLowerCase()}`}
              better={metric.better}
            />
            <p className="mt-2 text-micro leading-snug text-ink-400">
              {ordinal(metric.standing.percentile)} percentile of {metric.standing.count}{" "}
              cars
            </p>
          </>
        ) : (
          <p className="text-micro leading-snug text-ink-500">
            {metric
              ? "Too few catalogued cars publish this figure to compare."
              : "Not recorded in the catalogue for this car, so it is not ranked."}
          </p>
        )}
      </div>
    </div>
  );
}
