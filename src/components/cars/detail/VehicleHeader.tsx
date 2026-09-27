import Link from "next/link";
import { type CSSProperties, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { InfoHint } from "@/components/ui/Tooltip";
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
 * The car page's opening screen.
 *
 * Desktop: the name, meta line, powertrain badge, lead, price and actions in a
 * 5/12 column beside the 3D stage (7/12), and the key-figure row across the
 * full width below. Phones: the name first, then the stage, the key figures,
 * the price and the actions.
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
 * Everything shown is recorded data. Key figures are static — the published
 * value from the first frame, never animated through other numbers. A missing
 * figure prints "—" (read as "Not available"). A listed price is shown in full
 * with its type, market and verification; an unverified figure says so and
 * points to the Price section, which explains it.
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

  return (
    <div id="car-hero" className={cn("pt-6 pb-16 lg:pt-8 lg:pb-24", className)}>
      {breadcrumbs}

      <div className="mt-8 flex flex-col gap-10 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-x-12 lg:gap-y-10 xl:gap-x-16">
        {/* ------------------------------------------------------- Name */}
        <header className="@container min-w-0 lg:col-span-5 lg:row-start-1">
          <h1>
            <span className="block text-lead text-ink-300">{manufacturer.name}</span>
            <span
              className="mt-3 block text-display-xl"
              style={nameplateSize(model.name)}
            >
              {model.name}
            </span>
            {variantLine ? (
              <span
                className="mt-2 block text-display-l text-ink-300"
                style={nameplateSize(variantLine, 4.5)}
              >
                {variantLine}
              </span>
            ) : null}
          </h1>

          {meta.length > 0 || lifecycle ? (
            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-body-s text-ink-400">
              {meta.map((part, index) => (
                // The separator trails its part, so a wrapped line never
                // starts with a dot.
                <span key={part} className="inline-flex items-center gap-2">
                  {part}
                  {index < meta.length - 1 || lifecycle ? <Dot /> : null}
                </span>
              ))}
              {lifecycle ? (
                <span className="inline-flex items-center gap-2">
                  <span>{lifecycle.label}</span>
                  <InfoHint
                    label={`About the status: ${lifecycle.label}`}
                    className="-ml-1"
                  >
                    {lifecycle.derived
                      ? `Derived from the recorded production years: ${lowerFirst(lifecycle.detail)}.`
                      : "Lifecycle status as recorded in the catalogue."}
                  </InfoHint>
                </span>
              ) : null}
            </p>
          ) : null}

          {variant.fuel_type ? (
            <Badge tone={fuelTone(variant.fuel_type)} className="mt-5">
              {formatEnumLabel(variant.fuel_type)}
            </Badge>
          ) : null}

          {variant.description ? (
            <p className="mt-6 max-w-[52ch] text-lead">{variant.description}</p>
          ) : null}
        </header>

        {/* -------------------------------------------------- 3D stage */}
        <div className="order-2 min-w-0 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          {stage}
        </div>

        {/* ------------------------------------------ Key figures (full row) */}
        <StatRow
          aria-label="Key figures"
          className="order-3 border-t border-line pt-6 lg:order-none lg:col-span-12 lg:row-start-3 lg:grid-cols-4 lg:pt-10"
        >
          {figures.map((figure) => (
            <StatCard
              key={figure.id}
              label={figure.label}
              value={figure.value}
              unit={figure.unit}
            />
          ))}
        </StatRow>

        {/* --------------------------------------------- Price + actions */}
        <div className="order-4 min-w-0 lg:order-none lg:col-span-5 lg:row-start-2 lg:self-end">
          {price ? <HeroPrice price={price} /> : null}

          <div className={cn("flex flex-wrap items-center gap-3", price && "mt-8")}>
            <ButtonLink href={compareHref(detail)} className="max-sm:flex-1">
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

function Dot() {
  return (
    <span aria-hidden="true" className="text-ink-500">
      ·
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
 * detail page never abbreviates to "$161.1K"), and in white, not gold.
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
        <span className="text-body-s text-ink-300">{label}</span>
        <span className="text-figure text-ink-100">
          {formatPrice(price.listed_price, price.listed_price_currency)}
        </span>
      </p>
      <p className="mt-1.5 text-caption">
        {verified ? `Verified ${verified}` : "Unverified"}
        {" · "}
        {market ?? "market not recorded"}
        {" · "}
        <Link
          href="#pricing"
          className="text-ink-200 underline decoration-line-strong underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink-50 hover:decoration-ink-400"
        >
          see Price
        </Link>
      </p>
    </div>
  );
}
