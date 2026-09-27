"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import type { MarketGeography, VariantPricing } from "@/types/domain";
import {
  buildBreakdown,
  PRICE_TYPE_LABELS,
  priceHistory,
  pricesForSelection,
  primaryPrice,
  type MarketSelection,
} from "@/lib/pricing/engine";
import { pricedMarketIds } from "@/lib/pricing/selection";
import {
  headlineFigure,
  marketLabel,
  pricedMarkets,
  scopeName,
} from "@/lib/pricing/presentation";
import { formatPrice } from "@/lib/format";
import { useMarketSelection } from "@/hooks/useMarketSelection";
import {
  MARKET_PENDING_ATTRIBUTE,
  MARKET_PENDING_SCRIPT,
} from "@/lib/pricing/market-url";
import { cn } from "@/lib/utils";
import { MarketSelector } from "./MarketSelector";
import { PriceSummary } from "./PriceSummary";
import { PriceProvenance } from "./PriceProvenance";
import { PriceHistory } from "./PriceHistory";
import { MarketPrompt, NoPriceData, PricedMarketList } from "./PriceEmptyStates";
import { useToday } from "./useToday";

export type PricingSectionProps = {
  geography: MarketGeography;
  pricing: VariantPricing;
  /** Used in captions and empty states: "911 GT3". */
  variantName: string;
  className?: string;
};

/**
 * Market pricing for one variant: choose a country, state and city; see the
 * price recorded there, how it is made up, where it came from, how fresh it
 * is, and how it has moved.
 *
 * The page supplies the section heading; this starts with the selector. All
 * price logic is the pure, tested engine in lib/pricing — this component only
 * chooses what to show. Nothing is ever estimated or converted: a market with
 * no sourced figure says so.
 */
export function PricingSection({
  geography,
  pricing,
  variantName,
  className,
}: PricingSectionProps) {
  const { current, history } = pricing;
  const { selection, source, select, ready } = useMarketSelection(geography, current);
  const rootRef = useRef<HTMLDivElement>(null);

  // The inline script hides the panels while the visitor's own market (URL or
  // storage) is pending; lift that once the browser's values are applied.
  useEffect(() => {
    if (ready) rootRef.current?.removeAttribute(MARKET_PENDING_ATTRIBUTE);
  }, [ready]);
  const today = useToday();
  // Announce only what the visitor changed, not the market restored on load.
  const [announce, setAnnounce] = useState(false);
  const choose = useCallback(
    (next: MarketSelection) => {
      setAnnounce(true);
      select(next);
    },
    [select],
  );

  const pricedIds = useMemo(() => pricedMarketIds(current), [current]);
  const markets = useMemo(() => pricedMarkets(geography, current), [geography, current]);
  const resolved = useMemo(
    () => pricesForSelection(current, selection),
    [current, selection],
  );
  const applied = primaryPrice(resolved);
  const others = applied
    ? resolved.filter((entry) => entry.price.id !== applied.price.id)
    : [];
  const points = useMemo(
    () => (applied ? priceHistory(history, applied.price) : []),
    [applied, history],
  );

  if (current.length === 0) {
    // History rows with an end date are prices that were once in force.
    const lastRecorded =
      history.find((row) => row.effective_to !== null)?.effective_from ?? null;
    return (
      <div className={cn("space-y-6", className)}>
        <NoPriceData variantName={variantName} lastRecorded={lastRecorded} />
        <Disclaimer />
      </div>
    );
  }

  const chosenLabel = selection.countryId ? marketLabel(geography, selection) : null;
  const headline = applied ? headlineFigure(buildBreakdown(applied.price)) : null;
  const announcement = applied
    ? `${headline?.label ?? PRICE_TYPE_LABELS[applied.price.price_type]} for ${chosenLabel}: ${
        headline ? formatPrice(headline.amount, headline.currency) : "not available"
      }`
    : chosenLabel
      ? `Price data unavailable for ${chosenLabel}`
      : "No market selected";

  return (
    <div
      ref={rootRef}
      // The pending script may add an attribute before hydration.
      suppressHydrationWarning
      className={cn("group/pricing space-y-10", className)}
    >
      {/* Only in the server HTML and the hydration pass: a script rendered
          on the client never runs, and React warns about it. */}
      {ready ? null : (
        <script dangerouslySetInnerHTML={{ __html: MARKET_PENDING_SCRIPT }} />
      )}
      <p className="sr-only" aria-live="polite">
        {announce ? announcement : ""}
      </p>

      <div
        className={cn(
          "grid gap-x-14 gap-y-12 transition-opacity duration-(--duration-fast) lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]",
          "group-data-[market-pending]/pricing:opacity-0",
        )}
      >
        <div className="min-w-0 space-y-8">
          <div>
            <MarketSelector
              geography={geography}
              selection={selection}
              pricedIds={pricedIds}
              onSelect={choose}
            />
            {source === "default" && applied ? (
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                Showing the most recently verified market. Choose yours above.
              </p>
            ) : null}
          </div>

          {applied ? (
            <PriceSummary
              geography={geography}
              selection={selection}
              applied={applied}
              variantName={variantName}
              today={today}
            />
          ) : (
            <MarketPrompt market={chosenLabel} variantName={variantName} />
          )}
        </div>

        <div className="min-w-0 space-y-10">
          {applied ? (
            <>
              <PriceHistory
                key={`${applied.price.country_id}|${applied.price.region_id}|${applied.price.city_id}|${applied.price.price_type}`}
                points={points}
                currency={applied.price.currency}
                title={`${PRICE_TYPE_LABELS[applied.price.price_type]} · ${scopeName(geography, applied.price)}`}
                today={today}
              />
              <PriceProvenance
                geography={geography}
                applied={applied}
                others={others}
                today={today}
              />
            </>
          ) : (
            <PricedMarketList markets={markets} selection={selection} onSelect={choose} />
          )}
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="flex items-start gap-2.5 border-t border-line-subtle pt-5 text-xs leading-relaxed text-ink-500">
      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Prices vary by dealer, insurance provider, variant, tax rules and registration
        date. Figures are shown as their source published them, in that market&apos;s
        currency, and are never converted. Confirm the final price with an authorised
        dealer.
      </span>
    </p>
  );
}
