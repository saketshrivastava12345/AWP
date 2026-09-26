import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { formatEnumLabel, formatNumber, formatPrice, NOT_AVAILABLE } from "@/lib/format";
import { powertrainKind, type CatalogCar } from "@/types/domain";
import { CarPhoto } from "./CarPhoto";
import { carSilhouette } from "./car-silhouette";

export function carHref(car: CatalogCar): string {
  return `/cars/${car.manufacturer_slug}/${car.model_slug}/${car.variant_slug}`;
}

/** One stat in the card's footer strip. */
function CardStat({ label, value }: { label: string; value: string }) {
  const unavailable = value === NOT_AVAILABLE;
  return (
    <div className="min-w-0">
      <dt className="text-label text-[8px]">{label}</dt>
      <dd
        className={cn(
          "tabular mt-1.5 truncate font-mono text-xs",
          unavailable ? "text-ink-600" : "text-ink-100",
        )}
      >
        {unavailable ? "—" : value}
      </dd>
    </div>
  );
}

/**
 * Placeholder for a car without a usable photograph: a side elevation of its
 * body style, drawn from the same profiles as the 3D model. It says what it
 * is — a body-style drawing — rather than posing as the car.
 */
function NoPhotograph({ car }: { car: CatalogCar }) {
  const shape = carSilhouette(car.body_type, powertrainKind(car.fuel_type));
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-surface-2/40 to-surface-1/80">
      <svg
        viewBox={shape.viewBox}
        className="w-[62%] max-w-72 overflow-visible"
        aria-hidden="true"
        fill="none"
      >
        <path
          d={shape.body}
          className="fill-surface-3 stroke-ink-600"
          strokeWidth={2.5}
        />
        {shape.glass ? <path d={shape.glass} className="fill-void/70" /> : null}
        {shape.wheels.map((wheel) => (
          <g key={wheel.cx}>
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r}
              className="fill-void stroke-ink-600"
              strokeWidth={2.5}
            />
            <circle
              cx={wheel.cx}
              cy={wheel.cy}
              r={wheel.r * 0.62}
              className="stroke-gold-700"
              strokeWidth={2}
            />
          </g>
        ))}
      </svg>
      <span className="font-display text-[9px] tracking-[0.18em] text-ink-500 uppercase">
        No photograph yet
      </span>
    </div>
  );
}

/**
 * A car in the collection grid.
 *
 * Deliberately has no 3D: the grid never mounts a canvas. It shows the primary
 * image registered in `car_media`, and a drawing of the body style when there
 * is none — or when the registered file turns out not to load.
 */
export function CarCard({
  car,
  priority = false,
}: {
  car: CatalogCar;
  priority?: boolean;
}) {
  const title = [car.manufacturer_name, car.model_name].filter(Boolean).join(" ");

  return (
    <article className="group relative flex flex-col border border-line bg-surface-1/50 transition-colors duration-300 ease-[var(--ease-cinematic)] hover:border-line-strong">
      {/* Image / placeholder */}
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2/60">
        {car.primary_image_url ? (
          <CarPhoto
            src={car.primary_image_url}
            alt={`${title} ${car.variant_name ?? ""}`.trim()}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="transition-transform duration-700 ease-[var(--ease-cinematic)] group-hover:scale-[1.04]"
            fallback={<NoPhotograph car={car} />}
          />
        ) : (
          <NoPhotograph car={car} />
        )}

        {/* Keeps the badges legible over a bright photograph. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-void/85 via-void/40 to-transparent"
        />

        {/* Light sweep on hover. Purely decorative, and the reduced-motion
            backstop neutralises the transition. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-1000 ease-[var(--ease-cinematic)] group-hover:translate-x-full"
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {car.fuel_type ? (
            <Badge tone={fuelTone(car.fuel_type)}>{formatEnumLabel(car.fuel_type)}</Badge>
          ) : null}
          {car.has_glb ? <Badge tone="gold">3D</Badge> : null}
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-label">{car.manufacturer_name}</p>
          <span
            className="shrink-0 text-sm leading-none"
            title={car.country_name ?? undefined}
            aria-label={car.country_name ?? undefined}
          >
            {car.country_flag_emoji}
          </span>
        </div>

        <h3 className="mt-2.5 font-display text-sm leading-snug tracking-[0.04em] text-ink-50">
          <Link href={carHref(car)} className="before:absolute before:inset-0">
            {car.model_name}
          </Link>
        </h3>
        <p className="mt-1 truncate text-xs text-ink-400">{car.variant_name}</p>

        <p className="mt-3 text-[11px] text-ink-500">
          {[
            formatEnumLabel(car.body_type, ""),
            car.category_name,
            formatEnumLabel(car.drive_type, ""),
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>

        {/* Stats */}
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line-subtle pt-4">
          <CardStat label="Power" value={formatNumber(car.power_hp)} />
          <CardStat label="Top Speed" value={formatNumber(car.top_speed_kmh)} />
          <CardStat
            label="0–100"
            value={
              car.zero_to_100_s === null ? NOT_AVAILABLE : car.zero_to_100_s.toFixed(1)
            }
          />
        </dl>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line-subtle pt-4">
          <div className="min-w-0">
            <p className="text-label text-[8px]">From</p>
            <p
              className={cn(
                "tabular mt-1.5 truncate font-mono text-xs",
                car.base_price === null ? "text-ink-600" : "text-gold-300",
              )}
            >
              {formatPrice(car.base_price, car.price_currency, "—")}
            </p>
          </div>
          <span className="shrink-0 font-display text-[9px] tracking-[0.18em] text-ink-400 uppercase transition-colors group-hover:text-gold-300">
            Explore →
          </span>
        </div>
      </div>
    </article>
  );
}
