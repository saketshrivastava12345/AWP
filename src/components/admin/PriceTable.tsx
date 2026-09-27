import Link from "next/link";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { AdminPriceRow } from "@/lib/queries/admin";
import { priceRowAction } from "@/lib/admin/actions/prices";
import { PRICE_TYPE_ADMIN_LABELS } from "@/lib/admin/labels";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ConfirmAction, FormDialog, InlineAction } from "./ActionButtons";
import { TableFrame, TD, TD_NUM, TH } from "./AdminChrome";
import { TextField } from "./fields";
import { hostOf } from "./ProvenanceLine";

export type PriceSortKey = "effective" | "market" | "type" | "verified" | "amount";
export type SortDir = "asc" | "desc";

export function sortPrices<T extends AdminPriceRow>(
  rows: T[],
  key: PriceSortKey,
  dir: SortDir,
): T[] {
  const amount = (row: AdminPriceRow) =>
    Number(row.on_road_price ?? row.ex_showroom_price ?? 0);
  const compare: Record<PriceSortKey, (a: T, b: T) => number> = {
    effective: (a, b) => a.effective_from.localeCompare(b.effective_from),
    market: (a, b) => a.marketLabel.localeCompare(b.marketLabel),
    type: (a, b) => a.price_type.localeCompare(b.price_type),
    verified: (a, b) => a.last_verified_at.localeCompare(b.last_verified_at),
    amount: (a, b) => amount(a) - amount(b),
  };
  const sorted = [...rows].sort(
    (a, b) => compare[key](a, b) || b.effective_from.localeCompare(a.effective_from),
  );
  return dir === "desc" ? sorted.reverse() : sorted;
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  hrefFor,
  align = "left",
}: {
  label: string;
  sortKey: PriceSortKey;
  current: PriceSortKey;
  dir: SortDir;
  hrefFor: (key: PriceSortKey, dir: SortDir) => string;
  align?: "left" | "right";
}) {
  const active = current === sortKey;
  const next: SortDir = active && dir === "desc" ? "asc" : "desc";
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(TH, align === "right" && "text-right")}
    >
      <Link
        href={hrefFor(sortKey, next)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-ink-100",
          active && "text-ink-50",
        )}
        scroll={false}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="size-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="size-3" aria-hidden="true" />
          )
        ) : null}
        <span className="sr-only">
          {active ? `, sorted ${dir === "asc" ? "ascending" : "descending"}` : ", sort"}
        </span>
      </Link>
    </th>
  );
}

/**
 * Price rows with their market, figures, period, provenance and actions.
 * `vehicleTitle` adds a vehicle column (the catalogue-wide overview).
 */
export function PriceTable({
  rows,
  label,
  sort,
  dir,
  hrefFor,
  highlight,
  showVehicle = false,
  today,
}: {
  rows: (AdminPriceRow & { vehicleTitle?: string })[];
  label: string;
  sort: PriceSortKey;
  dir: SortDir;
  hrefFor: (key: PriceSortKey, dir: SortDir) => string;
  highlight?: string | null;
  showVehicle?: boolean;
  today: string;
}) {
  const header = { current: sort, dir, hrefFor };
  return (
    <TableFrame label={label}>
      <table className="w-full min-w-[1280px] border-collapse">
        <thead>
          <tr>
            {showVehicle ? (
              <th scope="col" className={TH}>
                Vehicle
              </th>
            ) : null}
            <SortHeader label="Market" sortKey="market" {...header} />
            <SortHeader label="Type" sortKey="type" {...header} />
            <SortHeader label="Listed" sortKey="amount" {...header} align="right" />
            <th scope="col" className={cn(TH, "text-right")}>
              On-road
            </th>
            <SortHeader label="Effective" sortKey="effective" {...header} />
            <SortHeader label="Verified" sortKey="verified" {...header} />
            <th scope="col" className={TH}>
              Source
            </th>
            <th scope="col" className={cn(TH, "z-[2] text-right md:right-0")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const title = `${PRICE_TYPE_ADMIN_LABELS[row.price_type]}, ${row.marketLabel}, from ${row.effective_from}`;
            const editBase = `/admin/vehicles/${row.variant_id}/prices`;
            return (
              <tr
                key={row.id}
                id={`price-${row.id}`}
                className={cn(
                  "transition-colors hover:bg-surface-2/40",
                  highlight === row.id && "bg-surface-2",
                )}
              >
                {showVehicle ? (
                  <td className={cn(TD, "min-w-44")}>
                    <Link
                      href={editBase}
                      className="text-ink-50 underline-offset-4 hover:underline"
                    >
                      {row.vehicleTitle}
                    </Link>
                  </td>
                ) : null}
                <td className={cn(TD, "min-w-48")}>
                  <span className="block text-ink-100">{row.marketLabel}</span>
                  <span className="text-xs text-ink-500">
                    {row.scope === "city"
                      ? "City"
                      : row.scope === "region"
                        ? "State"
                        : "National"}
                  </span>
                </td>
                <td className={cn(TD, "min-w-36 text-xs")}>
                  <span className="block text-ink-200">
                    {PRICE_TYPE_ADMIN_LABELS[row.price_type]}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {row.isCurrent ? (
                      <Badge tone="positive" className="whitespace-nowrap">
                        In force
                      </Badge>
                    ) : row.isScheduled ? (
                      <Badge tone="electric">Scheduled</Badge>
                    ) : (
                      <Badge>History</Badge>
                    )}
                  </span>
                </td>
                <td className={TD_NUM}>
                  {formatPrice(row.ex_showroom_price, row.currency, "—")}
                </td>
                <td className={TD_NUM}>
                  {formatPrice(row.on_road_price, row.currency, "—")}
                </td>
                <td className={cn(TD, "text-xs whitespace-nowrap tabular-nums")}>
                  {formatDate(row.effective_from)}
                  <span className="block text-ink-500">
                    {row.effective_to
                      ? `to ${formatDate(row.effective_to)}`
                      : "open-ended"}
                  </span>
                </td>
                <td className={cn(TD, "text-xs whitespace-nowrap")}>
                  <span className="tabular-nums">{formatDate(row.last_verified_at)}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {row.is_verified ? (
                      <Badge tone="positive">Verified</Badge>
                    ) : (
                      <Badge tone="hybrid">Unverified</Badge>
                    )}
                    {row.isStale ? <Badge tone="negative">Stale</Badge> : null}
                  </span>
                </td>
                <td className={cn(TD, "max-w-56 text-xs")}>
                  <span className="block truncate text-ink-200" title={row.source}>
                    {row.source}
                  </span>
                  <a
                    href={row.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-ink-50 underline-offset-4 hover:underline"
                  >
                    {hostOf(row.source_url)}
                    <ExternalLink className="size-3" aria-hidden="true" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </td>
                <td
                  className={cn(
                    TD,
                    "bg-surface-1 text-right whitespace-nowrap md:sticky md:right-0 md:shadow-[-12px_0_16px_-12px_rgb(0_0_0/0.9)]",
                  )}
                >
                  <div className="flex flex-nowrap justify-end gap-1">
                    <ButtonLink
                      href={`${editBase}?edit=${row.id}#price-form`}
                      size="sm"
                      variant="secondary"
                      aria-label={`Edit ${title}`}
                    >
                      Edit
                    </ButtonLink>
                    <ButtonLink
                      href={`${editBase}?copy=${row.id}#price-form`}
                      size="sm"
                      variant="ghost"
                      aria-label={`Add a newer price based on ${title}`}
                    >
                      Newer
                    </ButtonLink>
                    {!row.is_verified || row.last_verified_at !== today ? (
                      <InlineAction
                        action={priceRowAction}
                        fields={{ price_id: row.id, operation: "verify" }}
                        variant="ghost"
                        label={`Verify ${title} (mark verified today)`}
                      >
                        Verify
                      </InlineAction>
                    ) : null}
                    {!row.effective_to ? (
                      <FormDialog
                        action={priceRowAction}
                        trigger="Close"
                        triggerLabel={`Close ${title}`}
                        title="Close this price"
                        description="The price stays in the history, in force until the date you choose."
                        submitLabel="Close price"
                        size="sm"
                      >
                        <input type="hidden" name="price_id" value={row.id} />
                        <input type="hidden" name="operation" value="close" />
                        <TextField
                          name="effective_to"
                          label="In force until"
                          type="date"
                          required
                          defaultValue={today}
                        />
                      </FormDialog>
                    ) : null}
                    <ConfirmAction
                      action={priceRowAction}
                      fields={{ price_id: row.id, operation: "delete" }}
                      trigger="Delete"
                      triggerVariant="ghost"
                      triggerLabel={`Delete ${title}`}
                      title="Delete this price?"
                      description="Deleting removes it from the history too. To record that a price no longer applies, close it instead."
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableFrame>
  );
}
