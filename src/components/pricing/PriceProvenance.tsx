"use client";

import { ArrowUpRight } from "lucide-react";
import type { MarketGeography, MarketPrice } from "@/types/domain";
import { PRICE_TYPE_LABELS, type ResolvedPrice } from "@/lib/pricing/engine";
import {
  freshness,
  isHttpUrl,
  publishedFigure,
  scopeName,
} from "@/lib/pricing/presentation";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "View source" for a price row: a real external link, never a dead button. */
export function SourceLink({
  price,
  className,
  compact = false,
}: {
  price: Pick<MarketPrice, "source" | "source_url">;
  className?: string;
  compact?: boolean;
}) {
  if (!isHttpUrl(price.source_url)) return null;
  return (
    <a
      href={price.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 rounded-xs text-ink-200 underline decoration-line-strong underline-offset-4",
        "transition-colors duration-(--duration-fast) hover:text-ink-50 hover:decoration-ink-400",
        // 44px touch target on phones; the compact link tightens from md up.
        compact ? "min-h-11 text-xs md:min-h-6" : "min-h-11 text-body-s",
        className,
      )}
    >
      {compact ? "Source" : "View source"}
      <ArrowUpRight className={compact ? "size-3" : "size-3.5"} aria-hidden="true" />
      <span className="sr-only"> (opens {price.source} in a new tab)</span>
    </a>
  );
}

/**
 * Where the displayed price came from and how fresh it is, followed by the
 * other figures in force for the same market (for example the manufacturer's
 * list price alongside a city's on-road price).
 */
export function PriceProvenance({
  geography,
  applied,
  others,
  today,
}: {
  geography: MarketGeography;
  applied: ResolvedPrice;
  others: readonly ResolvedPrice[];
  today: string | null;
}) {
  const { price } = applied;
  const fresh = freshness(price.last_verified_at, today);

  return (
    <div>
      <h3 className="text-h4">Source</h3>
      <dl className="mt-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-line-subtle py-2">
          <dt className="sr-only">Published by</dt>
          <dd className="min-w-0 text-ink-100">{price.source}</dd>
          <dd>
            <SourceLink price={price} />
          </dd>
        </div>
        <ProvenanceRow label="Last verified">
          {formatDate(price.last_verified_at)}
          {fresh ? <span className="text-ink-400"> · {fresh.relative}</span> : null}
        </ProvenanceRow>
        <ProvenanceRow label="In force">
          {price.effective_to
            ? `${formatDate(price.effective_from)} – ${formatDate(price.effective_to)}`
            : `Since ${formatDate(price.effective_from)}`}
        </ProvenanceRow>
        <ProvenanceRow label="Status">
          {price.is_verified ? "Verified" : "Awaiting verification"}
        </ProvenanceRow>
      </dl>
      {price.notes ? (
        <p className="mt-3 text-caption">
          <span className="text-ink-300">Source note:</span> {price.notes}
        </p>
      ) : null}

      {others.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-h4">Also in force here</h3>
          <ul className="mt-2">
            {others.map((entry) => (
              <OtherFigure
                key={entry.price.id}
                geography={geography}
                entry={entry}
                today={today}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ProvenanceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-b border-line-subtle py-2">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-right text-ink-100">{children}</dd>
    </div>
  );
}

function OtherFigure({
  geography,
  entry,
  today,
}: {
  geography: MarketGeography;
  entry: ResolvedPrice;
  today: string | null;
}) {
  const { price } = entry;
  const figure = publishedFigure(price);
  const fresh = freshness(price.last_verified_at, today);
  return (
    <li className="border-b border-line-subtle py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 text-sm text-ink-200">
          {PRICE_TYPE_LABELS[price.price_type]}
          <span className="text-ink-400"> · {scopeName(geography, price)}</span>
        </p>
        <p className="tabular font-mono text-sm whitespace-nowrap text-ink-100">
          {figure ? formatPrice(figure.amount, figure.currency) : "—"}
        </p>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
        <span>
          {price.is_verified ? "Verified" : "Awaiting verification"} ·{" "}
          {formatDate(price.last_verified_at)}
        </span>
        {fresh?.stale ? (
          <span className="text-signal-negative">May be out of date</span>
        ) : null}
        <SourceLink price={price} compact className="ml-auto" />
      </p>
    </li>
  );
}
