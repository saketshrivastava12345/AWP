import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdminPageHeader,
  Notice,
  TableFrame,
  TD,
  TD_NUM,
  TH,
} from "@/components/admin/AdminChrome";
import { SelectField, TextField } from "@/components/admin/fields";
import { BODY_LABELS, ENGINE_POSITION_LABELS } from "@/lib/admin/labels";
import { adminPage, param } from "@/lib/admin/page";
import { listAdminModels } from "@/lib/queries/admin";
import { formatYearRange } from "@/lib/format";

export const metadata: Metadata = { title: "Models" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function AdminModelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const search = await searchParams;
  const q = param(search, "q").toLowerCase().slice(0, 80);
  const manufacturer = param(search, "manufacturer");
  const filter =
    param(search, "filter") === "no-engine-position" ? "no-engine-position" : "";
  const { rows, error } = await listAdminModels(supabase);

  const manufacturers = [
    ...new Map(rows.map((row) => [row.manufacturerId, row.manufacturerName])).entries(),
  ]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const shown = rows.filter(
    (row) =>
      (!q ||
        `${row.manufacturerName} ${row.name} ${row.generation ?? ""}`
          .toLowerCase()
          .includes(q)) &&
      (!manufacturer || row.manufacturerId === manufacturer) &&
      (!filter || (row.combustion && row.enginePosition === null)),
  );
  const filtered = Boolean(q || manufacturer || filter);

  return (
    <>
      <AdminPageHeader
        title="Models"
        crumbs={[{ label: "Models" }]}
        description="Nameplates and their generations, paint colours and model-level photographs. Variants are edited under Vehicles."
        actions={
          <ButtonLink href="/admin/vehicles/new" size="sm">
            New vehicle or model
          </ButtonLink>
        }
      />
      {filter ? (
        <Notice className="mb-6" title="Combustion models without an engine position">
          The 3D viewer draws no engine for these rather than guessing where it sits.
          Record the position from the maker&apos;s documentation.{" "}
          <Link
            href="/admin/models"
            className="text-ink-50 underline-offset-4 hover:underline"
          >
            Show all models
          </Link>
        </Notice>
      ) : null}

      <form
        method="get"
        role="search"
        aria-label="Filter models"
        className="mb-6 grid gap-3 rounded-card border border-line-subtle bg-surface-1 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]"
      >
        <TextField
          name="q"
          label="Search"
          type="search"
          defaultValue={q}
          placeholder="Manufacturer, model or generation"
        />
        <SelectField
          name="manufacturer"
          label="Manufacturer"
          placeholder="All"
          defaultValue={manufacturer}
          options={manufacturers}
        />
        {filter ? <input type="hidden" name="filter" value={filter} /> : null}
        <div className="flex items-end gap-2">
          <Button type="submit" size="sm" variant="secondary">
            <Search className="size-3.5" aria-hidden="true" />
            Apply
          </Button>
          {filtered ? (
            <ButtonLink href="/admin/models" size="sm" variant="ghost">
              Reset
            </ButtonLink>
          ) : null}
        </div>
      </form>

      {error ? (
        <Notice tone="error">Models could not be loaded.</Notice>
      ) : shown.length === 0 ? (
        <EmptyState title="No models match" description="Try another search." />
      ) : (
        <TableFrame label="Models" className="max-h-[calc(100dvh-8rem)]">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Model
                </th>
                <th scope="col" className={TH}>
                  Category · body
                </th>
                <th scope="col" className={TH}>
                  Engine position
                </th>
                <th scope="col" className={TH}>
                  Production
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Variants
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Colours
                </th>
                <th scope="col" className={`${TH} text-right`}>
                  Photos
                </th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="hover:bg-surface-2/40">
                  <td className={TD}>
                    <Link
                      href={`/admin/models/${row.id}`}
                      className="block text-ink-50 underline-offset-4 hover:underline"
                    >
                      {row.manufacturerName} {row.name}
                    </Link>
                    <span className="text-xs text-ink-500">
                      {row.generation
                        ? `Generation ${row.generation}`
                        : "No generation recorded"}
                    </span>
                  </td>
                  <td className={`${TD} text-xs`}>
                    {row.categoryName} · {BODY_LABELS[row.bodyType]}
                  </td>
                  <td className={`${TD} text-xs`}>
                    {row.enginePosition ? (
                      ENGINE_POSITION_LABELS[row.enginePosition].split(" (")[0]
                    ) : row.combustion ? (
                      <Badge tone="hybrid">Not recorded</Badge>
                    ) : (
                      <span className="text-ink-500">No engine (electric)</span>
                    )}
                  </td>
                  <td
                    className={`${TD} text-xs whitespace-nowrap text-ink-400 tabular-nums`}
                  >
                    {row.productionStart
                      ? formatYearRange(row.productionStart, row.productionEnd)
                      : "—"}
                  </td>
                  <td className={TD_NUM}>{row.variantCount}</td>
                  <td className={TD_NUM}>{row.colorCount}</td>
                  <td className={TD_NUM}>{row.imageCount}</td>
                  <td className={`${TD} text-right`}>
                    <div className="flex justify-end gap-1">
                      <ButtonLink
                        href={`/admin/models/${row.id}`}
                        size="sm"
                        variant="secondary"
                        aria-label={`Edit ${row.manufacturerName} ${row.name}`}
                      >
                        Edit
                      </ButtonLink>
                      <ButtonLink
                        href={`/admin/models/${row.id}/colors`}
                        size="sm"
                        variant="ghost"
                        aria-label={`Colours of the ${row.manufacturerName} ${row.name}`}
                      >
                        Colours
                      </ButtonLink>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableFrame>
      )}
      <p className="mt-3 text-xs text-ink-500">
        {shown.length} of {rows.length} models
      </p>
    </>
  );
}
