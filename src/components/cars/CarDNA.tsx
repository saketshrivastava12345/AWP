import { cn } from "@/lib/utils";
import type { DnaMetric } from "@/lib/dna";

/**
 * Car DNA profile.
 *
 * Each bar is a percentile rank within the catalogue, and each carries its own
 * formula as a tooltip so the number can be checked rather than taken on faith.
 * Metrics whose inputs are missing are absent entirely — `buildDna` filters
 * them out rather than drawing an empty bar, which would read as "scores zero".
 */
export function CarDNA({
  metrics,
  populationSize,
  className,
}: {
  metrics: DnaMetric[];
  populationSize: number;
  className?: string;
}) {
  if (metrics.length === 0) return null;

  return (
    <section
      id="dna"
      aria-labelledby="dna-heading"
      className={cn("scroll-mt-32 pt-14", className)}
    >
      <h2
        id="dna-heading"
        className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
      >
        Car DNA
      </h2>

      <p className="mt-5 max-w-2xl text-xs leading-relaxed text-ink-500">
        Each bar is this car&apos;s percentile rank against the {populationSize} cars in
        the catalogue — not a score out of ten. Hover a label to see exactly how it is
        calculated. Metrics the manufacturer does not publish are omitted rather than
        shown as zero.
      </p>

      <dl className="mt-8 space-y-6">
        {metrics.map((metric) => (
          <div key={metric.id}>
            <div className="flex items-baseline justify-between gap-4">
              <dt
                className="font-display text-[10px] tracking-[0.18em] text-ink-200 uppercase"
                title={metric.formula}
              >
                {metric.label}
                <span className="ml-1.5 text-ink-600" aria-hidden="true">
                  ⓘ
                </span>
              </dt>
              <dd className="flex items-baseline gap-3">
                {metric.display ? (
                  <span className="tabular font-mono text-[11px] text-ink-500">
                    {metric.display}
                  </span>
                ) : null}
                <span className="tabular font-mono text-xs text-gold-300">
                  {metric.value}
                  <span className="text-ink-600">th</span>
                </span>
              </dd>
            </div>

            <div
              className="mt-2.5 h-1 w-full overflow-hidden bg-surface-3"
              role="meter"
              aria-valuenow={metric.value ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${metric.label}: ${metric.value}th percentile`}
            >
              <div
                className="h-full bg-gradient-to-r from-gold-700 to-gold-400 transition-[width] duration-700 ease-[var(--ease-cinematic)]"
                style={{ width: `${metric.value ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
