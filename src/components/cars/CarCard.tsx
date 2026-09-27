import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { formatNumber, formatYearRange } from "@/lib/format";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import { powertrainKind, type Aspiration } from "@/types/domain";
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

const ASPIRATION_PREFIX: Record<Aspiration, string> = {
  naturally_aspirated: "",
  turbocharged: "Turbo",
  twin_turbo: "Twin-turbo",
  supercharged: "Supercharged",
  twincharged: "Twincharged",
};

const MOTOR_WORDS: Record<number, string> = {
  1: "Single motor",
  2: "Dual motor",
  3: "Tri-motor",
  4: "Quad motor",
};

/** "Twin-turbo V8", "Dual motor", "V6 + single motor" — from recorded columns only. */
function powertrainSummary(car: CatalogCardRow): string | null {
  const kind = powertrainKind(car.fuel_type);
  const motors = car.motor_count
    ? (MOTOR_WORDS[car.motor_count] ?? `${car.motor_count} motors`)
    : null;
  if (kind === "electric") return motors;

  const engine = car.engine_configuration
    ? [car.aspiration ? ASPIRATION_PREFIX[car.aspiration] : "", car.engine_configuration]
        .filter(Boolean)
        .join(" ")
    : null;
  if (kind === "hybrid") {
    if (engine && motors) return `${engine} + ${motors.toLowerCase()}`;
    if (engine) return `${engine} hybrid`;
    return motors;
  }
  return engine;
}

/** One headline figure. Missing values show a dash, announced as "not available". */
function KeyFigure({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | null;
  unit: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label text-nano tracking-[0.12em] whitespace-nowrap">
        {label}
      </dt>
      <dd className="mt-1.5 flex items-baseline gap-1 truncate">
        {value === null ? (
          <>
            <span aria-hidden="true" className="font-mono text-sm text-ink-600">
              —
            </span>
            <span className="sr-only">Not available</span>
          </>
        ) : (
          <>
            <span className="tabular font-mono text-sm text-ink-50">{value}</span>
            <span className="font-mono text-[10px] text-ink-500">{unit}</span>
          </>
        )}
      </dd>
    </div>
  );
}

export type CarCardProps = {
  car: CatalogCardRow;
  /** How eagerly to fetch the photograph (the first row of a grid preloads). */
  loading?: PhotoLoading;
  /** `sizes` for the photograph, matching the grid it sits in. */
  sizes?: string;
  /**
   * The current year, for the derived "Discontinued" badge. Omit it and only
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

/**
 * A car in a grid.
 *
 * Deliberately has no 3D and no client JavaScript of its own beyond the photo
 * fallback: listing pages never mount a canvas. The whole card is one link
 * (the title's stretched ::before), with `actions` stacked above it so they
 * stay separately clickable. Hover and keyboard focus reveal the same quick
 * figures; on touch screens they are always shown.
 */
export function CarCard({
  car,
  loading = "lazy",
  sizes = "(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw",
  currentYear,
  actions,
  model,
  className,
}: CarCardProps) {
  const title = [car.manufacturer_name, car.model_name].filter(Boolean).join(" ");
  const fullName = [title, car.variant_name].filter(Boolean).join(" ");
  const lifecycle = lifecycleOf(car.status, car.year_end, currentYear);
  const summary = powertrainSummary(car);
  const years =
    car.year_start !== null ? formatYearRange(car.year_start, car.year_end) : null;
  const identity = [car.generation_name, years].filter(Boolean).join(" · ");

  const quick: { label: string; value: string }[] = [];
  if (car.torque_nm !== null)
    quick.push({ label: "Torque", value: `${formatNumber(car.torque_nm)} Nm` });
  if (car.drive_type) quick.push({ label: "Drive", value: car.drive_type.toUpperCase() });
  if (summary) quick.push({ label: "Powertrain", value: summary });
  if (car.range_km !== null)
    quick.push({
      label: "Range",
      // The test cycle travels with the figure: WLTP and ARAI are not alike.
      value: `${formatNumber(car.range_km)} km${car.range_standard ? ` · ${car.range_standard.toUpperCase()}` : ""}`,
    });

  const card = (
    <article
      className={cn(
        "group/card relative isolate flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface-1",
        "transition-[border-color,box-shadow,background-color] duration-(--duration-normal) ease-cinematic",
        "hover:border-gold-700/70 hover:bg-surface-2/40 hover:shadow-[0_28px_60px_-34px_rgb(0_0_0/0.95)]",
        "focus-within:border-gold-600/80",
        className,
      )}
    >
      {/* A thin gold line sweeps across the top edge on hover or focus. It
          fades out quickly so the return trip is never seen. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px overflow-hidden"
      >
        <span
          className={cn(
            "block h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-0",
            "motion-safe:[transition:transform_1s_var(--ease-cinematic),opacity_260ms_ease]",
            "group-hover/card:translate-x-full group-hover/card:opacity-100",
            "group-focus-within/card:translate-x-full group-focus-within/card:opacity-100",
          )}
        />
      </span>

      {/* Photograph, or a drawing of the body style */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        <div
          className={cn(
            "absolute inset-0",
            "motion-safe:transition-transform motion-safe:duration-[900ms] motion-safe:ease-cinematic",
            "motion-safe:group-focus-within/card:scale-[1.04] motion-safe:group-hover/card:scale-[1.04]",
          )}
        >
          {car.primary_image_url ? (
            <CarPhoto
              src={car.primary_image_url}
              alt={fullName}
              sizes={sizes}
              loading={loading}
              fallback={<Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />}
            />
          ) : (
            <Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />
          )}
        </div>

        {/* Keeps the badges legible over a bright photograph. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-void/80 to-transparent"
        />

        <div
          className={cn(
            "absolute top-3 left-3 flex flex-wrap gap-1.5",
            actions ? "max-w-[calc(100%-4.5rem)]" : "right-3",
          )}
        >
          {car.fuel_type ? (
            <Badge tone={fuelTone(car.fuel_type)} className="bg-void/60 backdrop-blur-sm">
              {FUEL_LABELS[car.fuel_type]}
            </Badge>
          ) : null}
          {lifecycle ? (
            <Badge tone={lifecycle.tone} className="bg-void/60 backdrop-blur-sm">
              {lifecycle.label}
              <span className="sr-only">
                {lifecycle.derived ? ` (${lifecycle.detail})` : ""}
              </span>
            </Badge>
          ) : null}
          {car.has_glb ? (
            <Badge tone="gold" className="bg-void/60 backdrop-blur-sm">
              3D
              <span className="sr-only"> model available</span>
            </Badge>
          ) : null}
        </div>

        {actions ? <div className="absolute top-2 right-2 z-30">{actions}</div> : null}

        {/* Quick figures: revealed on hover and keyboard focus, always shown
            where there is no hover (touch). */}
        {quick.length > 0 ? (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10",
              "translate-y-1 opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-(--duration-fast)",
              "group-hover/card:translate-y-0 group-hover/card:opacity-100",
              "group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100",
              "pointer-coarse:translate-y-0 pointer-coarse:opacity-100",
            )}
          >
            <dl className="flex flex-wrap items-end gap-x-4 gap-y-1 bg-gradient-to-t from-void via-void/80 to-transparent px-4 pt-10 pb-3">
              {quick.map((item) => (
                <div key={item.label} className="flex items-baseline gap-1.5">
                  <dt className="sr-only">{item.label}</dt>
                  <dd className="text-hud text-ink-100">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {/* Identity */}
      <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-label">{car.manufacturer_name}</p>
          {car.country_flag_emoji ? (
            <span className="shrink-0 text-sm leading-none">
              <span aria-hidden="true">{car.country_flag_emoji}</span>
              <span className="sr-only">{car.country_name}</span>
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 font-display text-[15px] leading-snug tracking-[0.03em] text-ink-50">
          <Link
            href={carHref(car)}
            data-card-link=""
            className={cn(
              "outline-none before:absolute before:inset-0 before:z-10 before:rounded-md",
              "focus-visible:before:ring-2 focus-visible:before:ring-gold-500 focus-visible:before:ring-inset",
            )}
          >
            <span className="sr-only">{car.manufacturer_name} </span>
            {car.model_name}
            <span className="sr-only"> {car.variant_name}</span>
          </Link>
        </h3>
        <p className="mt-1 truncate text-sm text-ink-300">{car.variant_name}</p>
        <p className="mt-2 truncate text-[11px] text-ink-500">
          {[identity, car.body_type ? BODY_LABELS[car.body_type] : null]
            .filter(Boolean)
            .join(" · ")}
        </p>

        <dl className="mt-5 grid grid-cols-[repeat(3,auto)] justify-between gap-3 border-t border-line-subtle pt-4">
          <KeyFigure
            label="Power"
            value={car.power_hp !== null ? formatNumber(car.power_hp) : null}
            unit="hp"
          />
          <KeyFigure
            label="0–100"
            value={car.zero_to_100_s !== null ? car.zero_to_100_s.toFixed(1) : null}
            unit="s"
          />
          <KeyFigure
            label="Top speed"
            value={car.top_speed_kmh !== null ? formatNumber(car.top_speed_kmh) : null}
            unit="km/h"
          />
        </dl>

        {/* Pushes the price to the bottom so a row of cards lines up. */}
        <div aria-hidden="true" className="min-h-4 flex-1" />

        <div className="flex items-end justify-between gap-3 border-t border-line-subtle pt-4">
          <ListedPrice price={car} />
          <span
            aria-hidden="true"
            className="shrink-0 pb-0.5 font-display text-nano tracking-hud text-ink-500 uppercase transition-colors duration-(--duration-fast) group-focus-within/card:text-gold-300 group-hover/card:text-gold-300"
          >
            View →
          </span>
        </div>
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
