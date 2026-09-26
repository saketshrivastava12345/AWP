import Image from "next/image";
import Link from "next/link";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { formatEnumLabel, formatNumber, formatPrice, NOT_AVAILABLE } from "@/lib/format";
import type { CatalogCar } from "@/types/domain";

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
 * A car in the collection grid.
 *
 * Deliberately has no 3D: the grid never mounts a canvas. It shows the primary
 * image when one is registered in `car_media`, and a typographic placeholder
 * otherwise — which is currently every car, since no real image URLs exist yet.
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
          <Image
            src={car.primary_image_url}
            alt={`${title} ${car.variant_name ?? ""}`.trim()}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-[var(--ease-cinematic)] group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Car className="size-8 text-ink-600" strokeWidth={1} aria-hidden="true" />
            <span className="font-display text-[9px] tracking-[0.18em] text-ink-600 uppercase">
              No photograph
            </span>
          </div>
        )}

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
