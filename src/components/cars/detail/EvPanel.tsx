import { cn } from "@/lib/utils";
import { formatEnumLabel, NOT_AVAILABLE } from "@/lib/format";
import { formatFigure, formatNatural, ordinal, toFinite } from "@/lib/detail/figures";
import { compareRange, RANGE_STANDARD_NOTES, type RangeSample } from "@/lib/detail/ev";
import { powertrainKind, type VariantDetail } from "@/types/domain";
import { InfoHint } from "@/components/ui/Tooltip";
import { CatalogueScale } from "./CatalogueScale";
import { DetailHeading } from "./DetailHeading";

/**
 * Battery, range and charging, for electric and hybrid cars only — a
 * combustion car renders nothing at all.
 *
 * Props:
 *   detail        the variant (ev_specs)
 *   rangeSamples  every catalogued range with its test standard:
 *                 buildRangeSamples(await getCatalogueFigures())
 *   headingLevel  2 when used as a chapter's first block (default 3)
 *
 * The range is drawn against the catalogue only among cars rated to the SAME
 * test standard and of the same powertrain (WLTP is not EPA, and a plug-in
 * hybrid's electric range is not a battery-electric car's); the panel says
 * which, and says plainly when there is nothing fair to compare with.
 */
export function EvPanel({
  detail,
  rangeSamples,
  headingLevel = 3,
  className,
}: {
  detail: VariantDetail;
  rangeSamples: readonly RangeSample[];
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const kind = powertrainKind(detail.variant.fuel_type);
  if (kind === "combustion") return null;

  const ev = detail.ev;
  const isElectric = kind === "electric";
  const range = toFinite(ev?.range_km);
  const standard = ev?.range_standard ?? null;
  const comparison = compareRange(range, standard, kind, rangeSamples);
  const headingId = "ev-panel-heading";
  const standardLabel = standard ? formatEnumLabel(standard) : null;

  const battery: Stat[] = [
    { label: "Battery (gross)", value: toFinite(ev?.battery_kwh), unit: "kWh" },
    {
      label: "Usable capacity",
      value: toFinite(ev?.usable_battery_kwh),
      unit: "kWh",
      hint: "Usable capacity is what determines range; the gross figure includes the buffer the battery management system holds back.",
    },
    {
      label: isElectric ? "Motors" : "Electric motors",
      value: toFinite(ev?.motor_count),
      unit: toFinite(ev?.motor_count) === 1 ? "motor" : "motors",
    },
  ];
  const charging: Stat[] = [
    {
      label: "Max DC charging",
      value: toFinite(ev?.max_charge_kw),
      unit: "kW",
      hint: "Peak DC fast-charging power as published. Sustained power over a session is usually lower.",
    },
    {
      label: "10–80% charge",
      value: toFinite(ev?.charge_10_80_min),
      unit: "min",
    },
  ];

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow={isElectric ? "Electric drivetrain" : "Electric assist"}
        title={
          isElectric ? "Battery, range & charging" : "Hybrid battery & electric range"
        }
        meta="ev_specs"
      />

      <div className="mt-8 grid gap-px overflow-hidden rounded-xs border border-line bg-line lg:grid-cols-[1.35fr_1fr]">
        {/* ------------------------------------------------------ Range */}
        <div className="bg-surface-1/60 px-5 py-6 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <p className="text-hud text-ink-400">
              {isElectric ? "Range" : "Electric-only range"}
            </p>
            {standardLabel && standard ? (
              <span className="inline-flex items-center gap-1">
                <span className="rounded-xs border border-line-strong px-1.5 py-0.5 font-mono text-micro tracking-hud text-ink-200">
                  {standardLabel}
                </span>
                <InfoHint label={`About the ${standardLabel} test standard`}>
                  {RANGE_STANDARD_NOTES[standard]}
                </InfoHint>
              </span>
            ) : null}
          </div>

          {range !== null ? (
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl leading-none text-ink-50 tabular-nums sm:text-5xl">
                {formatFigure(range)}
              </span>
              <span className="font-mono text-xs text-ink-400 uppercase">km</span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-ink-500 italic">{NOT_AVAILABLE}</p>
          )}

          <div className="mt-6">
            {comparison.status === "ranked" ? (
              <>
                <CatalogueScale
                  standing={comparison.standing}
                  label={isElectric ? "Range" : "Electric-only range"}
                  unit="km"
                  noun={`${isElectric ? "electric cars" : "hybrids"} rated to ${standardLabel}`}
                  better="Further"
                />
                <p className="mt-2 text-micro leading-snug text-ink-400">
                  {ordinal(comparison.standing.rank)} of {comparison.standing.count}{" "}
                  {isElectric ? "electric cars" : "hybrids"} in the catalogue rated to{" "}
                  {standardLabel} · {ordinal(comparison.standing.percentile)} percentile
                </p>
              </>
            ) : (
              <p className="text-micro leading-snug text-ink-500">
                {comparison.reason === "no-standard"
                  ? "The test standard for this range is not recorded, so it is not ranked: figures from different standards are not comparable."
                  : comparison.reason === "too-few-peers"
                    ? `Not ranked: fewer than two catalogued ${isElectric ? "electric cars" : "hybrids"} publish a ${standardLabel} range.`
                    : "Not ranked: no range is recorded for this car."}
              </p>
            )}
          </div>

          <p className="mt-5 border-t border-line-subtle pt-4 text-xs leading-relaxed text-ink-500">
            Ranges measured to different test standards (WLTP, EPA, ARAI, NEDC, CLTC) are
            not comparable, so each car is only ever ranked against cars rated to the same
            one.
          </p>
        </div>

        {/* ------------------------------------------ Battery + charging */}
        <div className="grid gap-px bg-line">
          <StatGroup title="Battery & motors" stats={battery} />
          <StatGroup title="Charging" stats={charging} />
        </div>
      </div>

      {ev?.notes?.trim() || ev?.source?.trim() ? (
        <div className="mt-6 grid gap-2 text-xs leading-relaxed text-ink-500 sm:grid-cols-[auto_1fr] sm:gap-x-6">
          {ev?.notes?.trim() ? (
            <>
              <p className="text-hud text-ink-600">Note</p>
              <p>{ev.notes}</p>
            </>
          ) : null}
          {ev?.source?.trim() ? (
            <>
              <p className="text-hud text-ink-600">Source</p>
              <p>{ev.source}</p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type Stat = {
  label: string;
  value: number | null;
  unit: string;
  hint?: string;
};

function StatGroup({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <div className="bg-surface-1/60 px-5 py-5 sm:px-6">
      <p className="text-hud text-ink-600">{title}</p>
      <dl className="mt-3 divide-y divide-line-subtle">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <dt className="flex items-center gap-1 text-sm text-ink-300">
              {stat.label}
              {stat.hint ? (
                <InfoHint label={`About ${stat.label}`}>{stat.hint}</InfoHint>
              ) : null}
            </dt>
            <dd className="font-mono text-sm tabular-nums">
              {stat.value === null ? (
                <span className="text-ink-500 italic">{NOT_AVAILABLE}</span>
              ) : (
                <>
                  <span className="text-ink-50">{formatNatural(stat.value)}</span>{" "}
                  <span className="text-micro text-ink-400">{stat.unit}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
