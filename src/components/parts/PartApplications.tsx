import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { distinctVariantName, formatNumber } from "@/lib/format";
import { FUEL_LABELS } from "@/lib/facets";
import { powertrainKind } from "@/types/domain";
import type { PartApplication } from "@/lib/queries/parts";

/** A small body-style drawing for a car without a photograph, labelled as one. */
function Drawing({ car }: { car: PartApplication["car"] }) {
  const shape = carSilhouette(car.body_type, powertrainKind(car.fuel_type));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-surface-2">
      <svg viewBox={shape.viewBox} className="w-[70%]" aria-hidden="true" fill="none">
        <path d={shape.body} className="fill-surface-3 stroke-ink-500" strokeWidth={3} />
        {shape.wheels.map((wheel) => (
          <circle
            key={wheel.cx}
            cx={wheel.cx}
            cy={wheel.cy}
            r={wheel.r}
            className="fill-void stroke-ink-500"
            strokeWidth={3}
          />
        ))}
      </svg>
      <span className="text-[11px] leading-none text-ink-400">Drawing</span>
    </div>
  );
}

/**
 * The catalogued cars that record a part, each with the note that is specific
 * to that car ("Performance Battery Plus, 93.4 kWh gross…"). One link per row.
 */
export function PartApplications({ applications }: { applications: PartApplication[] }) {
  return (
    <ol className="border-t border-line-subtle">
      {applications.map(({ car, detail }) => {
        const variant = distinctVariantName(car.model_name, car.variant_name);
        return (
          <li key={car.variant_id} className="border-b border-line-subtle">
            <Link
              href={`/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`}
              className="group grid grid-cols-[6.5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-8"
            >
              <div className="relative aspect-[16/10] overflow-hidden rounded-control bg-surface-2">
                {car.primary_image_url ? (
                  <CarPhoto
                    src={car.primary_image_url}
                    alt=""
                    sizes="160px"
                    fallback={<Drawing car={car} />}
                  />
                ) : (
                  <Drawing car={car} />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-body-s text-ink-400">{car.manufacturer_name}</p>
                <p className="mt-0.5 text-h4 transition-colors duration-(--duration-fast) group-hover:text-ink-200">
                  {car.model_name}
                  {variant ? ` ${variant}` : null}
                </p>
                {detail ? (
                  <p className="mt-2 max-w-[68ch] text-body-s text-ink-300">{detail}</p>
                ) : null}
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                {car.fuel_type ? (
                  <Badge tone={fuelTone(car.fuel_type)}>
                    {FUEL_LABELS[car.fuel_type]}
                  </Badge>
                ) : null}
                {car.power_hp !== null ? (
                  <span className="text-caption tabular-nums">
                    {formatNumber(car.power_hp)} hp
                  </span>
                ) : null}
                <ChevronRight
                  className="hidden size-4 text-ink-500 transition-[translate,color] duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-ink-50 sm:block"
                  aria-hidden="true"
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
