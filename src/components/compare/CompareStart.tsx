import { formatNumber } from "@/lib/format";
import { MAX_COMPARE } from "@/lib/compare-slug";
import { shortCarName } from "@/lib/compare-rows";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { powertrainKind } from "@/types/domain";
import { CarThumb } from "./CarThumb";
import { CompareCombobox } from "./CompareCombobox";
import { CompareLink } from "./CompareState";
import { quickStarts } from "./picker-logic";

/** The three promises the comparison keeps, as a quiet caption row. */
const PRINCIPLES = [
  {
    title: "Honest figures",
    text: "Anything a maker does not publish shows as a dash, never an estimate.",
  },
  {
    title: "Fair winners",
    text: "A best figure is marked only when at least two cars publish it.",
  },
  {
    title: "Real prices",
    text: "Shown in the currency and market they were published in, never converted.",
  },
];

/**
 * Nothing chosen yet: a full-width picker, and a few ready-made comparisons
 * so the page is useful in one click. The ready-made pairs follow a stated
 * rule (closest published power, different makers, largest categories)
 * rather than any editorial or popularity claim.
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
    <div>
      <section aria-labelledby="compare-start-heading">
        <h2 id="compare-start-heading" className="text-h3">
          Choose the first car
        </h2>
        <p className="mt-2 max-w-[60ch] text-body-s text-ink-400">
          Then add up to {MAX_COMPARE - 1} more. The comparison lives in the address bar,
          so it can be bookmarked or shared as a link.
        </p>
        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={null}
          variant="hero"
          label="Search the catalogue"
          hideLabel
          className="mt-6"
        />
      </section>

      {starts.length > 0 ? (
        <section aria-labelledby="compare-rivals-heading" className="mt-20 lg:mt-24">
          <h2 id="compare-rivals-heading" className="text-h2">
            Natural rivals
          </h2>
          <p className="mt-3 max-w-[60ch] text-lead">
            In each of the largest categories, the two cars from different makers whose
            published power is closest.
          </p>

          <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
            {starts.map(({ category, a, b }) => {
              const nameA = shortCarName(a.model, a.variant);
              const nameB = shortCarName(b.model, b.variant);
              return (
                <li key={`${a.slug}+${b.slug}`}>
                  <CompareLink
                    to={[a.slug, b.slug]}
                    aria-label={`Compare the ${a.manufacturer} ${nameA} with the ${b.manufacturer} ${nameB}`}
                    className="group block h-full rounded-card bg-surface-1 p-4 transition-colors duration-(--duration-fast) hover:bg-surface-2 sm:p-5"
                  >
                    <span className="relative grid grid-cols-2 gap-2">
                      {[a, b].map((car) => (
                        <CarThumb
                          key={car.slug}
                          src={car.imageUrl}
                          alt=""
                          bodyType={car.bodyType}
                          powertrain={powertrainKind(car.fuelType)}
                          sizes="(min-width: 1440px) 300px, (min-width: 768px) 22vw, 45vw"
                          frameClassName="aspect-[16/10] w-full rounded-control [&_img]:transition-transform [&_img]:duration-(--duration-normal) [&_img]:ease-standard group-hover:[&_img]:scale-[1.03] motion-reduce:group-hover:[&_img]:scale-100"
                        />
                      ))}
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 grid size-9 -translate-1/2 place-items-center rounded-pill bg-surface-1 text-caption text-ink-200 transition-colors duration-(--duration-fast) group-hover:bg-surface-2"
                      >
                        vs
                      </span>
                    </span>

                    {category ? (
                      <span className="mt-5 block text-eyebrow">{category}</span>
                    ) : null}
                    <span className="mt-2 grid grid-cols-2 gap-4">
                      {[
                        { car: a, name: nameA },
                        { car: b, name: nameB },
                      ].map(({ car, name }) => (
                        <span key={car.slug} className="min-w-0">
                          <span className="block text-caption">{car.manufacturer}</span>
                          <span className="mt-0.5 block text-h4">{name}</span>
                          <span className="mt-1 block text-body-s text-ink-300 tabular-nums">
                            {car.powerHp !== null
                              ? `${formatNumber(car.powerHp)} hp`
                              : "Power not published"}
                          </span>
                        </span>
                      ))}
                    </span>
                  </CompareLink>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section
        aria-label="How the comparison works"
        className="mt-20 border-t border-line-subtle pt-8 lg:mt-24"
      >
        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-10">
          {PRINCIPLES.map((item) => (
            <li key={item.title} className="text-caption">
              <span className="block text-body-s text-ink-200">{item.title}</span>
              <span className="mt-1 block max-w-[40ch]">{item.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
