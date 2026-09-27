import Link from "next/link";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import { formatNumber, formatYearSpan } from "@/lib/format";
import type { ModelSummary } from "@/lib/queries/models";
import { cn } from "@/lib/utils";
import { Silhouette } from "./Silhouette";
import { formatRange } from "./SpecRange";

/**
 * A model line on a maker's catalogue page, in the same borderless shell as
 * the car card: image first, the name, "Model years 2019–present · 992",
 * body style and powertrains as badges, and one line of figures — the
 * spread of published power and how many variants the catalogue holds.
 * One stretched link to the model page; no client JavaScript beyond the
 * photograph fallback.
 */
export function ModelCard({
  model,
  href,
  manufacturerName,
  sizes = "(min-width: 1360px) 410px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
}: {
  model: ModelSummary;
  href: string;
  manufacturerName: string;
  /** `sizes` for the photograph, matching the grid it sits in. */
  sizes?: string;
  className?: string;
}) {
  const years =
    model.years.start !== null ? formatYearSpan(model.years.start, model.years.end) : null;
  const meta = [
    years ? `Model years ${years}` : null,
    model.generations.map((generation) => generation.name).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");
  const figures = [
    model.power ? `${formatRange(model.power)} hp` : null,
    `${formatNumber(model.variantCount)} ${model.variantCount === 1 ? "variant" : "variants"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "group/card relative isolate flex h-full flex-col overflow-hidden rounded-card bg-surface-1",
        "transition-colors duration-(--duration-base) ease-standard hover:bg-surface-2 focus-within:bg-surface-2",
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <div className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-(--duration-normal) motion-safe:ease-standard motion-safe:group-focus-within/card:scale-[1.03] motion-safe:group-hover/card:scale-[1.03]">
          {model.imageUrl ? (
            <CarPhoto
              src={model.imageUrl}
              alt={`${manufacturerName} ${model.name}`}
              sizes={sizes}
              fallback={
                <Silhouette bodyType={model.bodyType} fuelType={model.leadFuel} />
              }
            />
          ) : (
            <Silhouette bodyType={model.bodyType} fuelType={model.leadFuel} />
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-h3">
          <Link
            href={href}
            className="outline-none before:absolute before:inset-0 before:z-10 before:rounded-card focus-visible:before:ring-2 focus-visible:before:ring-gold-500 focus-visible:before:ring-inset"
          >
            <span className="sr-only">{manufacturerName} </span>
            {model.name}
          </Link>
        </h3>
        {meta ? <p className="mt-1 text-body-s text-ink-400">{meta}</p> : null}

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Body style and powertrains">
          <li>
            <Badge>{BODY_LABELS[model.bodyType]}</Badge>
          </li>
          {model.fuelTypes.map((fuel) => (
            <li key={fuel}>
              <Badge tone={fuelTone(fuel)}>{FUEL_LABELS[fuel]}</Badge>
            </li>
          ))}
        </ul>

        <div aria-hidden="true" className="min-h-5 flex-1" />

        <p className="border-t border-line-subtle pt-4 text-body-s text-ink-200">
          <span className="tabular">{figures}</span>
          {model.power ? null : (
            <span className="text-ink-400"> · power not published</span>
          )}
        </p>
      </div>
    </article>
  );
}
