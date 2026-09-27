import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { EM_DASH, formatNumber } from "@/lib/format";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { MAX_COMPARE } from "@/lib/compare-slug";
import {
  shortCarName,
  type CompareCarSummary,
  type CompareGroup,
} from "@/lib/compare-rows";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { powertrainKind } from "@/types/domain";
import { CarThumb } from "./CarThumb";
import { CompareCombobox } from "./CompareCombobox";
import { CompareLink } from "./CompareState";
import { suggestFor } from "./picker-logic";

/** Headline figures on the pinned card, by compare-row id. */
const HEADLINE: { id: string; label: string }[] = [
  { id: "performance.power", label: "Power" },
  { id: "performance.zero100", label: "0–100 km/h" },
  { id: "performance.top", label: "Top speed" },
  { id: "price.listed", label: "Listed price" },
];

/**
 * One car chosen — typically arriving from a detail page's "Compare with".
 * The car is pinned on the left, and the picker is focused and prominent on
 * the right with suggestions built from its catalogue record, so the next
 * step is obvious and one click away.
 */
export function ComparePinned({
  car,
  groups,
  options,
  truncated,
}: {
  car: CompareCarSummary;
  groups: CompareGroup[];
  options: ComparePickerOption[];
  truncated: boolean;
}) {
  const anchor = options.find((option) => option.slug === car.slug) ?? null;
  const suggestions = anchor ? suggestFor(anchor, options, new Set([car.slug]), 4) : [];
  const rows = new Map(groups.flatMap((group) => group.rows.map((row) => [row.id, row])));
  const meta = [
    car.generation ? `Generation ${car.generation}` : null,
    car.years,
    car.statusLabel,
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* ------------------------------------------------ The pinned car */}
      <article
        aria-label={`Pinned: ${car.fullName}`}
        className="self-start overflow-hidden rounded-card bg-surface-1"
      >
        {/* Compact and side-by-side on phones, so the picker stays near the
            top of the screen; a full card beside the picker on desktop. */}
        <div className="flex items-start gap-4 p-4 sm:block sm:p-0">
          <CarThumb
            src={car.photo?.src ?? null}
            alt={car.photo?.alt ?? car.fullName}
            bodyType={car.bodyType}
            powertrain={car.powertrain}
            sizes="(min-width: 1024px) 520px, (min-width: 640px) 90vw, 128px"
            caption
            eager
            className="w-32 shrink-0 sm:w-full"
            frameClassName="aspect-[16/10] w-full rounded-control sm:rounded-none"
          />
          <div className="min-w-0 flex-1 sm:px-6 sm:pt-6">
            <p className="text-caption">{car.manufacturer}</p>
            <h2 className="mt-0.5 text-h4 sm:text-h3">{car.shortName}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge tone={fuelTone(car.fuelType)}>{car.fuelLabel}</Badge>
              {meta.length > 0 ? (
                <span className="hidden text-caption sm:inline">{meta.join(" · ")}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          <dl className="hidden grid-cols-2 border-t border-line-subtle sm:mt-6 sm:grid">
            {HEADLINE.map(({ id, label }, index) => {
              const cell = rows.get(id)?.cells[0];
              const value = cell?.state === "value" ? cell.display : null;
              return (
                <div
                  key={id}
                  className={cn(
                    "flex flex-col-reverse justify-end border-b border-line-subtle py-4",
                    index % 2 === 0 ? "pr-4" : "border-l pl-5",
                  )}
                >
                  <dt className="mt-1 text-caption">
                    {label}
                    {value ? null : " · not published"}
                  </dt>
                  <dd className="text-figure text-ink-50">
                    {value ?? (
                      <>
                        <span aria-hidden="true" className="text-ink-400">
                          {EM_DASH}
                        </span>
                        <span className="sr-only">Not published</span>
                      </>
                    )}
                    {id === "price.listed" && cell?.note ? (
                      <span className="mt-1 block text-caption">{cell.note}</span>
                    ) : null}
                  </dd>
                </div>
              );
            })}
          </dl>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-6">
            <ButtonLink href={car.href} variant="secondary" size="sm">
              Full specification
            </ButtonLink>
            <CompareLink
              to={[]}
              aria-label={`Remove ${car.fullName} and start again`}
              className={buttonClasses("link", "sm", "text-ink-300 hover:text-ink-50")}
            >
              Remove
            </CompareLink>
          </div>
        </div>
      </article>

      {/* ---------------------------------------------- Choose the next */}
      <section aria-labelledby="compare-next-heading">
        <p className="text-eyebrow">Car 2 of up to {MAX_COMPARE}</p>
        <h2 id="compare-next-heading" className="mt-3 text-h2">
          Compare the {car.shortName} with…
        </h2>
        <p className="mt-3 max-w-[60ch] text-body-s text-ink-400">
          Add a second car to see every figure side by side, then up to {MAX_COMPARE - 2}{" "}
          more.
        </p>

        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={anchor}
          variant="hero"
          label="Search the catalogue"
          hideLabel
          autoFocus
          className="mt-6"
        />

        {suggestions.length > 0 ? (
          <div className="mt-12 space-y-10">
            {suggestions.map((group) => (
              <div key={group.id}>
                <h3 className="text-h4">{group.title}</h3>
                <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.options.map((option) => (
                    <li key={option.slug}>
                      <CompareLink
                        to={[car.slug, option.slug]}
                        aria-label={`Compare with ${option.manufacturer} ${shortCarName(option.model, option.variant)}`}
                        className="group flex min-h-16 items-center gap-4 rounded-card bg-surface-1 p-2 pr-4 transition-colors duration-(--duration-fast) hover:bg-surface-2"
                      >
                        <CarThumb
                          src={option.imageUrl}
                          alt=""
                          bodyType={option.bodyType}
                          powertrain={powertrainKind(option.fuelType)}
                          sizes="96px"
                          className="shrink-0"
                          frameClassName="aspect-[16/10] w-20 rounded-control"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-caption">
                            {option.manufacturer}
                          </span>
                          <span className="block truncate text-body-s text-ink-50">
                            {shortCarName(option.model, option.variant)}
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-caption tabular-nums">
                          {option.powerHp !== null ? (
                            `${formatNumber(option.powerHp)} hp`
                          ) : (
                            <>
                              <span aria-hidden="true">{EM_DASH}</span>
                              <span className="sr-only">Power not published</span>
                            </>
                          )}
                        </span>
                        <Plus
                          className="size-4 shrink-0 text-ink-400 transition-colors group-hover:text-ink-50"
                          aria-hidden="true"
                        />
                      </CompareLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-caption">
              Suggestions come from the catalogue alone: the same category (closest
              published power first), the same maker, and cars within 15 % of its
              published power.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
