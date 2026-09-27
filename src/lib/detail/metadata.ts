import type { VariantDetail } from "@/types/domain";
import { carDisplayName, formatYearRange } from "@/lib/format";
import { formatFigure, formatNatural, toFinite } from "./figures";

/**
 * The car page's title and description, from published figures only.
 *
 * The root layout's template appends the site name, so the page title
 * "Porsche 911 GT3 — Specifications, Performance & Price" is shown as
 * "… | AURIX".
 */

export const TITLE_SUFFIX = "Specifications, Performance & Price";

export function detailTitle(
  detail: Pick<VariantDetail, "manufacturer" | "model" | "variant">,
): string {
  return `${carDisplayName(detail.manufacturer.name, detail.model.name, detail.variant.name)} — ${TITLE_SUFFIX}`;
}

/**
 * "Porsche 911 GT3 (2021–present): 510 hp, 0–100 km/h in 3.4 s, 320 km/h top
 * speed. …". A figure that is not published is left out of the sentence — and
 * with none published the sentence simply names the car.
 */
export function detailDescription(
  detail: Pick<
    VariantDetail,
    "manufacturer" | "model" | "variant" | "performance" | "ev"
  >,
): string {
  const name = carDisplayName(
    detail.manufacturer.name,
    detail.model.name,
    detail.variant.name,
  );
  const p = detail.performance;
  const power = toFinite(p?.power_hp);
  const sprint = toFinite(p?.zero_to_100_s);
  const top = toFinite(p?.top_speed_kmh);
  const range = toFinite(detail.ev?.range_km);
  const standard = detail.ev?.range_standard?.toUpperCase() ?? null;

  const figures = [
    power === null ? null : `${formatFigure(power)} hp`,
    sprint === null ? null : `0–100 km/h in ${formatFigure(sprint, 1)} s`,
    top === null ? null : `${formatFigure(top)} km/h top speed`,
    range === null
      ? null
      : `${formatNatural(range)} km range${standard ? ` (${standard})` : ""}`,
  ].filter((part): part is string => part !== null);

  const years = detail.variant.year_start
    ? ` (${formatYearRange(detail.variant.year_start, detail.variant.year_end)})`
    : "";
  const lead =
    figures.length > 0 ? `${name}${years}: ${figures.join(", ")}.` : `${name}${years}.`;
  return `${lead} Specifications, performance, dimensions, engineering and sourced prices on AURIX.`;
}

/** The page's own path. */
export function detailPath(
  detail: Pick<VariantDetail, "manufacturer" | "model" | "variant">,
): string {
  return `/cars/${detail.manufacturer.slug}/${detail.model.slug}/${detail.variant.slug}`;
}

/** An absolute URL for a site-relative path or an absolute one. */
export function absoluteUrl(url: string, base: string): string {
  try {
    return new URL(url, base.endsWith("/") ? base : `${base}/`).toString();
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------

export type ChapterId =
  | "the-machine"
  | "performance"
  | "engineering"
  | "technology"
  | "design"
  | "pricing"
  | "explore";

export type ChapterPlan = { id: ChapterId; number: string; label: string };

const CHAPTER_LABELS: Record<ChapterId, string> = {
  "the-machine": "The Machine",
  performance: "Performance",
  engineering: "Engineering",
  technology: "Technology",
  design: "Design",
  pricing: "Pricing",
  explore: "Explore",
};

const CHAPTER_ORDER: readonly ChapterId[] = [
  "the-machine",
  "performance",
  "engineering",
  "technology",
  "design",
  "pricing",
  "explore",
];

/**
 * The chapters this car's page renders, numbered in order. A chapter with
 * nothing in it is left out and the rest close up, so the headings, the
 * indicator and "03 / 06" always agree.
 */
export function planChapters(
  present: Partial<Record<ChapterId, boolean>>,
): ChapterPlan[] {
  return CHAPTER_ORDER.filter((id) => present[id] !== false).map((id, index) => ({
    id,
    number: String(index + 1).padStart(2, "0"),
    label: CHAPTER_LABELS[id],
  }));
}

// ---------------------------------------------------------------------------
// Structured-data offer
// ---------------------------------------------------------------------------

/** The catalogue's listed price for a variant, as car_catalog returns it. */
export type ListedPriceRow = {
  listed_price: number | string | null;
  listed_price_currency: string | null;
  listed_price_type: string | null;
  listed_price_market: string | null;
  listed_price_verified_at: string | null;
};

/**
 * Price types that are a published, sourced figure: every market_prices row
 * carries a source and a source URL. The variant's own `base_price` fallback
 * ("base_price") has no recorded source, and an estimate is not an offer, so
 * neither ever becomes a schema.org Offer.
 */
const OFFER_TYPES = [
  "manufacturer_list",
  "dealer_list",
  "ex_showroom",
  "on_road",
] as const;
type OfferType = (typeof OFFER_TYPES)[number];

function isOfferType(value: string | null): value is OfferType {
  return (OFFER_TYPES as readonly (string | null)[]).includes(value);
}

/** The listed price as a JSON-LD offer input, or null when it is not a sourced price. */
export function sourcedOffer(price: ListedPriceRow | null): {
  amount: number;
  currency: string;
  areaServed: string | null;
  validFrom: string | null;
  priceType: OfferType;
} | null {
  if (!price || !isOfferType(price.listed_price_type)) return null;
  const amount = toFinite(price.listed_price);
  const currency = price.listed_price_currency?.trim().toUpperCase() ?? "";
  if (amount === null || amount <= 0 || !/^[A-Z]{3}$/.test(currency)) return null;
  return {
    amount,
    currency,
    areaServed: price.listed_price_market?.trim() || null,
    validFrom: price.listed_price_verified_at?.slice(0, 10) || null,
    priceType: price.listed_price_type,
  };
}
