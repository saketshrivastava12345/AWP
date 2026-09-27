"use client";

import { Fragment } from "react";
import { AlertTriangle, BadgeCheck, Clock, Info, MapPin } from "lucide-react";
import type { MarketGeography } from "@/types/domain";
import {
  buildBreakdown,
  PRICE_TYPE_LABELS,
  type MarketSelection,
  type ResolvedPrice,
} from "@/lib/pricing/engine";
import {
  fallbackNotice,
  freshness,
  headlineFigure,
  marketLabel,
  missingTotalMessage,
  totalCaption,
} from "@/lib/pricing/presentation";
import { formatDate, formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { InfoHint } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { useSwapAnimation } from "./useSwapAnimation";

export function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge tone="positive" className="gap-1.5">
      <BadgeCheck className="size-3" aria-hidden="true" />
      Verified
    </Badge>
  ) : (
    <Badge tone="neutral" className="gap-1.5">
      <Clock className="size-3" aria-hidden="true" />
      Awaiting verification
    </Badge>
  );
}

/**
 * The applicable price for the chosen market: the headline figure with its
 * type and market, any fallback in plain words, and the line-by-line
 * breakdown ending in the total and what kind of total it is.
 */
export function PriceSummary({
  geography,
  selection,
  applied,
  variantName,
  today,
}: {
  geography: MarketGeography;
  selection: MarketSelection;
  applied: ResolvedPrice;
  variantName: string;
  today: string | null;
}) {
  const { price } = applied;
  const breakdown = buildBreakdown(price);
  const headline = headlineFigure(breakdown);
  const chosenMarket = marketLabel(geography, selection);
  const notice = fallbackNotice(geography, selection, applied);
  const fresh = freshness(price.last_verified_at, today);
  const figureRef = useSwapAnimation<HTMLDivElement>(
    `${price.id}:${headline?.amount ?? "none"}`,
  );
  const tableRef = useSwapAnimation<HTMLDivElement>(price.id, { distance: 0 });

  const isTotal = headline?.kind === "published" || headline?.kind === "calculated";
  const showTable = breakdown.components.length > 0 || breakdown.total !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-label">
          <KeepHyphens text={headline?.label ?? PRICE_TYPE_LABELS[price.price_type]} />
          {headline ? (
            <InfoHint label={`What “${headline.label}” means`}>{headline.note}</InfoHint>
          ) : null}
        </p>
        <VerificationBadge verified={price.is_verified} />
      </div>

      <div ref={figureRef}>
        <p
          className={cn(
            "mt-3 font-display text-[1.75rem] leading-tight tracking-wide sm:text-[2.25rem] xl:text-[2.5rem]",
            isTotal ? "gold-gradient-text" : "text-ink-50",
          )}
        >
          {headline ? formatPrice(headline.amount, headline.currency) : "Not available"}
        </p>
        {headline?.kind === "calculated" ? (
          <p className="mt-1.5 text-xs text-ink-400">
            Sum of the published components, added up by AURIX — not a quotation.
          </p>
        ) : null}
      </div>

      <p className="mt-4 flex items-start gap-2 text-sm text-ink-200">
        <MapPin className="mt-0.5 size-4 shrink-0 text-ink-500" aria-hidden="true" />
        <span>
          <span className="sr-only">Market: </span>
          {chosenMarket}
        </span>
      </p>

      {notice ? (
        <p className="mt-4 flex items-start gap-2.5 rounded-sm border border-line bg-surface-2/50 px-3.5 py-3 text-sm leading-relaxed text-ink-200">
          <Info className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
          {notice}
        </p>
      ) : null}

      {fresh?.stale ? (
        <p className="mt-3 flex items-start gap-2.5 rounded-sm border border-signal-negative/30 bg-signal-negative/5 px-3.5 py-3 text-sm leading-relaxed text-ink-200">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-signal-negative"
            aria-hidden="true"
          />
          <span>
            Last verified {formatDate(price.last_verified_at)} ({fresh.relative}). This
            price may be out of date.
          </span>
        </p>
      ) : null}

      {showTable ? (
        <div ref={tableRef} className="mt-7">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Price breakdown for the {variantName} in {chosenMarket}
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Amount</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.listed ? (
                <BreakdownRow
                  label={PRICE_TYPE_LABELS[breakdown.listed.type]}
                  value={formatPrice(breakdown.listed.amount, breakdown.currency)}
                />
              ) : null}
              {breakdown.components.map((line) => (
                <BreakdownRow
                  key={line.key}
                  label={line.label}
                  value={formatPrice(line.amount, breakdown.currency)}
                />
              ))}
            </tbody>
            <tfoot>
              {breakdown.total ? (
                <tr className="border-t border-line-strong">
                  <th scope="row" className="pt-4 pr-4 text-left align-top font-normal">
                    <span className="block font-display text-[11px] tracking-[0.16em] text-ink-50 uppercase">
                      <KeepHyphens text={totalCaption(breakdown.total).label} />
                    </span>
                    <span className="mt-1 block text-xs text-ink-400">
                      {totalCaption(breakdown.total).detail}
                    </span>
                  </th>
                  <td className="tabular pt-4 text-right align-top font-mono text-base whitespace-nowrap text-gold-300">
                    {formatPrice(breakdown.total.amount, breakdown.currency)}
                  </td>
                </tr>
              ) : (
                <tr className="border-t border-line-strong">
                  <th scope="row" className="pt-4 pr-4 text-left align-top font-normal">
                    <span className="block font-display text-[11px] tracking-[0.16em] text-ink-300 uppercase">
                      On-road total
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-400">
                      {missingTotalMessage(breakdown.missingForTotal)}
                    </span>
                  </th>
                  <td className="pt-4 text-right align-top font-mono text-ink-500">—</td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="mt-6 flex items-start gap-2.5 border-t border-line pt-4 text-xs leading-relaxed text-ink-400">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {missingTotalMessage(breakdown.missingForTotal)}
        </p>
      )}
    </div>
  );
}

/**
 * Lets a label wrap between words but never at its hyphen, so a narrow
 * column shows "Calculated / on-road" rather than "Calculated on- / road".
 */
function KeepHyphens({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={index}>
          {index > 0 ? " " : null}
          {word.includes("-") ? <span className="whitespace-nowrap">{word}</span> : word}
        </Fragment>
      ))}
    </>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-line-subtle last:border-b-0">
      <th scope="row" className="py-3 pr-4 text-left font-normal text-ink-300">
        {label}
      </th>
      <td className="tabular py-3 text-right font-mono whitespace-nowrap text-ink-100">
        {value}
      </td>
    </tr>
  );
}
