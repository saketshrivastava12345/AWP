import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatEnumLabel, formatNumber, formatYearRange } from "@/lib/format";
import type { LineupModel } from "./brand";
import type { BrandCar } from "@/lib/queries/manufacturers";

/**
 * A maker's models as a spec-sheet list: one row per model, its generations
 * (code and years) and every published variant as a link to its page. The
 * model name opens the model's catalogue page.
 */
export function ModelLineup({
  manufacturerSlug,
  models,
}: {
  manufacturerSlug: string;
  models: LineupModel<BrandCar>[];
}) {
  return (
    <ol className="border-t border-line">
      {models.map((model, index) => (
        <li
          key={model.id}
          className="grid gap-5 border-b border-line-subtle py-7 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-10"
        >
          <div className="min-w-0">
            <p className="tabular font-mono text-micro text-ink-500">
              {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-display text-lg leading-tight tracking-[0.06em] break-words text-ink-50">
              <Link
                href={`/cars/${manufacturerSlug}/${model.slug}`}
                className="transition-colors duration-(--duration-fast) hover:text-gold-300"
              >
                {model.name}
              </Link>
            </h3>
            <p className="mt-2 text-hud">
              {[
                model.categoryName,
                model.bodyType ? formatEnumLabel(model.bodyType) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="tabular mt-3 font-mono text-xs text-ink-400">
              {model.variantCount} {model.variantCount === 1 ? "variant" : "variants"}
            </p>
          </div>

          <div className="min-w-0 space-y-5">
            {model.generations.map((generation) => {
              const years =
                generation.yearStart !== null
                  ? formatYearRange(generation.yearStart, generation.yearEnd)
                  : null;
              return (
                <div key={generation.key}>
                  {generation.name || years ? (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {generation.name ? (
                        <span className="inline-flex items-center rounded-xs border border-gold-800 bg-gold-500/5 px-2 py-1 font-mono text-micro leading-none text-gold-300">
                          <span className="sr-only">Generation </span>
                          {generation.name}
                        </span>
                      ) : null}
                      {years ? (
                        <span className="tabular font-mono text-xs text-ink-400">
                          {generation.yearsFromModel ? (
                            <span className="sr-only">Production </span>
                          ) : null}
                          {years}
                        </span>
                      ) : null}
                    </p>
                  ) : null}

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {generation.cars.map((car) => (
                      <li key={car.variant_id}>
                        <Link
                          href={`/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`}
                          className="group inline-flex min-h-10 items-center gap-3 border border-line bg-surface-1/60 px-3.5 py-2 text-sm text-ink-100 transition-colors duration-(--duration-fast) hover:border-gold-700 hover:text-gold-200"
                        >
                          <span>{car.variant_name}</span>
                          {car.power_hp !== null ? (
                            <span className="tabular font-mono text-[11px] text-ink-400 group-hover:text-gold-300/80">
                              {formatNumber(car.power_hp)} hp
                            </span>
                          ) : null}
                          <ArrowRight
                            className="size-3.5 text-ink-500 transition-colors group-hover:text-gold-300"
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
      ))}
    </ol>
  );
}
