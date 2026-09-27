import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { formatNumber, formatYearSpan, modelVariantName } from "@/lib/format";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { CarPhoto, type PhotoLoading } from "./CarPhoto";
import { ListedPrice } from "./ListedPrice";
import { Silhouette } from "./catalogue/Silhouette";
import { lifecycleOf } from "./catalogue/lifecycle";
import { ModelPreload } from "./catalogue/ModelPreload";

export function carHref(
  car: Pick<CatalogCardRow, "manufacturer_slug" | "model_slug" | "variant_slug">,
): string {
  return `/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;
}

/** One figure of the card's row: value first, unit small, label below. */
function Figure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | null;
  unit: string;
}) {
  // <dt> first in the DOM so the pair reads "Power, 650 hp"; the value is
  // lifted above the label visually.
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1">
      <dt className="truncate text-caption text-ink-400">{label}</dt>
      <dd className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
        {value === null ? (
          <>
            <span
              aria-hidden="true"
              className="font-display text-xl leading-tight text-ink-400"
            >
              —
            </span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          <>
            <span className="font-display text-xl leading-tight font-normal tracking-[-0.01em] text-ink-50 tabular-nums">
              {value}
            </span>
            <span className="text-caption text-ink-400">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

export type CarCardVariant = "default" | "compact";

export type CarCardProps = {
  car: CatalogCardRow;
  /**
   * default: the full card for grids — figures and, when one is recorded,
   * the listed price. compact: a narrower tile for carousels and strips —
   * brand, name and one line of figures.
   */
  variant?: CarCardVariant;
  /** How eagerly to fetch the photograph (the first row of a grid preloads). */
  loading?: PhotoLoading;
  /** `sizes` for the photograph, matching the grid it sits in. */
  sizes?: string;
  /**
   * The current year, for the derived "Discontinued" label. Omit it and only
   * a recorded status is shown.
   */
  currentYear?: number;
  /** Controls layered above the card link (a favourite toggle, say). */
  actions?: ReactNode;
  /**
   * The variant's 3D model, when it has one: hovering the card warms it into
   * the HTTP cache (plain fetches — no WebGL on a listing page).
   */
  model?: { url: string; compression: readonly string[] } | null;
  className?: string;
};

const DEFAULT_SIZES = "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw";
const COMPACT_SIZES = "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 80vw";

/**
 * A car in a grid or a carousel.
 *
 * Image first, on a borderless tile that lifts to the next surface on hover.
 * No 3D and no client JavaScript of its own beyond the photo fallback:
 * listing pages never mount a canvas. The whole card is one link (the
 * title's stretched ::before), with `actions` stacked above it so they stay
 * separately clickable. A missing figure is a dash read out as "Not
 * available"; a price appears only when one is recorded — its absence is
 * stated on the car's own page, not repeated on every card.
 */
export function CarCard({
  car,
  variant = "default",
  loading = "lazy",
  sizes,
  currentYear,
  actions,
  model,
  className,
}: CarCardProps) {
  const compact = variant === "compact";
  const name = modelVariantName(car.model_name, car.variant_name);
  const spoken = [car.manufacturer_name, car.model_name, car.variant_name]
    .filter(Boolean)
    .join(" ");
  const lifecycle = lifecycleOf(car.status, car.year_end, currentYear);
  // "On sale" is the default state of a catalogue car, not news.
  const lifecycleNote = lifecycle && car.status !== "available" ? lifecycle : null;
  const years =
    car.year_start !== null ? formatYearSpan(car.year_start, car.year_end) : null;
  const meta = [
    years,
    car.body_type ? BODY_LABELS[car.body_type] : null,
    car.country_name,
  ]
    .filter(Boolean)
    .join(" · ");

  const media = (
    <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
      <div
        className={cn(
          "absolute inset-0",
          "motion-safe:transition-transform motion-safe:duration-(--duration-normal) motion-safe:ease-standard",
          "motion-safe:group-focus-within/card:scale-[1.03] motion-safe:group-hover/card:scale-[1.03]",
        )}
      >
        {car.primary_image_url ? (
          <CarPhoto
            src={car.primary_image_url}
            alt={spoken}
            sizes={sizes ?? (compact ? COMPACT_SIZES : DEFAULT_SIZES)}
            loading={loading}
            fallback={
              <Silhouette
                bodyType={car.body_type}
                fuelType={car.fuel_type}
                label={!compact}
              />
            }
          />
        ) : (
          <Silhouette
            bodyType={car.body_type}
            fuelType={car.fuel_type}
            label={!compact}
          />
        )}
      </div>

      {car.fuel_type ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20">
          <Badge
            tone={fuelTone(car.fuel_type)}
            className="border-transparent bg-void/70 backdrop-blur-md"
          >
            {FUEL_LABELS[car.fuel_type]}
          </Badge>
        </div>
      ) : null}

      {actions ? (
        <div
          className={cn(
            "absolute top-2 right-2 z-30",
            // Always visible on touch; on a mouse it appears with the card's
            // hover or focus — and stays while the car is saved.
            "transition-opacity duration-(--duration-fast) ease-standard",
            "pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100",
            "pointer-fine:group-focus-within/card:opacity-100",
            "pointer-fine:has-[[data-saved]]:opacity-100",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );

  const link = (
    <Link
      href={carHref(car)}
      data-card-link=""
      className={cn(
        "outline-none before:absolute before:inset-0 before:z-10 before:rounded-card",
        "focus-visible:before:ring-2 focus-visible:before:ring-gold-500 focus-visible:before:ring-inset",
      )}
    >
      <span className="sr-only">{car.manufacturer_name} </span>
      {name}
      {/* The full variant name, when the visible one shortened it. */}
      {name !== [car.model_name, car.variant_name].filter(Boolean).join(" ") ? (
        <span className="sr-only"> ({spoken})</span>
      ) : null}
    </Link>
  );

  const card = compact ? (
    <article
      className={cn(
        "group/card relative isolate flex h-full flex-col overflow-hidden rounded-card bg-surface-1",
        "transition-colors duration-(--duration-base) ease-standard focus-within:bg-surface-2 hover:bg-surface-2",
        className,
      )}
    >
      {media}
      <div className="flex flex-1 flex-col px-4 pt-3.5 pb-4">
        <p className="truncate text-caption text-ink-400">{car.manufacturer_name}</p>
        <h3 className="mt-0.5 truncate font-display text-base leading-snug font-medium text-ink-50">
          {link}
        </h3>
        <p className="mt-1 truncate text-caption text-ink-400">
          {[
            car.power_hp !== null ? `${formatNumber(car.power_hp)} hp` : null,
            car.zero_to_100_s !== null ? `0–100 ${car.zero_to_100_s.toFixed(1)} s` : null,
            car.power_hp === null && car.zero_to_100_s === null ? years : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </article>
  ) : (
    <article
      className={cn(
        "group/card relative isolate flex h-full flex-col overflow-hidden rounded-card bg-surface-1",
        "transition-colors duration-(--duration-base) ease-standard focus-within:bg-surface-2 hover:bg-surface-2",
        className,
      )}
    >
      {media}

      <div className="flex flex-1 flex-col p-5">
        <p className="truncate text-body-s text-ink-400">{car.manufacturer_name}</p>
        <h3 className="mt-0.5 text-h4">{link}</h3>
        {meta || lifecycleNote ? (
          <p className="mt-1 text-body-s text-ink-400">
            {meta}
            {lifecycleNote ? (
              <span className="text-ink-300">
                {meta ? " · " : ""}
                {lifecycleNote.label}
                {lifecycleNote.derived ? (
                  <span className="sr-only"> ({lifecycleNote.detail})</span>
                ) : null}
              </span>
            ) : null}
          </p>
        ) : null}

        {/* Pushes the figures down so a row of cards lines them up. */}
        <div aria-hidden="true" className="min-h-5 flex-1" />

        <dl className="grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          <Figure
            label="Power"
            value={car.power_hp !== null ? formatNumber(car.power_hp) : null}
            unit="hp"
          />
          <Figure
            label="0–100 km/h"
            value={car.zero_to_100_s !== null ? car.zero_to_100_s.toFixed(1) : null}
            unit="s"
          />
          <Figure
            label="Top speed"
            value={car.top_speed_kmh !== null ? formatNumber(car.top_speed_kmh) : null}
            unit="km/h"
          />
        </dl>

        <ListedPrice price={car} placeholder={null} className="mt-5" />
      </div>
    </article>
  );

  return model ? (
    <ModelPreload url={model.url} compression={model.compression} className="h-full">
      {card}
    </ModelPreload>
  ) : (
    card
  );
}
