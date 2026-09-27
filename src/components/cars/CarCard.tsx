import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { CountUp } from "@/components/fx/CountUp";
import { formatNumber, formatYearSpan, modelVariantName } from "@/lib/format";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { CarPhoto, type PhotoLoading } from "./CarPhoto";
import { ListedPrice } from "./ListedPrice";
import { Silhouette } from "./catalogue/Silhouette";
import { lifecycleOf } from "./catalogue/lifecycle";
import { ModelPreload } from "./catalogue/ModelPreload";
import { HudCardShell, HudMediaOverlay } from "./catalogue/HudCardShell";

export function carHref(
  car: Pick<CatalogCardRow, "manufacturer_slug" | "model_slug" | "variant_slug">,
): string {
  return `/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;
}

/**
 * One telemetry figure of the card's row: a lit tick, the value in glowing
 * Michroma counting up into place, the unit in cyan mono, the label below.
 */
function Figure({
  label,
  value,
  unit,
  countUp,
}: {
  label: string;
  value: string | null;
  unit: string;
  countUp: boolean;
}) {
  // <dt> first in the DOM so the pair reads "Power, 650 hp"; the value is
  // lifted above the label visually.
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col-reverse gap-1.5",
        "before:order-last before:mb-0.5 before:block before:h-px before:w-4 before:content-['']",
        value === null
          ? "before:bg-ink-600"
          : "before:bg-cyan-400 before:shadow-[0_0_6px_var(--color-cyan-400)]",
      )}
    >
      <dt className="truncate font-mono text-[10px] leading-snug tracking-hud text-ink-400 uppercase">
        {label}
      </dt>
      <dd className="flex min-w-0 items-baseline gap-1 whitespace-nowrap">
        {value === null ? (
          <>
            <span
              aria-hidden="true"
              className="font-hud text-lg leading-tight text-ink-500"
            >
              —
            </span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          <>
            <span className="font-hud text-[17px] leading-tight text-ink-50 tabular-nums glow-text">
              {countUp ? <CountUp value={value} /> : value}
            </span>
            <span className="font-mono text-[10px] tracking-hud text-cyan-200 uppercase">
              {unit}
            </span>
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
  /**
   * Count the figures up into place when the card scrolls into view
   * (default). Turn it off for cards streamed inside a Suspense boundary on
   * first load (/cars): the FX runtime would write digits into the server
   * HTML before React hydrates that boundary, and hydration would fail.
   */
  countUp?: boolean;
  className?: string;
};

const DEFAULT_SIZES = "(min-width: 1280px) 400px, (min-width: 768px) 50vw, 100vw";
const COMPACT_SIZES = "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 80vw";

/**
 * A car in a grid or a carousel, as a HUD card.
 *
 * A chamfered plate with a luminous edge and corner brackets (HudCardShell),
 * tilting toward the pointer with a spotlight; the photograph sits under
 * faint scan lines and a beam sweeps it on hover; the three figures glow
 * and count up into place. No 3D and no client JavaScript of its own beyond
 * the photo fallback: listing pages never mount a canvas. The whole card is
 * one link (the title's stretched ::before), with `actions` stacked above it
 * so they stay separately clickable. A missing figure is a dash read out as
 * "Not available"; a price appears only when one is recorded — its absence
 * is stated on the car's own page, not repeated on every card.
 *
 * Props are unchanged from the previous card: the home page, favourites and
 * compare render it as before.
 */
export function CarCard({
  car,
  variant = "default",
  loading = "lazy",
  sizes,
  currentYear,
  actions,
  model,
  countUp = true,
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
          "motion-safe:transition-transform motion-safe:duration-(--duration-slow) motion-safe:ease-standard",
          "motion-safe:group-focus-within/card:scale-[1.04] motion-safe:group-hover/card:scale-[1.04]",
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
      <HudMediaOverlay />

      {car.fuel_type ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20">
          <Badge
            tone={fuelTone(car.fuel_type)}
            className="border-line-strong/60 bg-void/70 backdrop-blur-md"
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
      className="outline-none before:absolute before:inset-0 before:z-10 before:content-['']"
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
    <HudCardShell className={className}>
      {media}
      <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
        <p className="truncate font-mono text-[10px] tracking-hud text-cyan-200/80 uppercase">
          {car.manufacturer_name}
        </p>
        <h3 className="mt-1 truncate font-display text-base leading-snug font-medium text-ink-50 transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
          {link}
        </h3>
        <p className="mt-1 truncate font-mono text-[11px] text-ink-400">
          {[
            car.power_hp !== null ? `${formatNumber(car.power_hp)} hp` : null,
            car.zero_to_100_s !== null ? `0–100 ${car.zero_to_100_s.toFixed(1)} s` : null,
            car.power_hp === null && car.zero_to_100_s === null ? years : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
    </HudCardShell>
  ) : (
    <HudCardShell className={className}>
      {media}

      <div className="flex flex-1 flex-col p-5">
        <p className="truncate font-mono text-[11px] tracking-hud text-cyan-200/80 uppercase">
          {car.manufacturer_name}
        </p>
        <h3 className="mt-1 text-h4 transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
          {link}
        </h3>
        {meta || lifecycleNote ? (
          <p className="mt-1.5 text-body-s text-ink-400">
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
        <div aria-hidden="true" className="min-h-4 flex-1" />

        <dl className="relative mt-4 grid grid-cols-3 gap-3 pt-4 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,oklch(0.83_0.13_210/55%),oklch(0.83_0.13_210/12%)_40%,transparent)] before:content-['']">
          <Figure
            label="Power"
            value={car.power_hp !== null ? formatNumber(car.power_hp) : null}
            unit="hp"
            countUp={countUp}
          />
          <Figure
            label="0–100 km/h"
            value={car.zero_to_100_s !== null ? car.zero_to_100_s.toFixed(1) : null}
            unit="s"
            countUp={countUp}
          />
          <Figure
            label="Top speed"
            value={car.top_speed_kmh !== null ? formatNumber(car.top_speed_kmh) : null}
            unit="km/h"
            countUp={countUp}
          />
        </dl>

        <ListedPrice price={car} placeholder={null} className="mt-5" />
      </div>
    </HudCardShell>
  );

  return model ? (
    <ModelPreload url={model.url} compression={model.compression} className="h-full">
      {card}
    </ModelPreload>
  ) : (
    card
  );
}
