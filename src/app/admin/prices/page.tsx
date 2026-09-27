import Link from "next/link";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { AdminPageHeader, Notice, Panel } from "@/components/admin/AdminChrome";
import {
  PriceTable,
  sortPrices,
  type PriceSortKey,
  type SortDir,
} from "@/components/admin/PriceTable";
import { VehicleFinder } from "@/components/admin/VehicleFinder";
import { adminPage, param } from "@/lib/admin/page";
import { todayIso } from "@/lib/admin/validation";
import {
  getAdminGeography,
  getPriceOverview,
  getVariantLabels,
  type PriceOverviewFilter,
} from "@/lib/queries/admin";
import { STALE_AFTER_DAYS } from "@/lib/pricing/engine";
import { formatYearRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prices" };

const FILTERS: { value: PriceOverviewFilter; label: string }[] = [
  { value: "all", label: "All in force" },
  { value: "unverified", label: "Not verified" },
  { value: "stale", label: `Checked over ${STALE_AFTER_DAYS} days ago` },
];
const SORT_KEYS: PriceSortKey[] = ["effective", "market", "type", "verified", "amount"];

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const search = await searchParams;
  const filterParam = param(search, "filter");
  const filter: PriceOverviewFilter =
    filterParam === "unverified" || filterParam === "stale" ? filterParam : "all";
  const [labels, geography] = await Promise.all([
    getVariantLabels(supabase),
    getAdminGeography(supabase),
  ]);
  const byId = new Map(labels.map((label) => [label.id, label]));
  const { rows, error } = await getPriceOverview(supabase, filter, geography, byId);

  const sortParam = param(search, "sort") as PriceSortKey;
  const sort: PriceSortKey = SORT_KEYS.includes(sortParam) ? sortParam : "verified";
  const dir: SortDir = param(search, "dir") === "desc" ? "desc" : "asc";
  const hrefFor = (key: PriceSortKey, next: SortDir) =>
    `/admin/prices?${new URLSearchParams({ ...(filter !== "all" ? { filter } : {}), sort: key, dir: next })}`;
  const sorted = sortPrices(rows, sort, dir);

  return (
    <>
      <AdminPageHeader
        title="Prices"
        crumbs={[{ label: "Prices" }]}
        description="Every price is a sourced observation for one market and date. Choose a vehicle to add or edit its prices, or review what needs checking below."
        actions={
          <>
            <ButtonLink href="/admin/markets" variant="ghost" size="sm">
              Markets
            </ButtonLink>
            <ButtonLink href="/admin/prices/import" variant="secondary" size="sm">
              Import CSV
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-8 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel title="Choose a vehicle" className="max-w-2xl 2xl:max-w-none">
          <VehicleFinder
            section="/prices"
            vehicles={labels.map((label) => ({
              id: label.id,
              title: label.title,
              years: formatYearRange(label.yearStart, label.yearEnd),
              isPublished: label.isPublished,
            }))}
          />
          <noscript>
            <p className="mt-3 text-xs text-ink-500">
              Without JavaScript, find the vehicle under{" "}
              <Link
                href="/admin/vehicles"
                className="text-ink-50 underline-offset-4 hover:underline"
              >
                Vehicles
              </Link>{" "}
              and open its Prices tab.
            </p>
          </noscript>
        </Panel>

        <section aria-labelledby="in-force" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 id="in-force" className="text-h4">
              Prices in force ({rows.length})
            </h2>
            <nav aria-label="Price filters">
              <ul className="flex flex-wrap gap-1">
                {FILTERS.map((entry) => (
                  <li key={entry.value}>
                    <Link
                      href={
                        entry.value === "all"
                          ? "/admin/prices"
                          : `/admin/prices?filter=${entry.value}`
                      }
                      aria-current={filter === entry.value ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center rounded-pill border px-4 text-body-s transition-colors duration-(--duration-fast)",
                        filter === entry.value
                          ? "border-line-strong bg-surface-2 text-ink-50"
                          : "border-line-subtle text-ink-300 hover:text-ink-50",
                      )}
                    >
                      {entry.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          {error ? (
            <Notice tone="error">Prices could not be loaded.</Notice>
          ) : sorted.length === 0 ? (
            <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
              {filter === "all"
                ? "No prices are in force yet. Choose a vehicle to add its first sourced price, or import a CSV."
                : "Nothing needs attention here."}
            </p>
          ) : (
            <PriceTable
              rows={sorted}
              label="Prices in force across the catalogue"
              sort={sort}
              dir={dir}
              hrefFor={hrefFor}
              showVehicle
              today={todayIso()}
            />
          )}
        </section>
      </div>
    </>
  );
}
