import type { CSSProperties } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Badge, fuelTone } from "@/components/ui/Badge";
import type { CompareCarSummary } from "@/lib/compare-rows";
import { CarThumb } from "./CarThumb";
import { CompareLink } from "./CompareState";
import { CarMarker, CompareLegend } from "./parts";

/**
 * The cars across the top of the comparison: photograph and remove control,
 * plus make, name, powertrain and years on phones.
 *
 * One set of cards serves both layouts, so each photograph is downloaded
 * once. Below 768px it is a strip of cards (two in view, swipe for more),
 * each with its make and name. From 768px it becomes a grid whose columns
 * match the table's (see LABEL_COLUMN), so each photograph sits over its
 * column and the make and name follow directly underneath, in the table's
 * sticky header row. The first cell holds the legend from lg.
 */
export function CompareHeader({ cars }: { cars: CompareCarSummary[] }) {
  const others = (slug: string) => cars.map((car) => car.slug).filter((s) => s !== slug);
  const style = { "--cars": cars.length } as CSSProperties;

  return (
    <ul
      aria-label="Cars in this comparison"
      style={style}
      className={
        "-mx-5 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 " +
        "sm:-mx-8 sm:scroll-px-8 sm:px-8 " +
        "md:mx-0 md:grid md:snap-none md:grid-cols-[8rem_repeat(var(--cars),minmax(0,1fr))] md:gap-0 md:overflow-visible md:px-0 md:pb-0 " +
        "lg:grid-cols-[20rem_repeat(var(--cars),minmax(0,1fr))] xl:grid-cols-[23rem_repeat(var(--cars),minmax(0,1fr))]"
      }
    >
      <li className="hidden self-end pr-10 pb-6 lg:block">
        <CompareLegend layout="list" />
      </li>
      <li aria-hidden="true" className="hidden md:block lg:hidden" />

      {cars.map((car, index) => {
        const meta = [car.generation, car.years, car.statusLabel].filter(Boolean);
        return (
          <li
            key={car.slug}
            className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start md:w-auto md:px-3"
          >
            <div className="relative">
              <span
                aria-hidden="true"
                className="hud-brackets pointer-events-none absolute -inset-1.5 z-10 [--hud-c:var(--color-cyan-300)] [--hud-l:16px]"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-2 left-2 z-10 bg-void/70 px-1.5 py-0.5 hud-label"
              >
                Car {String(index + 1).padStart(2, "0")}
              </span>
              <CarThumb
                src={car.photo?.src ?? null}
                alt={car.photo?.alt ?? car.fullName}
                credit={car.photo?.credit ?? null}
                reserveCredit
                eager
                bodyType={car.bodyType}
                powertrain={car.powertrain}
                sizes="(min-width: 1440px) 460px, (min-width: 768px) 30vw, 48vw"
                caption
                frameClassName="aspect-video w-full rounded-card"
              />
              <CompareLink
                to={others(car.slug)}
                aria-label={`Remove ${car.fullName} from the comparison`}
                className={
                  "absolute top-2 right-2 z-20 grid size-9 place-items-center rounded-pill border border-line bg-void/60 text-ink-50 backdrop-blur-md " +
                  "transition-[background-color,border-color,box-shadow,rotate] duration-(--duration-fast) hover:rotate-90 hover:border-signal-negative/60 hover:bg-void/85 hover:shadow-[0_0_10px_rgb(244_63_94/0.4)] " +
                  "after:absolute after:-inset-1 after:rounded-pill after:content-['']"
                }
              >
                <X className="size-4" aria-hidden="true" />
              </CompareLink>
            </div>

            {/* Make and name: here on phones, in the sticky table header from 768px. */}
            <div className="mt-3 flex items-start gap-2.5 md:hidden">
              <CarMarker index={index} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="block text-caption">{car.manufacturer}</span>
                <Link href={car.href} className="mt-0.5 block text-h4">
                  {car.shortName}
                </Link>
              </div>
            </div>

            {/* From 768px the Identity rows carry these, right below. */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 md:hidden">
              <Badge tone={fuelTone(car.fuelType)}>{car.fuelLabel}</Badge>
              {meta.length > 0 ? (
                <span className="text-caption">{meta.join(" · ")}</span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
