import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatEnumLabel, formatNumber, formatYearRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { powerRange, rangeLabel, type LineupModel } from "./brand";
import type { BrandCar } from "@/lib/queries/manufacturers";

/**
 * A maker's models as tiles: the model name (opening its catalogue page), its
 * segment and body style, the power range across its published variants, and
 * each generation with its variants as rows linking to their pages.
 *
 * One or two models sit two-up, three or more three-up, so a small line-up
 * never leaves two thirds of the row empty.
 */
export function ModelLineup({
  manufacturerSlug,
  models,
}: {
  manufacturerSlug: string;
  models: LineupModel<BrandCar>[];
}) {
  return (
    <ul
      className={cn(
        "grid gap-4 sm:gap-6 md:grid-cols-2",
        models.length >= 3 && "xl:grid-cols-3",
      )}
    >
      {models.map((model) => {
        const cars = model.generations.flatMap((generation) => generation.cars);
        const power = powerRange(cars);
        const summary = [
          model.categoryName,
          model.bodyType ? formatEnumLabel(model.bodyType) : null,
        ].filter(Boolean);

        return (
          <li
            key={model.id}
            className="flex flex-col rounded-card bg-surface-1 p-6 sm:p-8"
          >
            <h3 className="text-h3">
              <Link
                href={`/cars/${manufacturerSlug}/${model.slug}`}
                className="rounded-xs transition-colors duration-(--duration-fast) hover:text-ink-200"
              >
                {model.name}
              </Link>
            </h3>
            {summary.length > 0 ? (
              <p className="mt-2 text-body-s text-ink-400">{summary.join(" · ")}</p>
            ) : null}

            <p className="mt-6 flex flex-wrap items-baseline gap-x-2 text-ink-50">
              {power ? (
                <>
                  <span className="text-figure">
                    {rangeLabel(power, formatNumber)}
                  </span>
                  <span className="text-body-s text-ink-400">hp</span>
                  <span aria-hidden="true" className="text-ink-500">
                    ·
                  </span>
                </>
              ) : null}
              <span className="text-body-s text-ink-300">
                {model.variantCount} {model.variantCount === 1 ? "variant" : "variants"}
              </span>
            </p>

            <div className="mt-6 flex-1 space-y-6">
              {model.generations.map((generation) => {
                const years =
                  generation.yearStart !== null
                    ? formatYearRange(generation.yearStart, generation.yearEnd)
                    : null;
                return (
                  <div key={generation.key}>
                    {generation.name || years ? (
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption">
                        {generation.name ? (
                          <Badge>
                            <span className="sr-only">Generation </span>
                            {generation.name}
                          </Badge>
                        ) : null}
                        {years ? (
                          <span className="tabular-nums">
                            {generation.yearsFromModel ? "Model years " : null}
                            {years}
                          </span>
                        ) : null}
                      </p>
                    ) : null}

                    <ul className="mt-3 border-t border-line-subtle">
                      {generation.cars.map((car) => (
                        <li key={car.variant_id} className="border-b border-line-subtle">
                          <Link
                            href={`/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`}
                            className="group flex min-h-12 items-center gap-4 py-2 text-body-s text-ink-100 transition-colors duration-(--duration-fast) hover:text-ink-50"
                          >
                            <span className="min-w-0 flex-1">{car.variant_name}</span>
                            {car.power_hp !== null ? (
                              <span className="shrink-0 text-caption tabular-nums">
                                {formatNumber(car.power_hp)} hp
                              </span>
                            ) : null}
                            <ChevronRight
                              className="size-4 shrink-0 text-ink-500 transition-[color,translate] duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-ink-50"
                              aria-hidden="true"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
