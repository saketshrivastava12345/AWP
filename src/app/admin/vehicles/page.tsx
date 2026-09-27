import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminPageHeader,
  Notice,
  TableFrame,
  TD,
  TH,
} from "@/components/admin/AdminChrome";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { InlineAction } from "@/components/admin/ActionButtons";
import { SelectField, TextField } from "@/components/admin/fields";
import { VehicleThumb } from "@/components/admin/VehicleThumb";
import { setPublished } from "@/lib/admin/actions/vehicles";
import {
  FUEL_SHORT,
  FUEL_OPTIONS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_OPTIONS,
  FUEL_TYPES,
  VEHICLE_STATUSES,
} from "@/lib/admin/labels";
import { localFileMissing } from "@/lib/admin/local-files";
import { adminPage, param } from "@/lib/admin/page";
import { YEAR_MAX, YEAR_MIN } from "@/lib/admin/validation";
import {
  getManufacturerOptions,
  listAdminVehicles,
  type VehicleListFilters,
  type VehicleQuality,
} from "@/lib/queries/admin";
import { formatNumber, formatYearRange } from "@/lib/format";

export const metadata: Metadata = { title: "Vehicles" };

const QUALITY_LABELS: Record<VehicleQuality, string> = {
  "no-photo": "Without a photograph",
  unsourced: "With unsourced figures",
  unverified: "With never-verified sections",
};

type Search = Record<string, string | string[] | undefined>;

function readFilters(search: Search): VehicleListFilters {
  const pick = <T extends string>(value: string, allowed: readonly T[]): T | null =>
    (allowed as readonly string[]).includes(value) ? (value as T) : null;
  const year = Number(param(search, "year"));
  const page = Number(param(search, "page"));
  const status = param(search, "status");
  return {
    q: param(search, "q").slice(0, 80),
    manufacturer: /^[0-9a-f-]{36}$/i.test(param(search, "manufacturer"))
      ? param(search, "manufacturer")
      : null,
    fuel: pick(param(search, "fuel"), FUEL_TYPES),
    status: status === "none" ? "none" : pick(status, VEHICLE_STATUSES),
    published: pick(param(search, "published"), ["yes", "no"] as const),
    year: Number.isInteger(year) && year >= YEAR_MIN && year <= YEAR_MAX ? year : null,
    quality: pick(
      param(search, "quality"),
      Object.keys(QUALITY_LABELS) as VehicleQuality[],
    ),
    sort: param(search, "sort") === "year" ? "year" : "name",
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { supabase } = await adminPage();
  const search = await searchParams;
  const filters = readFilters(search);
  const [list, manufacturers] = await Promise.all([
    listAdminVehicles(supabase, filters),
    getManufacturerOptions(supabase),
  ]);
  const deleted = param(search, "deleted");
  const params: Record<string, string> = {
    q: filters.q,
    manufacturer: filters.manufacturer ?? "",
    fuel: filters.fuel ?? "",
    status: filters.status ?? "",
    published: filters.published ?? "",
    year: filters.year ? String(filters.year) : "",
    quality: filters.quality ?? "",
    sort: filters.sort === "year" ? "year" : "",
  };
  const filtered = Object.entries(params).some(([key, value]) => key !== "sort" && value);

  return (
    <>
      <AdminPageHeader
        title="Vehicles"
        crumbs={[{ label: "Vehicles" }]}
        description="Every variant in the catalogue, drafts included. Drafts are invisible on the public site."
        actions={
          <ButtonLink href="/admin/vehicles/new" size="sm">
            New vehicle
          </ButtonLink>
        }
      />

      {deleted ? (
        <Notice tone="success" className="mb-6">
          Deleted {deleted}, with its specifications, prices, availability and media.
        </Notice>
      ) : null}
      {filters.quality ? (
        <Notice
          className="mb-6"
          title={`Showing vehicles ${QUALITY_LABELS[filters.quality].toLowerCase()}`}
        >
          <Link
            href="/admin/vehicles"
            className="text-ink-50 underline-offset-4 hover:underline"
          >
            Show all vehicles
          </Link>
        </Notice>
      ) : null}

      <form
        method="get"
        action="/admin/vehicles"
        role="search"
        aria-label="Filter vehicles"
        className="mb-6 grid grid-cols-2 gap-3 rounded-card border border-line-subtle bg-surface-1 p-4 lg:grid-cols-4 2xl:grid-cols-8 [&>*]:min-w-0"
      >
        <TextField
          name="q"
          label="Search"
          type="search"
          defaultValue={filters.q}
          placeholder="Manufacturer, model or variant"
          className="col-span-2"
        />
        <SelectField
          name="manufacturer"
          label="Manufacturer"
          defaultValue={filters.manufacturer}
          placeholder="All"
          options={manufacturers.map((maker) => ({ value: maker.id, label: maker.name }))}
        />
        <SelectField
          name="fuel"
          label="Fuel"
          defaultValue={filters.fuel}
          placeholder="All"
          options={FUEL_OPTIONS}
        />
        <SelectField
          name="status"
          label="Status"
          defaultValue={filters.status}
          placeholder="Any"
          options={[{ value: "none", label: "Not recorded" }, ...VEHICLE_STATUS_OPTIONS]}
        />
        <SelectField
          name="published"
          label="Visibility"
          defaultValue={filters.published}
          placeholder="All"
          options={[
            { value: "yes", label: "Published" },
            { value: "no", label: "Drafts" },
          ]}
        />
        <TextField
          name="year"
          label="Model year"
          inputMode="numeric"
          defaultValue={filters.year}
          placeholder="e.g. 2024"
          mono
        />
        <SelectField
          name="sort"
          label="Sort"
          defaultValue={filters.sort}
          options={[
            { value: "name", label: "Manufacturer, model" },
            { value: "year", label: "Newest first" },
          ]}
        />
        {filters.quality ? (
          <input type="hidden" name="quality" value={filters.quality} />
        ) : null}
        <div className="col-span-2 flex items-end gap-2 lg:col-span-4 2xl:col-span-8">
          <Button type="submit" size="sm" variant="secondary">
            <Search className="size-3.5" aria-hidden="true" />
            Apply
          </Button>
          {filtered ? (
            <ButtonLink href="/admin/vehicles" size="sm" variant="ghost">
              Reset
            </ButtonLink>
          ) : null}
          <p className="ml-auto text-xs text-ink-500" aria-live="polite">
            {list.error
              ? "The list could not be loaded."
              : `${formatNumber(list.total, "0")} vehicle${list.total === 1 ? "" : "s"}`}
          </p>
        </div>
      </form>

      {list.error ? (
        <Notice tone="error">
          The vehicles could not be loaded from the database. Reload to try again.
        </Notice>
      ) : list.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "No vehicles match" : "No vehicles yet"}
          description={
            filtered
              ? "Try fewer filters."
              : "Create the first vehicle to start the catalogue."
          }
          action={
            filtered ? (
              <ButtonLink href="/admin/vehicles" size="sm" variant="secondary">
                Clear filters
              </ButtonLink>
            ) : (
              <ButtonLink href="/admin/vehicles/new" size="sm">
                New vehicle
              </ButtonLink>
            )
          }
        />
      ) : (
        <TableFrame label="Vehicles" className="max-h-[calc(100dvh-8rem)]">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Vehicle
                </th>
                <th scope="col" className={TH}>
                  Years
                </th>
                <th scope="col" className={TH}>
                  Fuel
                </th>
                <th scope="col" className={TH}>
                  Status
                </th>
                <th scope="col" className={TH}>
                  Visibility
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => {
                const title = `${row.manufacturerName} ${row.modelName} ${row.name}`;
                return (
                  <tr key={row.id} className="transition-colors hover:bg-surface-2/40">
                    <td className={TD}>
                      <div className="flex items-center gap-3">
                        <VehicleThumb
                          url={row.imageUrl}
                          missing={localFileMissing(row.imageUrl)}
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/admin/vehicles/${row.id}`}
                            className="block text-ink-50 underline-offset-4 hover:underline"
                          >
                            {row.manufacturerName} {row.modelName}
                          </Link>
                          <span className="block text-xs text-ink-400">
                            {row.name}
                            {row.hasGlb ? (
                              <span className="ml-2 text-ink-500">· 3D model</span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`${TD} text-xs whitespace-nowrap text-ink-400 tabular-nums`}
                    >
                      {formatYearRange(row.yearStart, row.yearEnd)}
                    </td>
                    <td className={TD}>
                      {row.fuelType ? (
                        <Badge tone={fuelTone(row.fuelType)}>
                          {FUEL_SHORT[row.fuelType]}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`${TD} text-xs whitespace-nowrap`}>
                      {row.status ? (
                        VEHICLE_STATUS_LABELS[row.status]
                      ) : (
                        <span className="text-ink-500">Not recorded</span>
                      )}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <Badge tone={row.isPublished ? "positive" : "neutral"}>
                          {row.isPublished ? "Published" : "Draft"}
                        </Badge>
                        <InlineAction
                          action={setPublished}
                          fields={{
                            variant_id: row.id,
                            publish: row.isPublished ? "false" : "true",
                          }}
                          variant="ghost"
                          label={`${row.isPublished ? "Unpublish" : "Publish"} ${title}`}
                        >
                          {row.isPublished ? "Unpublish" : "Publish"}
                        </InlineAction>
                      </div>
                    </td>
                    <td className={`${TD} text-right whitespace-nowrap`}>
                      <div className="flex justify-end gap-1">
                        <ButtonLink
                          href={`/admin/vehicles/${row.id}`}
                          size="sm"
                          variant="secondary"
                          aria-label={`Edit ${title}`}
                        >
                          Edit
                        </ButtonLink>
                        {row.isPublished && row.publicPath ? (
                          <ButtonLink
                            href={row.publicPath}
                            size="sm"
                            variant="ghost"
                            aria-label={`View ${title} on the public site`}
                          >
                            View
                          </ButtonLink>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableFrame>
      )}

      <AdminPagination
        basePath="/admin/vehicles"
        params={params}
        page={list.page}
        pageCount={list.pageCount}
      />
    </>
  );
}
