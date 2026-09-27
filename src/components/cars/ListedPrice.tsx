import { formatDate, formatPrice, formatPriceCompact } from "@/lib/format";
import { PRICE_TYPE_LABELS } from "@/lib/pricing/engine";
import type { PriceType } from "@/types/domain";
import { cn } from "@/lib/utils";

/**
 * A catalogue listed price, always with what kind of figure it is and where
 * it applies: "₹3.51 Cr · Ex-showroom, Pune" or "$203.5K · Base price".
 *
 * The figure is the one the catalogue view resolved (the most recently
 * verified in-force listed price in any market, else the variant's recorded
 * base price). It is never converted between currencies, and when there is no
 * figure nothing is invented: the placeholder says so, or nothing renders.
 *
 * Server-safe: no hooks, no client or server-only imports. Used by the car
 * card and the detail page hero.
 */

export type ListedPriceData = {
  listed_price: number | string | null;
  listed_price_currency: string | null;
  /** 'base_price' or a price_type enum value. */
  listed_price_type: string | null;
  /** "City, Region, Country" — as specific as the source. */
  listed_price_market: string | null;
  listed_price_verified_at?: string | null;
};

/** Short labels for cards; the pricing engine's long labels are used elsewhere. */
const SHORT_LABELS: Record<PriceType | "base_price", string> = {
  base_price: "Base price",
  manufacturer_list: "List price",
  dealer_list: "Dealer list",
  ex_showroom: "Ex-showroom",
  on_road: "On-road",
  estimated_on_road: "Est. on-road",
};

function isPriceType(value: string): value is PriceType {
  return Object.hasOwn(PRICE_TYPE_LABELS, value) && value !== "calculated";
}

/** "Ex-showroom" / "Base price", or the long form ("Manufacturer list price"). */
export function listedPriceTypeLabel(type: string | null, long = false): string | null {
  if (!type) return null;
  if (type === "base_price") return "Base price";
  if (isPriceType(type)) return long ? PRICE_TYPE_LABELS[type] : SHORT_LABELS[type];
  return type.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function hasPrice(price: ListedPriceData): boolean {
  const amount =
    typeof price.listed_price === "string"
      ? Number(price.listed_price)
      : price.listed_price;
  return (
    amount !== null &&
    amount !== undefined &&
    Number.isFinite(amount) &&
    Boolean(price.listed_price_currency)
  );
}

export function ListedPrice({
  price,
  size = "card",
  placeholder = "Price not recorded",
  className,
}: {
  price: ListedPriceData;
  /**
   * card: amount over a one-line qualifier with the most specific market.
   * inline: one line, "amount · type, market".
   * hero: large amount, full market and the verification date.
   */
  size?: "card" | "inline" | "hero";
  /** Shown when there is no recorded price; `null` renders nothing. */
  placeholder?: string | null;
  className?: string;
}) {
  if (!hasPrice(price)) {
    if (placeholder === null) return null;
    return (
      <p className={cn("text-xs text-ink-500", className)}>
        <span>{placeholder}</span>
      </p>
    );
  }

  const currency = price.listed_price_currency;
  const compact = formatPriceCompact(price.listed_price, currency);
  const full = formatPrice(price.listed_price, currency);
  const type = listedPriceTypeLabel(price.listed_price_type, size === "hero");
  const market = price.listed_price_market?.trim() || null;
  // "Pune, Maharashtra, India" -> "Pune": the most specific part fits a card.
  const shortMarket = market?.split(",")[0]?.trim() ?? null;
  const qualifier = [type, size === "hero" ? market : shortMarket]
    .filter(Boolean)
    .join(", ");
  const verified = price.listed_price_verified_at
    ? formatDate(price.listed_price_verified_at, "")
    : "";

  // Compact forms ("₹3.51 Cr", "$203.5K") are for the eye; screen readers get
  // the full amount.
  const amount = (
    <>
      <span aria-hidden="true">{compact}</span>
      <span className="sr-only">{full}</span>
    </>
  );

  if (size === "inline") {
    return (
      <p className={cn("text-sm", className)}>
        <span className="tabular font-mono text-gold-200">{amount}</span>
        {qualifier ? <span className="text-ink-400"> · {qualifier}</span> : null}
      </p>
    );
  }

  if (size === "hero") {
    return (
      <div className={className}>
        <p className="tabular font-mono text-2xl text-gold-200 sm:text-3xl">{amount}</p>
        {qualifier ? <p className="mt-1.5 text-sm text-ink-300">{qualifier}</p> : null}
        {verified ? (
          <p className="mt-1 text-xs text-ink-500">Verified {verified}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <p className="tabular truncate font-mono text-sm text-gold-200">{amount}</p>
      {qualifier ? (
        <p className="mt-1 truncate text-[11px] text-ink-400">
          {qualifier}
          {market && market !== shortMarket ? (
            <span className="sr-only"> ({market})</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
