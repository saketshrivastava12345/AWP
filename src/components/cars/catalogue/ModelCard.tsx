import Link from "next/link";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import { formatNumber, formatYearSpan } from "@/lib/format";
import type { ModelSummary } from "@/lib/queries/models";
import { cn } from "@/lib/utils";
import { Silhouette } from "./Silhouette";
import { HudCardShell, HudMediaOverlay } from "./HudCardShell";
import { formatRange } from "./SpecRange";

/**
 * A model line on a maker's catalogue page, in the same HUD shell as the
 * car card: image first, the name, "Model years 2019–present · 992", body
 * style and powertrains as badges, and one line of figures — the spread of
 * published power (glowing) and how many variants the catalogue holds.
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
    model.years.start !== null
      ? formatYearSpan(model.years.start, model.years.end)
      : null;
  const meta = [
    years ? `Model years ${years}` : null,
    model.generations.map((generation) => generation.name).join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <HudCardShell className={className}>
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <div className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-(--duration-slow) motion-safe:ease-standard motion-safe:group-focus-within/card:scale-[1.04] motion-safe:group-hover/card:scale-[1.04]">
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
        <HudMediaOverlay />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="truncate font-mono text-[11px] tracking-hud text-cyan-200/80 uppercase">
          {manufacturerName}
        </p>
        <h3 className="mt-1 text-h3 transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
          <Link
            href={href}
            className="outline-none before:absolute before:inset-0 before:z-10 before:content-['']"
          >
            <span className="sr-only">{manufacturerName} </span>
            {model.name}
          </Link>
        </h3>
        {meta ? <p className="mt-1.5 text-body-s text-ink-400">{meta}</p> : null}

        <ul
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="Body style and powertrains"
        >
          <li>
            <Badge>{BODY_LABELS[model.bodyType]}</Badge>
          </li>
          {model.fuelTypes.map((fuel) => (
            <li key={fuel}>
              <Badge tone={fuelTone(fuel)}>{FUEL_LABELS[fuel]}</Badge>
            </li>
          ))}
        </ul>

        <div aria-hidden="true" className="min-h-4 flex-1" />

        <dl className="relative mt-4 grid grid-cols-2 gap-3 pt-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,oklch(0.83_0.13_210/55%),oklch(0.83_0.13_210/12%)_40%,transparent)] before:content-['']">
          <div
            className={cn(
              "flex min-w-0 flex-col-reverse gap-1.5",
              "before:order-last before:mb-0.5 before:block before:h-px before:w-4 before:content-['']",
              model.power
                ? "before:bg-cyan-400 before:shadow-[0_0_6px_var(--color-cyan-400)]"
                : "before:bg-ink-600",
            )}
          >
            <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
              Power{model.power ? null : " · not published"}
            </dt>
            <dd className="flex items-baseline gap-1 whitespace-nowrap">
              {model.power ? (
                <>
                  <span className="font-hud text-[17px] leading-tight text-ink-50 tabular-nums glow-text">
                    {formatRange(model.power)}
                  </span>
                  <span className="font-mono text-[10px] tracking-hud text-cyan-200 uppercase">
                    hp
                  </span>
                </>
              ) : (
                <>
                  <span aria-hidden="true" className="font-hud text-lg text-ink-500">
                    —
                  </span>
                  <span className="sr-only">Not available</span>
                </>
              )}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col-reverse gap-1.5 before:order-last before:mb-0.5 before:block before:h-px before:w-4 before:bg-cyan-400 before:shadow-[0_0_6px_var(--color-cyan-400)] before:content-['']">
            <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
              Variants
            </dt>
            <dd className="font-hud text-[17px] leading-tight text-ink-50 tabular-nums glow-text">
              {formatNumber(model.variantCount)}
            </dd>
          </div>
        </dl>
      </div>
    </HudCardShell>
  );
}
