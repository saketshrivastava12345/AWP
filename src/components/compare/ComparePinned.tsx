import Link from "next/link";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EM_DASH, formatNumber } from "@/lib/format";
import { Badge, fuelTone } from "@/components/ui/Badge";
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
import { CarMarker } from "./parts";
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
      {/* ------------------------------------------------ The pinned car */}
      <article
        aria-label={`Pinned: ${car.fullName}`}
        className="self-start overflow-hidden rounded-md border border-line bg-surface-1/60"
      >
        {/* Compact and side-by-side below lg, so the picker stays near the top
            of a phone screen; a full card beside the picker on desktop. */}
        <div className="flex items-start gap-4 p-4 sm:p-5 lg:block lg:p-0">
          <CarThumb
            src={car.photo?.src ?? null}
            alt={car.photo?.alt ?? car.fullName}
            bodyType={car.bodyType}
            powertrain={car.powertrain}
            sizes="(min-width: 1024px) 480px, (min-width: 640px) 208px, 128px"
            caption
            eager
            className="w-32 shrink-0 sm:w-52 lg:w-full"
            frameClassName="aspect-[16/10] w-full rounded-xs lg:rounded-none"
          />
          <div className="min-w-0 flex-1 lg:px-6 lg:pt-6">
            <div className="flex items-start gap-3">
              <CarMarker index={0} className="mt-1 hidden sm:grid" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-micro tracking-[0.14em] text-ink-400 uppercase sm:tracking-label">
                  {car.flag ? <span aria-hidden="true">{car.flag} </span> : null}
                  {car.manufacturer}
                </p>
                <h2 className="mt-1.5 font-display text-sm leading-snug tracking-[0.04em] text-ink-50 sm:text-lg">
                  {car.shortName}
                </h2>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4">
              <Badge tone={fuelTone(car.fuelType)}>{car.fuelLabel}</Badge>
              <Badge className="hidden sm:inline-flex">{car.category}</Badge>
              {car.statusLabel ? <Badge tone="gold">{car.statusLabel}</Badge> : null}
            </div>
            {car.generation || car.years ? (
              <p className="mt-2 text-xs text-ink-400 sm:mt-3">
                {[car.generation ? `Generation ${car.generation}` : null, car.years]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
          <dl className="hidden grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid lg:mt-6">
            {HEADLINE.map(({ id, label }) => {
              const cell = rows.get(id)?.cells[0];
              const value = cell?.state === "value" ? cell.display : null;
              return (
                <div key={id} className="bg-surface-1 px-4 py-3">
                  <dt className="text-label">{label}</dt>
                  <dd
                    className={cn(
                      "tabular mt-1.5 font-mono text-sm",
                      value ? "text-ink-50" : "text-ink-600",
                      id === "price.listed" && value && "text-gold-200",
                    )}
                  >
                    {value ?? (
                      <>
                        <span aria-hidden="true">{EM_DASH}</span>
                        <span className="sr-only">Not published</span>
                      </>
                    )}
                  </dd>
                  {id === "price.listed" && cell?.note ? (
                    <p className="mt-1 text-micro leading-snug text-ink-500">
                      {cell.note}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </dl>

          <div className="flex items-center gap-1 sm:mt-5 sm:gap-2 lg:mt-6">
            <Link
              href={car.href}
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-line-strong px-3 font-display text-micro tracking-button text-ink-100 uppercase transition-colors hover:border-gold-500 hover:text-gold-300 sm:px-4"
            >
              Full specification
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <CompareLink
              to={[]}
              aria-label={`Remove ${car.fullName} and start again`}
              className="inline-flex h-11 items-center gap-2 rounded-xs px-3 font-display text-micro tracking-button text-ink-400 uppercase transition-colors hover:bg-surface-2 hover:text-signal-negative"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </CompareLink>
          </div>
        </div>
      </article>

      {/* ---------------------------------------------- Choose the next */}
      <section aria-labelledby="compare-next-heading">
        <div aria-hidden="true" className="flex gap-2">
          {Array.from({ length: MAX_COMPARE }, (_, index) => (
            <span
              key={index}
              className={cn(
                "grid size-7 place-items-center rounded-xs border font-mono text-[11px]",
                index === 0
                  ? "border-gold-600 bg-gold-500/15 text-gold-200"
                  : index === 1
                    ? "border-dashed border-gold-700 text-gold-400"
                    : "border-dashed border-line-strong text-ink-600",
              )}
            >
              {index + 1}
            </span>
          ))}
        </div>
        <h2
          id="compare-next-heading"
          className="mt-5 font-display text-xl leading-snug tracking-[0.05em] text-ink-50 sm:mt-6 sm:text-2xl"
        >
          Compare the {car.shortName} with…
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-300">
          Add a second car to see every figure side by side, then up to {MAX_COMPARE - 2}{" "}
          more.
        </p>

        <CompareCombobox
          options={options}
          truncated={truncated}
          anchor={anchor}
          variant="hero"
          label="Search the catalogue"
          autoFocus
          className="mt-7"
        />

        {suggestions.length > 0 ? (
          <div className="mt-10 space-y-8">
            {suggestions.map((group) => (
              <div key={group.id}>
                <h3 className="text-label">{group.title}</h3>
                <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {group.options.map((option) => (
                    <li key={option.slug}>
                      <CompareLink
                        to={[car.slug, option.slug]}
                        aria-label={`Compare with ${option.manufacturer} ${shortCarName(option.model, option.variant)}`}
                        className="group flex min-h-16 items-center gap-3 rounded-sm border border-line bg-surface-1/50 p-2 pr-3 transition-colors hover:border-gold-700 hover:bg-surface-2/60"
                      >
                        <CarThumb
                          src={option.imageUrl}
                          alt=""
                          bodyType={option.bodyType}
                          powertrain={powertrainKind(option.fuelType)}
                          sizes="80px"
                          className="shrink-0"
                          frameClassName="h-12 w-[4.5rem] rounded-xs"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-ink-400">
                            {option.manufacturer}
                          </span>
                          <span className="block truncate text-sm text-ink-100">
                            {shortCarName(option.model, option.variant)}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-right font-mono text-xs text-ink-400">
                          {option.powerHp !== null
                            ? `${formatNumber(option.powerHp)} hp`
                            : EM_DASH}
                        </span>
                        <Plus
                          className="size-4 shrink-0 text-gold-600 transition-colors group-hover:text-gold-300"
                          aria-hidden="true"
                        />
                      </CompareLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-xs leading-relaxed text-ink-500">
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
