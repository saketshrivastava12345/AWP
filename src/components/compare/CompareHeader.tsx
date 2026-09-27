import type { CSSProperties } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Badge, fuelTone } from "@/components/ui/Badge";
import type { CompareCarSummary } from "@/lib/compare-rows";
import { CarThumb } from "./CarThumb";
import { CompareLink } from "./CompareState";
import { CarMarker } from "./parts";

/**
 * The cars across the top of the comparison: photograph, powertrain, status,
 * generation and years.
 *
 * One set of cards serves both layouts, so each photograph is downloaded
 * once. Below 768px it is a strip of cards (two in view, swipe for more),
 * each with its name and remove control. From 768px it becomes a grid whose
 * columns match the table's (LABEL_COLUMN, then equal shares), so each
 * photograph sits over its column; the names and remove controls then live
 * in the table's sticky header instead.
 */
export function CompareHeader({ cars }: { cars: CompareCarSummary[] }) {
  const others = (slug: string) => cars.map((car) => car.slug).filter((s) => s !== slug);
  const style = { "--cars": cars.length } as CSSProperties;

  return (
    <ul
      aria-label="Cars in this comparison"
      style={style}
      className={
        "-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 " +
        "sm:-mx-8 sm:scroll-px-8 sm:px-8 " +
        "md:mx-0 md:grid md:snap-none md:grid-cols-[7rem_repeat(var(--cars),minmax(0,1fr))] md:gap-0 md:overflow-visible md:px-0 md:pb-4 " +
        "lg:grid-cols-[13rem_repeat(var(--cars),minmax(0,1fr))]"
      }
    >
      <li aria-hidden="true" className="hidden self-end pr-4 md:block">
        <p className="text-micro leading-relaxed text-ink-500">
          Bars compare each row on its own scale.{" "}
          <span className="text-signal-positive">Best</span> is marked only when at least
          two cars publish the figure.
        </p>
      </li>

      {cars.map((car, index) => (
        <li
          key={car.slug}
          className={
            "w-[calc((100%-0.75rem)/2)] shrink-0 snap-start overflow-hidden rounded-sm border border-line bg-surface-1/60 " +
            "md:w-auto md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:px-2 lg:px-3"
          }
        >
          <CarThumb
            src={car.photo?.src ?? null}
            alt={car.photo?.alt ?? car.fullName}
            credit={car.photo?.credit ?? null}
            reserveCredit
            eager
            bodyType={car.bodyType}
            powertrain={car.powertrain}
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 22vw, 48vw"
            caption
            frameClassName="aspect-[16/10] w-full md:max-h-52 md:rounded-xs md:border md:border-line"
            className="[&>p]:px-3 md:[&>p]:px-0"
          />
          <div className="p-3 pt-2 md:mt-1 md:p-0">
            {/* Name and remove: here on phones, in the sticky table header from 768px. */}
            <div className="mb-2.5 flex items-start gap-2 md:hidden">
              <CarMarker index={index} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-display text-micro tracking-[0.12em] text-ink-400 uppercase">
                  {car.manufacturer}
                </span>
                <Link
                  href={car.href}
                  className="mt-1 block font-display text-[11px] leading-snug tracking-[0.04em] text-ink-50"
                >
                  {car.shortName}
                </Link>
              </div>
              <CompareLink
                to={others(car.slug)}
                aria-label={`Remove ${car.fullName} from the comparison`}
                className="-mt-2.5 -mr-2.5 grid size-11 shrink-0 place-items-center rounded-sm text-ink-500 transition-colors hover:text-signal-negative"
              >
                <X className="size-4" aria-hidden="true" />
              </CompareLink>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={fuelTone(car.fuelType)}>{car.fuelLabel}</Badge>
              {car.statusLabel ? <Badge tone="gold">{car.statusLabel}</Badge> : null}
            </div>
            {car.generation || car.years ? (
              <p className="mt-2 text-xs text-ink-400">
                {[car.generation, car.years].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
