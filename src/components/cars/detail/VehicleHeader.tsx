import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { InfoHint } from "@/components/ui/Tooltip";
import { CountUp } from "@/components/fx/CountUp";
import { ScrambleText } from "@/components/fx/ScrambleText";
import {
  listedPriceTypeLabel,
  type ListedPriceData,
} from "@/components/cars/ListedPrice";
import {
  carDisplayName,
  distinctVariantName,
  formatDate,
  formatEnumLabel,
  formatPrice,
} from "@/lib/format";
import { compareHref, generationName, keyFigures } from "@/lib/detail/vehicle";
import { lifecycleOf } from "@/components/cars/catalogue/lifecycle";
import { catalogueYear } from "@/components/cars/catalogue/catalogue-year";
import type { DriveType, VariantDetail } from "@/types/domain";
import { ShareButton } from "./ShareButton";

/**
 * The car page's opening screen — the cockpit.
 *
 * Desktop: the name, meta line, powertrain badge, lead, price and actions in a
 * 5/12 column beside the 3D stage (7/12), and the telemetry row of key
 * figures across the full width below. Phones: the name first, then the
 * stage, the key figures, the price and the actions.
 *
 * The stage sits in a HUD frame: corner brackets, tiny mono read-outs and a
 * slow scan line, all decorative (aria-hidden) and all outside the viewer's
 * own element, so its fullscreen mode (a fixed root) is unaffected — nothing
 * here puts a transform or filter on an ancestor of it.
 *
 * Props:
 *   detail       the variant (getVariantDetail)
 *   shareUrl     canonical URL of this page, for the Share action
 *   price        the catalogue's listed price for the variant, or null
 *   save         slot: the favourite button island
 *   stage        slot: the 3D viewer
 *   breadcrumbs  slot: the breadcrumb trail above the name
 *   currentYear  override for the status derivation; defaults to the cached
 *                catalogueYear() the car cards use, so both agree
 *
 * Everything shown is recorded data. Key figures count up to the published
 * value on first view, but the server HTML and the resting state are the
 * exact published figure (see fx/CountUp). A missing figure prints "—" (read
 * as "Not available"). A listed price is shown in full with its type, market
 * and verification; an unverified figure says so and points to the Price
 * section, which explains it.
 */
export async function VehicleHeader({
  detail,
  shareUrl,
  price,
  save,
  stage,
  breadcrumbs,
  currentYear,
  className,
}: {
  detail: VariantDetail;
  shareUrl: string;
  price: ListedPriceData | null;
  save?: ReactNode;
  stage: ReactNode;
  breadcrumbs?: ReactNode;
  currentYear?: number;
  className?: string;
}) {
  const { manufacturer, model, variant } = detail;
  const year = currentYear ?? (await catalogueYear());
  const lifecycle = lifecycleOf(variant.status, variant.year_end, year);
  const variantLine = distinctVariantName(model.name, variant.name);
  const fullName = carDisplayName(manufacturer.name, model.name, variant.name);
  const figures = keyFigures(detail.performance);
  const meta = metaLine(detail);
  const published = figures.filter((figure) => figure.value !== null).length;

  return (
    <div id="car-hero" className={cn("pt-6 pb-16 lg:pt-8 lg:pb-24", className)}>
      {breadcrumbs}

      <div className="mt-8 flex flex-col gap-10 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 xl:gap-x-16">
        {/* ------------------------------------------------------- Name */}
        <header className="@container min-w-0 lg:col-span-5 lg:row-start-1">
          <p aria-hidden="true" className="flex items-center gap-3 hud-label">
            <span className="inline-block size-1.5 animate-pulse-glow rounded-full bg-cyan-400" />
            Vehicle // {detail.country.name}
          </p>
          <h1 className="mt-4">
            <span className="block font-mono text-sm tracking-hud text-cyan-200 uppercase">
              {manufacturer.name}
            </span>
            <span
              className="mt-3 block gradient-text text-display-xl"
              style={nameplateSize(model.name)}
            >
              <ScrambleText text={model.name} />
            </span>
            {variantLine ? (
              <span
                className="mt-2 block text-display-l text-ink-300"
                style={nameplateSize(variantLine, 4.5)}
              >
                <ScrambleText text={variantLine} />
              </span>
            ) : null}
          </h1>

          {meta.length > 0 || lifecycle ? (
            <p className="mt-6 flex flex-wrap items-center gap-2">
              {meta.map((part) => (
                <MetaChip key={part}>{part}</MetaChip>
              ))}
              {lifecycle ? (
                <MetaChip>
                  <span>{lifecycle.label}</span>
                  <InfoHint
                    label={`About the status: ${lifecycle.label}`}
                    className="-my-1 -mr-1"
                  >
                    {lifecycle.derived
                      ? `Derived from the recorded production years: ${lowerFirst(lifecycle.detail)}.`
                      : "Lifecycle status as recorded in the catalogue."}
                  </InfoHint>
                </MetaChip>
              ) : null}
            </p>
          ) : null}

          {variant.fuel_type ? (
            <Badge tone={fuelTone(variant.fuel_type)} className="mt-5">
              {formatEnumLabel(variant.fuel_type)}
            </Badge>
          ) : null}

          {variant.description ? (
            <p className="mt-6 max-w-[52ch] animate-rise-in text-lead [animation-delay:200ms]">
              {variant.description}
            </p>
          ) : null}
        </header>

        {/* -------------------------------------------------- 3D stage */}
        <div className="order-2 min-w-0 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <div className="relative">
            {/* HUD frame: brackets, read-outs and a scan line, all decoration. */}
            <span
              aria-hidden="true"
              className="hud-brackets pointer-events-none absolute -inset-2 z-10 [--hud-c:var(--color-cyan-300)] [--hud-l:22px]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 left-8 z-10 -translate-y-1/2 bg-void px-1.5 hud-label leading-[10px]"
            >
              SYS.3D // Viewer
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-2 right-8 z-10 flex -translate-y-1/2 items-center gap-2 bg-void px-1.5 hud-label leading-[10px]"
            >
              <span className="inline-block size-1.5 animate-pulse-glow rounded-full bg-cyan-400" />
              Live
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-2 left-8 z-10 translate-y-1/2 bg-void px-1.5 hud-label leading-[10px]"
            >
              Telemetry {published} / {figures.length}
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-8 -bottom-2 z-10 translate-y-1/2 bg-void px-1.5 hud-label leading-[10px] text-ink-600"
            >
              {variant.fuel_type ? formatEnumLabel(variant.fuel_type) : "Powertrain —"}
              {" // "}
              {formatEnumLabel(model.body_type, "") || "Body —"}
            </span>
            {/* The scan line sweeps the stage; the viewer's own overlays sit
                above it because this layer stays below the stage (z-0). */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
            >
              <span className="absolute inset-x-0 top-0 h-24 animate-scan-beam bg-gradient-to-b from-cyan-400/0 via-cyan-300/10 to-cyan-400/0" />
            </span>
            <div className="relative">{stage}</div>
          </div>
        </div>

        {/* ------------------------------------------ Key figures (full row) */}
        <div className="order-3 lg:order-none lg:col-span-12 lg:row-start-3">
          <div className="flex items-center gap-4 border-t border-line pt-5 lg:pt-8">
            <span aria-hidden="true" className="hud-label">
              Data // Key figures
            </span>
            <span aria-hidden="true" className="hud-rule h-px flex-1" />
          </div>
          <StatRow aria-label="Key figures" className="pt-3 lg:grid-cols-4 lg:pt-5">
            {figures.map((figure) => (
              <StatCard
                key={figure.id}
                label={figure.label}
                value={figure.value}
                unit={figure.unit}
                countUp
              />
            ))}
          </StatRow>
        </div>

        {/* --------------------------------------------- Price + actions */}
        <div className="order-4 min-w-0 lg:order-none lg:col-span-5 lg:row-start-2 lg:self-end">
          {price ? <HeroPrice price={price} /> : null}

          <div className={cn("flex flex-wrap items-center gap-3", price && "mt-8")}>
            <ButtonLink href={compareHref(detail)} magnetic className="max-sm:flex-1">
              Compare
            </ButtonLink>
            {save ? <div className="flex max-sm:flex-1 [&>*]:w-full">{save}</div> : null}
            <ShareButton url={shareUrl} title={fullName} />
          </div>

          <a
            href="#explore-3d"
            className={buttonClasses("link", "sm", "mt-4 gap-1.5 text-ink-200")}
          >
            Explore in 3D
            <ArrowDown className="text-ink-400 lg:hidden" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

/** One part of the meta line, as a mono HUD chip. */
function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 border border-line px-2.5 font-mono text-[11px] tracking-hud text-ink-200 uppercase chamfer-sm">
      {children}
    </span>
  );
}

function lowerFirst(text: string): string {
  return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

/**
 * Size the nameplate so its longest word always fits the column: the display
 * size where there is room, scaled down by the container's width for long
 * single words ("Revuelto", "Megane"), never broken inside a word.
 */
function nameplateSize(text: string, maxRem = 7): CSSProperties {
  const longest = Math.max(4, ...text.split(/\s+/).map((word) => word.length));
  const fit = Math.floor(100 / (0.62 * longest));
  return {
    fontSize: `max(2.25rem, min(${fit}cqi, clamp(2.5rem, 8vw, ${maxRem}rem)))`,
  };
}

const DRIVE_LABELS: Record<DriveType, string> = {
  fwd: "Front-wheel drive",
  rwd: "Rear-wheel drive",
  awd: "All-wheel drive",
  "4wd": "Four-wheel drive",
};

/**
 * "992 · 2021–present · Coupe · Rear-wheel drive". Parts that are not
 * recorded are left out.
 */
function metaLine(detail: VariantDetail): string[] {
  const { variant, model } = detail;
  const years = variant.year_start
    ? `${variant.year_start}–${variant.year_end ?? "present"}`
    : null;
  return [
    generationName(detail),
    years,
    formatEnumLabel(model.body_type, "") || null,
    variant.drive_type ? DRIVE_LABELS[variant.drive_type] : null,
  ].filter((part): part is string => Boolean(part));
}

function hasAmount(price: ListedPriceData): boolean {
  const amount =
    typeof price.listed_price === "string"
      ? Number(price.listed_price)
      : price.listed_price;
  return (
    amount !== null && Number.isFinite(amount) && Boolean(price.listed_price_currency)
  );
}

/**
 * "Base price $161,100" with, beneath it, what kind of figure that is:
 * "Unverified · market not recorded · see Price". Always the full figure (the
 * detail page never abbreviates to "$161.1K"). The figure counts up on first
 * view; the server HTML and the resting state are the exact recorded price.
 */
function HeroPrice({ price }: { price: ListedPriceData }) {
  if (!hasAmount(price)) return null;
  const label = listedPriceTypeLabel(price.listed_price_type, true) ?? "Price";
  const market = price.listed_price_market?.trim() || null;
  const verified = price.listed_price_verified_at
    ? formatDate(price.listed_price_verified_at, "")
    : "";

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[11px] tracking-hud text-ink-400 uppercase">
          {label}
        </span>
        <span className="text-figure text-ink-50 glow-text">
          <CountUp value={formatPrice(price.listed_price, price.listed_price_currency)} />
        </span>
      </p>
      <p className="mt-1.5 text-caption">
        {verified ? `Verified ${verified}` : "Unverified"}
        {" · "}
        {market ?? "market not recorded"}
        {" · "}
        <Link href="#pricing" className="fx-link text-cyan-200">
          see Price
        </Link>
      </p>
    </div>
  );
}
