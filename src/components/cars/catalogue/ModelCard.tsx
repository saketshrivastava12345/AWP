import Link from "next/link";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import { formatNumber, formatYearRange } from "@/lib/format";
import type { ModelSummary } from "@/lib/queries/models";
import { cn } from "@/lib/utils";
import { Silhouette } from "./Silhouette";
import { formatRange } from "./SpecRange";

/**
 * A model on a maker's catalogue page: its generations, years, how many
 * variants the catalogue holds, and the spread of their published power.
 * One stretched link to the model page; no client JavaScript beyond the
 * photograph fallback.
 */
export function ModelCard({
  model,
  href,
  manufacturerName,
}: {
  model: ModelSummary;
  href: string;
  manufacturerName: string;
}) {
  const years =
    model.years.start !== null
      ? formatYearRange(model.years.start, model.years.end)
      : null;

  return (
    <article
      className={cn(
        "group/card relative isolate flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface-1",
        "transition-[border-color,background-color] duration-(--duration-normal) ease-cinematic",
        "focus-within:border-gold-600/80 hover:border-gold-700/70 hover:bg-surface-2/40",
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-surface-2">
        <div className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-cinematic motion-safe:group-focus-within/card:scale-[1.04] motion-safe:group-hover/card:scale-[1.04]">
          {model.imageUrl ? (
            <CarPhoto
              src={model.imageUrl}
              alt={`${manufacturerName} ${model.name}`}
              sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              fallback={
                <Silhouette bodyType={model.bodyType} fuelType={model.leadFuel} />
              }
            />
          ) : (
            <Silhouette bodyType={model.bodyType} fuelType={model.leadFuel} />
          )}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-void/80 to-transparent"
        />
        {model.generations.length > 0 ? (
          <ul
            className="absolute top-3 left-3 flex flex-wrap gap-1.5"
            aria-label="Generations"
          >
            {model.generations.map((generation) => (
              <li key={generation.id}>
                <Badge tone="gold" className="bg-void/60 backdrop-blur-sm">
                  {generation.name}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <h3 className="font-display text-base leading-snug tracking-[0.03em] text-ink-50">
          <Link
            href={href}
            className="outline-none before:absolute before:inset-0 before:z-10 before:rounded-md focus-visible:before:ring-2 focus-visible:before:ring-gold-500 focus-visible:before:ring-inset"
          >
            <span className="sr-only">{manufacturerName} </span>
            {model.name}
          </Link>
        </h3>
        <p className="mt-1.5 text-xs text-ink-400">
          {[BODY_LABELS[model.bodyType], years].filter(Boolean).join(" · ")}
        </p>
        {model.fuelTypes.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Powertrains">
            {model.fuelTypes.map((fuel) => (
              <li key={fuel}>
                <Badge tone={fuelTone(fuel)}>{FUEL_LABELS[fuel]}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div aria-hidden="true" className="min-h-4 flex-1" />

        <dl className="grid grid-cols-2 gap-3 border-t border-line-subtle pt-4">
          <div>
            <dt className="text-label text-nano">Variants</dt>
            <dd className="tabular mt-1.5 font-mono text-sm text-ink-50">
              {formatNumber(model.variantCount)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-nano">Power</dt>
            <dd className="mt-1.5 flex items-baseline gap-1 font-mono">
              {model.power ? (
                <>
                  <span className="tabular text-sm text-ink-50">
                    {formatRange(model.power)}
                  </span>
                  <span className="text-[10px] text-ink-500">hp</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="text-sm text-ink-600">
                    —
                  </span>
                  <span className="sr-only">Not available</span>
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
