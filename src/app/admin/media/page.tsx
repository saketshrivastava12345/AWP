import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import {
  AdminPageHeader,
  Notice,
  Panel,
  TableFrame,
  TD,
  TD_NUM,
  TH,
} from "@/components/admin/AdminChrome";
import { VehicleFinder } from "@/components/admin/VehicleFinder";
import { VehicleThumb } from "@/components/admin/VehicleThumb";
import { formatBytes } from "@/lib/admin/files";
import { localFileMissing } from "@/lib/admin/local-files";
import { adminPage, param } from "@/lib/admin/page";
import {
  getMediaOverview,
  getVariantLabels,
  type MediaOverviewRow,
} from "@/lib/queries/admin";
import { formatDate, formatNumber, formatYearRange } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Media" };

type View = "attention" | "photos" | "models";

function missingProvenance(row: MediaOverviewRow): string[] {
  return [
    !row.source && "source",
    !row.source_url && "source URL",
    !row.license && "licence",
    !row.author && "author",
  ].filter((value): value is string => Boolean(value));
}

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const search = await searchParams;
  const viewParam = param(search, "view");
  const view: View =
    viewParam === "photos" || viewParam === "models" ? viewParam : "attention";
  const labels = await getVariantLabels(supabase);
  const { rows, error } = await getMediaOverview(
    supabase,
    new Map(labels.map((label) => [label.id, label])),
  );

  const photos = rows.filter((row) => row.type === "image");
  const models = rows.filter((row) => row.type === "glb");
  const withIssues = rows
    .map((row) => ({
      row,
      fileMissing: localFileMissing(row.url),
      missing: missingProvenance(row),
    }))
    .filter((entry) => entry.fileMissing || entry.missing.length > 0);
  const filesMissing = withIssues.filter((entry) => entry.fileMissing).length;
  const provenanceMissing = withIssues.filter((entry) => entry.missing.length > 0).length;

  const tabs: { value: View; label: string; count: number }[] = [
    { value: "attention", label: "Needs attention", count: withIssues.length },
    { value: "photos", label: "Photographs", count: photos.length },
    { value: "models", label: "3D models", count: models.length },
  ];

  return (
    <>
      <AdminPageHeader
        title="Media"
        crumbs={[{ label: "Media" }]}
        description="Photographs and 3D models, each with its source, licence and author. Upload from a vehicle's (or model's) Media tab."
      />

      <div className="grid gap-8 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="grid max-w-5xl gap-6 md:grid-cols-2 2xl:max-w-none 2xl:grid-cols-1 2xl:content-start">
          <Panel title="Open a vehicle's media">
            <VehicleFinder
              section="/media"
              vehicles={labels.map((label) => ({
                id: label.id,
                title: label.title,
                years: formatYearRange(label.yearStart, label.yearEnd),
                isPublished: label.isPublished,
              }))}
            />
            <p className="mt-3 text-xs text-ink-500">
              Model-wide photographs live on each{" "}
              <Link
                href="/admin/models"
                className="text-ink-50 underline-offset-4 hover:underline"
              >
                model
              </Link>
              .
            </p>
          </Panel>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line-subtle bg-line-subtle">
            {(
              [
                ["Photographs", photos.length],
                ["3D models", models.length],
                ["Files missing", filesMissing],
                ["Provenance gaps", provenanceMissing],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-surface-1 px-4 py-3">
                <dt className="text-caption">{label}</dt>
                <dd className="mt-1 text-figure text-ink-50">
                  {formatNumber(value, "0")}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <section aria-label="Media list" className="min-w-0">
          <nav aria-label="Media views" className="mb-4">
            <ul className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <li key={tab.value}>
                  <Link
                    href={
                      tab.value === "attention"
                        ? "/admin/media"
                        : `/admin/media?view=${tab.value}`
                    }
                    aria-current={view === tab.value ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-pill border px-4 text-body-s transition-colors duration-(--duration-fast)",
                      view === tab.value
                        ? "border-line-strong bg-surface-2 text-ink-50"
                        : "border-line-subtle text-ink-300 hover:text-ink-50",
                    )}
                  >
                    {tab.label}
                    <span className="text-caption tabular-nums">{tab.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {error ? <Notice tone="error">Media could not be loaded.</Notice> : null}

          {view === "attention" ? (
            withIssues.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
                Every file exists and every record names its source, licence and author.
              </p>
            ) : (
              <TableFrame label="Media that needs attention">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>
                        File
                      </th>
                      <th scope="col" className={TH}>
                        Belongs to
                      </th>
                      <th scope="col" className={TH}>
                        Problem
                      </th>
                      <th scope="col" className={TH}>
                        <span className="sr-only">Fix</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withIssues.map(({ row, fileMissing, missing }) => (
                      <tr key={row.id}>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            {row.type === "image" ? (
                              <VehicleThumb url={row.url} missing={fileMissing} />
                            ) : (
                              <Badge>GLB</Badge>
                            )}
                            <span className="max-w-56 truncate font-mono text-xs text-ink-400">
                              {row.url}
                            </span>
                          </div>
                        </td>
                        <td className={`${TD} text-sm`}>{row.ownerTitle}</td>
                        <td className={`${TD} text-xs`}>
                          <div className="flex flex-wrap gap-1">
                            {fileMissing ? (
                              <Badge tone="negative" className="whitespace-nowrap">
                                File missing
                              </Badge>
                            ) : null}
                            {missing.length ? (
                              <Badge tone="hybrid" className="whitespace-nowrap">
                                No {missing.join(", ")}
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className={`${TD} text-right`}>
                          <Link
                            href={row.ownerHref}
                            className="text-body-s whitespace-nowrap text-ink-50 underline-offset-4 hover:underline"
                          >
                            Open media
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            )
          ) : null}

          {view === "photos" ? (
            photos.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
                No photographs yet.
              </p>
            ) : (
              <TableFrame label="Photographs">
                <table className="w-full min-w-[820px] border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>
                        Photograph
                      </th>
                      <th scope="col" className={TH}>
                        Belongs to
                      </th>
                      <th scope="col" className={TH}>
                        Licence · author
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Size
                      </th>
                      <th scope="col" className={TH}>
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {photos.map((row) => (
                      <tr key={row.id}>
                        <td className={TD}>
                          <div className="flex items-center gap-3">
                            <VehicleThumb
                              url={row.url}
                              missing={localFileMissing(row.url)}
                            />
                            {row.is_primary ? <Badge>Primary</Badge> : null}
                          </div>
                        </td>
                        <td className={TD}>
                          <Link
                            href={row.ownerHref}
                            className="text-ink-50 underline-offset-4 hover:underline"
                          >
                            {row.ownerTitle}
                          </Link>
                        </td>
                        <td className={`${TD} text-xs`}>
                          {row.license ?? (
                            <span className="text-signal-negative">No licence</span>
                          )}{" "}
                          ·{" "}
                          {row.author ?? (
                            <span className="text-signal-negative">no author</span>
                          )}
                        </td>
                        <td className={TD_NUM}>
                          {row.width && row.height ? `${row.width}×${row.height}` : "—"}
                          <span className="block text-ink-500">
                            {formatBytes(row.file_size_bytes)}
                          </span>
                        </td>
                        <td
                          className={`${TD} text-xs whitespace-nowrap text-ink-400 tabular-nums`}
                        >
                          {formatDate(row.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            )
          ) : null}

          {view === "models" ? (
            models.length === 0 ? (
              <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
                No 3D models yet. Vehicles use the procedural model built from their
                published dimensions.
              </p>
            ) : (
              <TableFrame label="3D models">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>
                        Vehicle
                      </th>
                      <th scope="col" className={TH}>
                        Fidelity
                      </th>
                      <th scope="col" className={`${TH} text-right`}>
                        Size
                      </th>
                      <th scope="col" className={TH}>
                        Compression
                      </th>
                      <th scope="col" className={TH}>
                        Credit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((row) => (
                      <tr key={row.id}>
                        <td className={TD}>
                          <Link
                            href={row.ownerHref}
                            className="text-ink-50 underline-offset-4 hover:underline"
                          >
                            {row.ownerTitle}
                          </Link>
                        </td>
                        <td className={TD}>
                          {row.is_exact_model ? (
                            <Badge tone="gold">Exact vehicle</Badge>
                          ) : (
                            <Badge>Representation</Badge>
                          )}
                        </td>
                        <td className={TD_NUM}>{formatBytes(row.file_size_bytes)}</td>
                        <td className={`${TD} font-mono text-xs`}>
                          {row.compression.length ? row.compression.join(", ") : "None"}
                        </td>
                        <td className={`${TD} max-w-64 truncate text-xs`}>
                          {row.credit ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableFrame>
            )
          ) : null}
        </section>
      </div>
    </>
  );
}
