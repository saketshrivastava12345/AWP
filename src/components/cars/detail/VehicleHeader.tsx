import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowLeftRight, Box, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { InfoHint } from "@/components/ui/Tooltip";
import {
  carDisplayName,
  distinctVariantName,
  formatEnumLabel,
  NOT_AVAILABLE,
} from "@/lib/format";
import { compareHref, identityLine, keyFigures, vehicleCode } from "@/lib/detail/vehicle";
import { lifecycleOf, type Lifecycle } from "@/components/cars/catalogue/lifecycle";
import { catalogueYear } from "@/components/cars/catalogue/catalogue-year";
import type { VariantDetail } from "@/types/domain";
import { ShareButton } from "./ShareButton";

/**
 * The text column above the fold, beside the 3D stage.
 *
 * Props:
 *   detail       the variant (getVariantDetail)
 *   shareUrl     canonical URL of this page, for the Share action
 *   price        slot: the catalogue's listed price (ListedPrice), or nothing
 *   save         slot: the favourite button island
 *   currentYear  override for the status derivation; defaults to the cached
 *                catalogueYear() the car cards use, so both badges agree
 *   showDescription  print the variant's description under the name (default true)
 *
 * Everything shown is recorded data: the status badge (the same lifecycleOf()
 * rule as the car cards) is the recorded lifecycle, or "Discontinued" only when
 * the recorded final production year is already past; a missing key figure
 * prints "—" (read as "Not available").
 * Actions: Explore 3D (#explore-3d), Compare (/compare?car=…), save slot,
 * Get price (#pricing), Share.
 */
export async function VehicleHeader({
  detail,
  shareUrl,
  price,
  save,
  currentYear,
  showDescription = true,
  className,
}: {
  detail: VariantDetail;
  shareUrl: string;
  price?: ReactNode;
  save?: ReactNode;
  currentYear?: number;
  showDescription?: boolean;
  className?: string;
}) {
  const { manufacturer, model, variant, country } = detail;
  const year = currentYear ?? (await catalogueYear());
  const lifecycle = lifecycleOf(variant.status, variant.year_end, year);
  const variantLine = distinctVariantName(model.name, variant.name);
  const fullName = carDisplayName(manufacturer.name, model.name, variant.name);
  const identity = identityLine(detail);
  const figures = keyFigures(detail.performance);

  return (
    // A size container: the name, figures and actions adapt to the column the
    // page gives the header (beside the 3D stage, or full width), not the viewport.
    <header className={cn("@container relative", className)}>
      {/* ------------------------------------------------ Maker overline */}
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label">
        <Link
          href={`/manufacturers/${manufacturer.slug}`}
          className="text-ink-200 transition-colors duration-(--duration-fast) hover:text-gold-300"
        >
          {manufacturer.name}
        </Link>
        <span aria-hidden="true" className="h-px w-6 bg-line-strong" />
        <Link
          href={`/countries/${country.slug}`}
          className="inline-flex items-center gap-2 transition-colors duration-(--duration-fast) hover:text-gold-300"
        >
          {country.flag_emoji ? (
            <span aria-hidden="true" className="text-sm leading-none tracking-normal">
              {country.flag_emoji}
            </span>
          ) : null}
          {country.name}
        </Link>
      </p>

      {/* ------------------------------------------------------- Name */}
      <h1 className="mt-5">
        <span className="sr-only">{manufacturer.name} </span>
        <span className="block font-display text-[clamp(2.4rem,17cqi,4.75rem)] leading-[0.95] tracking-[0.02em] text-balance break-words text-ink-50">
          {model.name}
        </span>
        {variantLine ? (
          <span className="mt-3 block gold-gradient-text font-display text-[clamp(1.25rem,6.5cqi,1.9rem)] leading-tight tracking-[0.06em] text-balance">
            {variantLine}
          </span>
        ) : null}
      </h1>

      {identity.length > 0 ? (
        <p className="mt-5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs text-ink-400">
          {identity.map((part, index) => (
            <span key={part} className="inline-flex items-center gap-2.5">
              {index > 0 ? (
                <span aria-hidden="true" className="text-ink-600">
                  ·
                </span>
              ) : null}
              {part}
            </span>
          ))}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {lifecycle ? <StatusChip lifecycle={lifecycle} /> : null}
        {variant.fuel_type ? (
          <Badge tone={fuelTone(variant.fuel_type)}>
            {formatEnumLabel(variant.fuel_type)}
          </Badge>
        ) : null}
        {variant.drive_type ? <Badge>{formatEnumLabel(variant.drive_type)}</Badge> : null}
      </div>

      {showDescription && variant.description ? (
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-300 sm:text-[15px]">
          {variant.description}
        </p>
      ) : null}

      {/* ------------------------------------------------ Key figures */}
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xs border border-line bg-line @lg:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.id} className="bg-void/90 px-4 py-4 @lg:px-3.5">
            <dt className="text-hud whitespace-nowrap text-ink-500">{figure.label}</dt>
            <dd className="mt-2.5 flex items-baseline gap-1.5 font-mono tabular-nums">
              {figure.value === null ? (
                <>
                  <span
                    aria-hidden="true"
                    className="text-[1.75rem] leading-none text-ink-600"
                  >
                    —
                  </span>
                  <span className="sr-only">{NOT_AVAILABLE}</span>
                </>
              ) : (
                <>
                  <span className="text-[1.75rem] leading-none text-ink-50">
                    {figure.value}
                  </span>
                  <span className="text-micro text-ink-400 uppercase">{figure.unit}</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {/* ----------------------------------------------------- Price */}
      {price ? <div className="mt-6">{price}</div> : null}

      {/* --------------------------------------------------- Actions */}
      {/* Two columns in a narrow column, three from 24rem: Explore 3D (the
          one filled button) spans two, and every target is 44px tall. */}
      <div className="mt-8 grid grid-cols-2 gap-2 @sm:grid-cols-3">
        <a
          href="#explore-3d"
          className={cn(
            ACTION,
            "col-span-2 bg-gold-500 text-void shadow-[0_1px_0_0_var(--color-gold-300)_inset] hover:bg-gold-400 active:bg-gold-600",
          )}
        >
          <Box className="size-3.5 shrink-0" aria-hidden="true" />
          Explore 3D
        </a>
        <Link href={compareHref(detail)} className={cn(ACTION, SECONDARY)}>
          <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden="true" />
          Compare
        </Link>
        {save ? <div className="flex min-h-11 min-w-0 [&>*]:w-full">{save}</div> : null}
        <a href="#pricing" className={cn(ACTION, SECONDARY)}>
          <Tag className="size-3.5 shrink-0" aria-hidden="true" />
          Get price
        </a>
        <ShareButton url={shareUrl} title={fullName} className="w-full px-3" />
      </div>

      {/* ----------------------------------------------- HUD reference */}
      <p className="mt-8 flex items-center gap-3 text-hud text-ink-600">
        <span aria-hidden="true" className="size-1 bg-gold-600" />
        <span>
          <span className="text-ink-500">AURIX</span> · {vehicleCode(detail)}
        </span>
      </p>
    </header>
  );
}

const ACTION =
  "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xs px-3 font-display text-[11px] " +
  "tracking-button whitespace-nowrap uppercase transition-colors duration-(--duration-fast) ease-cinematic";

const SECONDARY =
  "border border-line-strong text-ink-100 hover:border-gold-500 hover:text-gold-300";

function StatusChip({ lifecycle }: { lifecycle: Lifecycle }) {
  const tone =
    lifecycle.tone === "positive"
      ? "border-signal-positive/40 text-signal-positive"
      : lifecycle.tone === "gold"
        ? "border-gold-700 text-gold-300"
        : "border-line-strong text-ink-300";
  const dot =
    lifecycle.tone === "positive"
      ? "bg-signal-positive"
      : lifecycle.tone === "gold"
        ? "bg-gold-400"
        : "bg-ink-500";
  const hint = lifecycle.derived
    ? `Derived from the recorded production years: ${lifecycle.detail.charAt(0).toLowerCase()}${lifecycle.detail.slice(1)}.`
    : "Lifecycle status as recorded in the catalogue.";

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-xs border px-2 py-1 font-display text-[9px] leading-none tracking-[0.18em] uppercase",
          tone,
        )}
      >
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
        {lifecycle.label}
      </span>
      <InfoHint label={`About the status: ${lifecycle.label}`}>{hint}</InfoHint>
    </span>
  );
}
