import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { MAX_COMPARE } from "@/lib/compare-slug";
import { shortCarName } from "@/lib/compare-rows";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { powertrainKind } from "@/types/domain";
import { CarThumb } from "./CarThumb";
import { CompareCombobox } from "./CompareCombobox";
import { CompareLink } from "./CompareState";
import { quickStarts } from "./picker-logic";

/**
 * Nothing chosen yet: the picker, and a few ready-made comparisons so the
 * page is useful in one click. The ready-made pairs follow a stated rule
 * (closest published power, different makers, largest categories) rather
 * than any editorial or popularity claim.
 */
export function CompareStart({
  options,
  truncated,
}: {
  options: ComparePickerOption[];
  truncated: boolean;
}) {
  const starts = quickStarts(options, 4);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
      <section
        aria-labelledby="compare-start-heading"
        className="edge-light self-start rounded-md glass p-6 sm:p-8"
      >
        <h2
          id="compare-start-heading"
          className="font-display text-lg tracking-[0.05em] text-ink-50 sm:text-xl"
        >
          Choose the first car
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
          Search the catalogue, then add up to {MAX_COMPARE - 1} more. The comparison
          lives in the address bar, so it can be bookmarked or shared as a link.
        </p>
        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={null}
          variant="hero"
          label="Search the catalogue"
          className="mt-7"
        />
        <ul className="mt-8 grid gap-4 border-t border-line pt-6 text-xs leading-relaxed text-ink-400 sm:grid-cols-3">
          <li>
            <span className="block font-display text-micro tracking-hud text-gold-300 uppercase">
              Honest figures
            </span>
            Anything a maker does not publish shows as a dash, never an estimate.
          </li>
          <li>
            <span className="block font-display text-micro tracking-hud text-gold-300 uppercase">
              Fair winners
            </span>
            A best figure is marked only when at least two cars publish it.
          </li>
          <li>
            <span className="block font-display text-micro tracking-hud text-gold-300 uppercase">
              Real prices
            </span>
            Shown in the currency and market they were published in, never converted.
          </li>
        </ul>
      </section>

      {starts.length > 0 ? (
        <section aria-labelledby="compare-rivals-heading">
          <h2 id="compare-rivals-heading" className="text-label">
            Natural rivals
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            In each of the largest categories, the two cars from different makers whose
            published power is closest.
          </p>
          <ul className="mt-5 space-y-3">
            {starts.map(({ category, a, b }) => {
              const nameA = `${a.manufacturer} ${shortCarName(a.model, a.variant)}`;
              const nameB = `${b.manufacturer} ${shortCarName(b.model, b.variant)}`;
              return (
                <li key={`${a.slug}+${b.slug}`}>
                  <CompareLink
                    to={[a.slug, b.slug]}
                    className="group flex items-center gap-4 rounded-sm border border-line bg-surface-1/50 p-3 transition-colors hover:border-gold-700 hover:bg-surface-2/60"
                  >
                    <span className="flex shrink-0 flex-col gap-1">
                      <CarThumb
                        src={a.imageUrl}
                        alt=""
                        bodyType={a.bodyType}
                        powertrain={powertrainKind(a.fuelType)}
                        sizes="88px"
                        frameClassName="h-11 w-[4.5rem] rounded-xs"
                      />
                      <CarThumb
                        src={b.imageUrl}
                        alt=""
                        bodyType={b.bodyType}
                        powertrain={powertrainKind(b.fuelType)}
                        sizes="88px"
                        frameClassName="h-11 w-[4.5rem] rounded-xs"
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-label">{category}</span>
                      <span className="mt-1.5 block text-sm leading-snug text-ink-100">
                        {nameA}
                      </span>
                      <span className="block text-xs text-ink-500">versus</span>
                      <span className="block text-sm leading-snug text-ink-100">
                        {nameB}
                      </span>
                      <span className="tabular mt-1.5 block font-mono text-xs text-ink-400">
                        {formatNumber(a.powerHp)} hp · {formatNumber(b.powerHp)} hp
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 self-end text-gold-600 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-300"
                      aria-hidden="true"
                    />
                  </CompareLink>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
