import { ordinal } from "@/lib/detail/figures";
import type { DnaMetric } from "@/lib/dna";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/Tooltip";
import { CountUp } from "@/components/fx/CountUp";
import { Reveal } from "@/components/fx/Reveal";
import { DetailHeading } from "@/components/cars/detail/DetailHeading";

/**
 * Car DNA profile, read like a telemetry gauge.
 *
 * Each metric is a percentile rank within the catalogue, and each carries its
 * own formula in an info hint so the number can be checked rather than taken
 * on faith. Metrics whose inputs are missing are absent entirely — `buildDna`
 * filters them out rather than drawing an empty bar, which would read as
 * "scores zero".
 *
 * The radar (three or more metrics) and the segmented bars plot exactly the
 * same percentiles; the radar is drawn on the server as plain SVG and needs
 * no JavaScript. Bars wipe in when scrolled into view; the resting state is
 * the true length.
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16">
        {shown.length >= 3 ? (
          <Reveal variant="scale" className="mx-auto w-full max-w-[18rem] lg:mx-0">
            <Radar metrics={shown} />
          </Reveal>
        ) : null}

        <dl className="grid content-start gap-x-12 gap-y-7 md:grid-cols-2">
          {shown.map((metric, index) => (
            <div key={metric.id}>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="flex items-center gap-1.5 font-mono text-[12px] tracking-hud text-ink-200 uppercase">
                  <span aria-hidden="true" className="text-cyan-300/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {metric.label}
                  <InfoHint label={`How ${metric.label.toLowerCase()} is calculated`}>
                    {metric.formula}
                  </InfoHint>
                </dt>
                <dd className="flex items-baseline gap-3 text-right">
                  {metric.display ? (
                    <span className="text-caption tabular-nums">{metric.display}</span>
                  ) : null}
                  <span className="text-figure text-ink-50 glow-text">
                    <CountUp value={ordinal(metric.value)} />
                    <span className="sr-only"> percentile</span>
                  </span>
                </dd>
              </div>

              <div
                className="relative mt-3 h-2 w-full overflow-hidden bg-surface-3 hud-segments"
                role="meter"
                aria-valuenow={metric.value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${metric.label}: ${ordinal(metric.value)} percentile`}
              >
                <Reveal
                  variant="clip"
                  delay={index * 90}
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${metric.value}%` }}
                >
                  <span className="block h-full w-full bg-gradient-to-r from-cyan-500 to-cyan-300 shadow-[0_0_10px_var(--color-cyan-400)]" />
                </Reveal>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 flex justify-between font-mono text-[9px] tracking-hud text-ink-600 uppercase"
              >
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * The same percentiles as a radar: one axis per metric, rings at 25/50/75/
 * 100. Decorative for assistive technology (the meters above carry the
 * values); the polygon's area means nothing on its own, so it is not
 * announced as a figure.
 */
function Radar({ metrics }: { metrics: (DnaMetric & { value: number })[] }) {
  const size = 240;
  const centre = size / 2;
  const radius = 92;
  const n = metrics.length;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / n;
    const r = (radius * value) / 100;
    return [centre + r * Math.cos(angle), centre + r * Math.sin(angle)] as const;
  };
  const ring = (value: number) =>
    metrics.map((_, index) => point(index, value).join(",")).join(" ");
  const shape = metrics
    .map((metric, index) => point(index, metric.value).join(","))
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Car DNA radar: ${metrics
        .map((metric) => `${metric.label} ${ordinal(metric.value)} percentile`)
        .join(", ")}`}
    >
      {[25, 50, 75, 100].map((value) => (
        <polygon
          key={value}
          points={ring(value)}
          className={cn(
            "fill-none",
            value === 100 ? "stroke-line-strong" : "stroke-line-subtle",
          )}
          strokeWidth="1"
        />
      ))}
      {metrics.map((metric, index) => {
        const [x, y] = point(index, 100);
        return (
          <line
            key={metric.id}
            x1={centre}
            y1={centre}
            x2={x}
            y2={y}
            className="stroke-line-subtle"
            strokeWidth="1"
          />
        );
      })}
      <polygon
        points={shape}
        className="animate-hud-dash fill-cyan-400/15 stroke-cyan-300"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px var(--color-cyan-400))" }}
      />
      {metrics.map((metric, index) => {
        const [x, y] = point(index, metric.value);
        const [lx, ly] = point(index, 122);
        return (
          <g key={metric.id}>
            <circle cx={x} cy={y} r="3" className="fill-cyan-200" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink-300 font-mono text-[9px] tracking-hud uppercase"
            >
              {metric.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
