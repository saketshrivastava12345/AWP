import { cn } from "@/lib/utils";
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
    <section
      id="dna"
      aria-labelledby="dna-heading"
      className={cn("scroll-mt-24", className)}
    >
      <DetailHeading
        id="dna-heading"
        level={headingLevel}
        eyebrow="Car DNA"
        title="Percentile profile"
        meta={`Against ${populationSize} catalogued cars`}
        description={
          <>
            Each bar is this car&apos;s percentile rank among the cars in the catalogue
            that publish the figures it needs — not a score out of ten. Metrics the
            manufacturer does not publish are left out rather than shown as zero.
          </>
        }
      />

      <dl className="mt-8 grid gap-x-10 gap-y-7 md:grid-cols-2">
        {shown.map((metric) => (
          <div key={metric.id}>
            <div className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-1 font-display text-[10px] tracking-[0.18em] text-ink-200 uppercase">
                {metric.label}
                <InfoHint label={`How ${metric.label.toLowerCase()} is calculated`}>
                  {metric.formula}
                </InfoHint>
              </dt>
              <dd className="flex items-baseline gap-3">
                {metric.display ? (
                  <span className="tabular font-mono text-[11px] text-ink-400">
                    {metric.display}
                  </span>
                ) : null}
                <span className="tabular font-mono text-xs text-gold-300">
                  {ordinal(metric.value)}
                  <span className="sr-only"> percentile</span>
                </span>
              </dd>
            </div>

            <div
              className="mt-2.5 h-1 w-full overflow-hidden bg-surface-3"
              role="meter"
              aria-valuenow={metric.value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${metric.label}: ${ordinal(metric.value)} percentile`}
            >
              <div
                className="h-full bg-gradient-to-r from-gold-700 to-gold-400"
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
