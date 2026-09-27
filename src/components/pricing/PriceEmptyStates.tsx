"use client";

import { ArrowRight, CircleSlash, MapPin } from "lucide-react";
import type { MarketSelection } from "@/lib/pricing/engine";
import type { PricedMarket } from "@/lib/pricing/presentation";
import { sameSelection } from "@/lib/pricing/market-url";
import { formatDate, formatPriceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The "price data unavailable" states. Each one says plainly what is missing
 * and, where prices exist elsewhere, offers them one tap away. Nothing here
 * suggests or estimates a figure.
 */

/** The variant has no price in force anywhere. */
export function NoPriceData({
  variantName,
  lastRecorded,
  className,
}: {
  variantName: string;
  /** effective_from of the newest expired row, when there is history. */
  lastRecorded: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xs bg-surface-1/60 px-6 py-10 sm:px-10 sm:py-12",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 tech-grid"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 hud-corners"
        aria-hidden="true"
      />
      <div className="relative max-w-2xl">
        <CircleSlash className="size-5 text-ink-500" aria-hidden="true" />
        <p className="mt-5 font-display text-sm tracking-[0.24em] text-ink-50 uppercase sm:text-base">
          Price data unavailable
        </p>
        <p className="mt-4 text-sm leading-relaxed text-ink-300 sm:text-base">
          No sourced price is recorded for the {variantName} yet.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-400">
          AURIX only shows prices that a named source has published, each with its market
          and the date it was last checked. It never estimates a price or converts one
          from another currency, so this stays empty until a real figure is recorded.
        </p>
        {lastRecorded ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-400">
            Earlier prices are on record (the latest from {formatDate(lastRecorded)}), but
            none is in force today.
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Shown in place of a price when no market is chosen, or when the chosen one
 * has nothing recorded. `market` is the chosen market's label, if any.
 */
export function MarketPrompt({
  market,
  variantName,
}: {
  market: string | null;
  variantName: string;
}) {
  if (!market) {
    return (
      <div className="border-y border-line-subtle py-8">
        <p className="font-display text-xs tracking-[0.18em] text-ink-50 uppercase">
          Choose a market
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
          Prices depend on where the car is registered. Pick a country, then a state and
          city, to see the price recorded there and how it is made up.
        </p>
      </div>
    );
  }
  return (
    <div className="border-y border-line-subtle py-8">
      <p className="flex items-center gap-2.5 font-display text-xs tracking-[0.2em] text-ink-50 uppercase">
        <CircleSlash className="size-4 text-ink-500" aria-hidden="true" />
        Price data unavailable
      </p>
      <p className="mt-3 flex items-start gap-2 text-sm text-ink-200">
        <MapPin className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
        {market}
      </p>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
        No sourced price is recorded for the {variantName} in this market, and there is no
        state or national price that applies to it. AURIX does not estimate one.
      </p>
    </div>
  );
}

/** Quick-select buttons for every market with a recorded price. */
export function PricedMarketList({
  markets,
  selection,
  onSelect,
  className,
}: {
  markets: readonly PricedMarket[];
  selection: MarketSelection;
  onSelect: (next: MarketSelection) => void;
  className?: string;
}) {
  if (markets.length === 0) return null;
  return (
    <div className={className}>
      <h3 className="font-display text-xs tracking-[0.18em] text-ink-50 uppercase">
        Prices recorded for
      </h3>
      <ul className="mt-3 border-t border-line-subtle">
        {markets.map((market) => {
          const selected = sameSelection(market.selection, selection);
          return (
            <li key={market.key} className="border-b border-line-subtle">
              <button
                type="button"
                onClick={() => onSelect(market.selection)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "group/market flex min-h-14 w-full items-center gap-4 py-3 text-left",
                  "transition-colors duration-(--duration-fast) hover:bg-surface-2/50",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-gold-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink-100">{market.label}</span>
                  {market.figure ? (
                    <span className="mt-0.5 block text-xs text-ink-400">
                      {market.figure.label}
                    </span>
                  ) : null}
                </span>
                {market.figure ? (
                  <span className="tabular font-mono text-sm whitespace-nowrap text-ink-200">
                    {formatPriceCompact(market.figure.amount, market.figure.currency)}
                  </span>
                ) : null}
                <ArrowRight
                  className="size-4 shrink-0 text-ink-500 transition-transform duration-(--duration-fast) group-hover/market:translate-x-0.5 group-hover/market:text-gold-300"
                  aria-hidden="true"
                />
                <span className="sr-only">Show this market&apos;s price</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
