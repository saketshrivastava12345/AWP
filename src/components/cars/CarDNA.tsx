import { ordinal } from "@/lib/detail/figures";
import type { DnaMetric } from "@/lib/dna";
import { InfoHint } from "@/components/ui/Tooltip";
import { DetailHeading } from "@/components/cars/detail/DetailHeading";

/**
 * Car DNA profile.
 *
 * Each bar is a percentile rank within the catalogue, and each carries its own
 * formula in an info hint so the number can be checked rather than taken on
 * faith. Metrics whose inputs are missing are absent entirely — `buildDna`
 * filters them out rather than drawing an empty bar, which would read as
 * "scores zero".
 */
export function CarDNA({
  metrics,
  populationSize,
  headingLevel = 3,
  className,
}: {
  metrics: DnaMetric[];
  populationSize: number;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const shown = metrics.filter(
    (metric): metric is DnaMetric & { value: number } => metric.value !== null,
  );
  if (shown.length === 0) return null;

  return (
    <section id="dna" aria-labelledby="dna-heading" className={className}>
      <DetailHeading
        id="dna-heading"
        level={headingLevel}
        title="Car DNA"
        note={`Against ${populationSize} catalogued cars`}
        description={
          <>
            Each bar is this car&apos;s percentile rank among the cars in the catalogue
            that publish the figures it needs — not a score out of ten. Metrics the
            manufacturer does not publish are left out rather than shown as zero.
          </>
        }
      />

      <dl className="mt-10 grid gap-x-16 gap-y-8 md:grid-cols-2">
        {shown.map((metric) => (
          <div key={metric.id}>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="flex items-center gap-1 text-body-s text-ink-200">
                {metric.label}
                <InfoHint label={`How ${metric.label.toLowerCase()} is calculated`}>
                  {metric.formula}
                </InfoHint>
              </dt>
              <dd className="flex items-baseline gap-3 text-right">
                {metric.display ? (
                  <span className="text-caption tabular-nums">{metric.display}</span>
                ) : null}
                <span className="text-data text-ink-50">
                  {ordinal(metric.value)}
                  <span className="sr-only"> percentile</span>
                </span>
              </dd>
            </div>

            <div
              className="mt-3 h-1 w-full overflow-hidden rounded-pill bg-surface-3"
              role="meter"
              aria-valuenow={metric.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${metric.label}: ${ordinal(metric.value)} percentile`}
            >
              <div
                className="h-full rounded-pill bg-gold-500"
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
