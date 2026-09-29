import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Notice, Panel } from "@/components/admin/AdminChrome";
import { PriceForm } from "@/components/admin/PriceForm";
import {
  PriceTable,
  sortPrices,
  type PriceSortKey,
  type SortDir,
} from "@/components/admin/PriceTable";
import { adminPage, param, routeId } from "@/lib/admin/page";
import { isUuid, todayIso } from "@/lib/admin/validation";
import {
  getAdminGeography,
  getAdminVehicle,
  getPriceById,
  getVehiclePrices,
} from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Prices" };

const SORT_KEYS: PriceSortKey[] = ["effective", "market", "type", "verified", "amount"];

/** How the source row of an "Add newer price" save was treated. */
const PREVIOUS_NOTES: Record<string, string> = {
  closed: "The previous price was closed the day before this one takes effect.",
  "other-market":
    "The previous price was left open because it is for another market or price type.",
  "already-closed": "The previous price was already closed, so it was left as it was.",
  "starts-later":
    "The previous price starts after this one, so it was left open. Check the dates.",
  missing: "The previous price no longer exists, so nothing was closed.",
  failed: "The previous price could not be closed. Close it by hand.",
};

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehiclePricesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const search = await searchParams;
  const editId = param(search, "edit");
  const copyId = param(search, "copy");
  const sourceId = isUuid(editId) ? editId : isUuid(copyId) ? copyId : null;

  const [vehicle, geography, sourcePrice] = await Promise.all([
    getAdminVehicle(supabase, id),
    getAdminGeography(supabase),
    sourceId ? getPriceById(supabase, sourceId) : Promise.resolve(null),
  ]);
  if (!vehicle) notFound();
  const { rows, error } = await getVehiclePrices(supabase, id, geography);

  const sortParam = param(search, "sort") as PriceSortKey;
  const sort: PriceSortKey = SORT_KEYS.includes(sortParam) ? sortParam : "effective";
  const dir: SortDir = param(search, "dir") === "asc" ? "asc" : "desc";
  const hrefFor = (key: PriceSortKey, next: SortDir) =>
    `/admin/vehicles/${id}/prices?sort=${key}&dir=${next}#history`;
  const current = sortPrices(
    rows.filter((row) => row.isCurrent),
    sort,
    dir,
  );
  const history = sortPrices(rows, sort, dir);
  const saved = param(search, "saved");
  const previousNote = PREVIOUS_NOTES[param(search, "previous") ?? ""];
  const initial = sourcePrice && sourcePrice.variant_id === id ? sourcePrice : null;
  const mode = initial ? (isUuid(editId) ? "edit" : "copy") : "add";
  const today = todayIso();

  return (
    <div className="flex flex-col gap-10">
      {saved ? (
        <Notice tone="success" title="Price saved">
          It is highlighted below. The public page shows it on the next load (the price
          cache was cleared).{previousNote ? ` ${previousNote}` : null}
        </Notice>
      ) : null}
      {geography.countries.length === 0 ? (
        <Notice tone="error">
          The market geography could not be loaded, so prices cannot be added right now.
        </Notice>
      ) : null}

      <section aria-labelledby="current-prices">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="current-prices" className="text-h4">
              In force today ({current.length})
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              The latest row per market and price type whose period includes today — what
              the public page uses.
            </p>
          </div>
          <ButtonLink href={`/admin/vehicles/${id}/prices#price-form`} size="sm">
            Add a price
          </ButtonLink>
        </div>
        {error ? (
          <Notice tone="error">Prices could not be loaded. Reload to try again.</Notice>
        ) : current.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No price is in force for this vehicle. The public page says so rather than
            showing an estimate.
          </p>
        ) : (
          <PriceTable
            rows={current}
            label="Prices in force"
            sort={sort}
            dir={dir}
            hrefFor={hrefFor}
            highlight={saved}
            today={today}
          />
        )}
      </section>

      <section id="history" aria-labelledby="price-history">
        <h2 id="price-history" className="mb-1 text-h4">
          Full history ({history.length})
        </h2>
        <p className="mb-3 text-xs text-ink-500">
          Every price ever recorded, including closed and superseded rows. Sort by any
          column.
        </p>
        {history.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No prices recorded yet.
          </p>
        ) : (
          <PriceTable
            rows={history}
            label="Price history"
            sort={sort}
            dir={dir}
            hrefFor={hrefFor}
            highlight={saved}
            today={today}
          />
        )}
      </section>

      <Panel
        id="price-form"
        title={
          mode === "edit"
            ? "Edit price"
            : mode === "copy"
              ? "Add a newer price"
              : "Add a price"
        }
        description={
          mode === "copy"
            ? "Pre-filled from the selected price. Change what the source now says, and the effective date."
            : "One sourced observation: a figure a source published for a market, on a date."
        }
      >
        <PriceForm
          key={`${mode}-${initial?.id ?? "new"}`}
          variantId={id}
          countries={geography.countries}
          initial={initial}
          mode={mode}
          today={today}
        />
      </Panel>
    </div>
  );
}
