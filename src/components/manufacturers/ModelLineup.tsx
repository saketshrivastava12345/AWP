import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/fx/Reveal";
import { formatEnumLabel, formatNumber, formatYearRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { powerRange, rangeLabel, type LineupModel } from "./brand";
import type { BrandCar } from "@/lib/queries/manufacturers";

/**
 * A maker's models as HUD tiles: the model name (opening its catalogue
 * page), its segment and body style, the power range across its published
 * variants as a glowing figure, and each generation with its variants as
 * rows linking to their pages. The tiles rise into place one after another.
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
    <Reveal
      as="ul"
      stagger
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
            className="relative flex flex-col rounded-card p-6 hud-panel sm:p-8"
          >
            <span aria-hidden="true" className="hud-brackets -m-px" />
            <h3 className="text-h3">
              <Link
                href={`/cars/${manufacturerSlug}/${model.slug}`}
                className="rounded-xs fx-link transition-colors duration-(--duration-fast) hover:text-cyan-100"
              >
                {model.name}
              </Link>
            </h3>
            {summary.length > 0 ? (
              <p className="mt-2 font-mono text-[11px] tracking-hud text-ink-400 uppercase">
                {summary.join(" · ")}
              </p>
            ) : null}

            <p className="mt-6 flex flex-wrap items-baseline gap-x-2 text-ink-50">
              {power ? (
                <>
                  <span className="text-figure glow-text">
                    {rangeLabel(power, formatNumber)}
                  </span>
                  <span className="font-mono text-[11px] tracking-hud text-cyan-200 uppercase">
                    hp
                  </span>
                  <span aria-hidden="true" className="text-ink-500">
                    ·
                  </span>
                </>
              ) : null}
              <span className="font-mono text-[11px] tracking-hud text-ink-300 uppercase">
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
                          <span className="font-mono text-[11px] tracking-hud text-ink-400 uppercase tabular-nums">
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
                            className="group -mx-2 flex min-h-12 items-center gap-4 rounded-xs px-2 py-2 text-body-s text-ink-100 transition-colors duration-(--duration-fast) hover:bg-cyan-400/6 hover:text-ink-50"
                          >
                            <span className="min-w-0 flex-1">{car.variant_name}</span>
                            {car.power_hp !== null ? (
                              <span className="shrink-0 font-mono text-[11px] text-cyan-200 tabular-nums">
                                {formatNumber(car.power_hp)} hp
                              </span>
                            ) : null}
                            <ChevronRight
                              className="size-4 shrink-0 text-cyan-400/60 transition-[color,translate] duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-cyan-200"
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
    </Reveal>
  );
}
