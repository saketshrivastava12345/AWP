import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import { ProvenanceBadge, hostOf } from "@/components/admin/ProvenanceLine";
import { adminPage, routeId } from "@/lib/admin/page";
import {
  buildProvenanceRows,
  sectionHref,
  STATUS_LABELS,
  summarizeProvenance,
} from "@/lib/admin/provenance";
import { getAdminVehicle } from "@/lib/queries/admin";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Data sources" };

export default async function VehicleSourcesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const vehicle = await getAdminVehicle(supabase, id);
  if (!vehicle) notFound();

  const rows = buildProvenanceRows({
    variant: vehicle.variant,
    performance: vehicle.performance,
    dimensions: vehicle.dimensions,
    engine: vehicle.engine,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    ev: vehicle.ev,
  });
  const summary = summarizeProvenance(rows);

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
        {(
          [
            ["Figures recorded", summary.total, "text-ink-50"],
            [STATUS_LABELS.verified, summary.verified, "text-signal-positive"],
            [STATUS_LABELS.sourced, summary.sourced, "text-gold-300"],
            [STATUS_LABELS.unsourced, summary.unsourced, "text-signal-negative"],
          ] as const
        ).map(([label, value, tone]) => (
          <div key={label} className="bg-surface-1 px-4 py-4">
            <dt className="text-label">{label}</dt>
            <dd className={cn("tabular mt-2 font-display text-xl", tone)}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-3xl text-xs leading-relaxed text-ink-500">
        Verified: a source and the date an editor last checked it. Source recorded: a
        source, never re-checked. Unsourced: no source at all. Sources are recorded per
        section, so each figure inherits its section&apos;s. Empty figures are not listed
        — they are shown as “Not available” publicly.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-line px-5 py-8 text-sm text-ink-400">
          No figures recorded yet.
        </p>
      ) : (
        <TableFrame label="Provenance of every recorded figure">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                <th scope="col" className={TH}>
                  Data field
                </th>
                <th scope="col" className={TH}>
                  Value
                </th>
                <th scope="col" className={TH}>
                  Source
                </th>
                <th scope="col" className={TH}>
                  Source URL
                </th>
                <th scope="col" className={TH}>
                  Last verified
                </th>
                <th scope="col" className={TH}>
                  Status
                </th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Edit</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const firstOfSection =
                  index === 0 || rows[index - 1]?.section !== row.section;
                return (
                  <tr
                    key={`${row.section}.${row.field}`}
                    className={cn(firstOfSection && index > 0 && "border-t border-line")}
                  >
                    <td className={TD}>
                      <span className="block text-ink-100">{row.label}</span>
                      <span className="text-xs text-ink-500">{row.sectionTitle}</span>
                    </td>
                    <td className={`${TD} font-mono text-xs`}>{row.value}</td>
                    <td className={`${TD} max-w-64 text-xs`}>
                      {row.source ?? <span className="text-ink-500">—</span>}
                    </td>
                    <td className={`${TD} text-xs`}>
                      {row.sourceUrl ? (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-gold-300 hover:text-gold-200"
                        >
                          {hostOf(row.sourceUrl)}
                          <ExternalLink className="size-3" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ) : (
                        <span className="text-ink-500">—</span>
                      )}
                    </td>
                    <td className={`${TD} font-mono text-xs whitespace-nowrap`}>
                      {formatDate(row.lastVerified, "Never")}
                    </td>
                    <td className={TD}>
                      <ProvenanceBadge status={row.status} />
                    </td>
                    <td className={`${TD} text-right`}>
                      {firstOfSection ? (
                        <Link
                          href={sectionHref(id, row.section)}
                          className="text-xs whitespace-nowrap text-gold-300 hover:text-gold-200"
                        >
                          Edit {row.sectionTitle.toLowerCase()}
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableFrame>
      )}
    </div>
  );
}
