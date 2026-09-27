import Link from "next/link";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import {
  AdminPageHeader,
  Notice,
  TableFrame,
  TD,
  TD_NUM,
  TH,
} from "@/components/admin/AdminChrome";
import { adminPage } from "@/lib/admin/page";
import { EM_DASH } from "@/lib/format";
import { SECTION_SCHEMAS } from "@/lib/admin/sections";
import { getProvenanceOverview } from "@/lib/queries/admin";
import type { ProvenanceSection } from "@/lib/admin/provenance";

export const metadata: Metadata = { title: "Data sources" };

const sectionTitle = (section: ProvenanceSection) =>
  section === "variant" ? "Vehicle" : SECTION_SCHEMAS[section].title;

export default async function AdminSourcesPage() {
  const { supabase } = await adminPage();
  const overview = await getProvenanceOverview(supabase);

  const totals = (overview ?? []).reduce(
    (acc, entry) => ({
      figures: acc.figures + entry.summary.total,
      verified: acc.verified + entry.summary.verified,
      unsourced: acc.unsourced + entry.summary.unsourced,
    }),
    { figures: 0, verified: 0, unsourced: 0 },
  );

  return (
    <>
      <AdminPageHeader
        title="Data sources"
        crumbs={[{ label: "Data sources" }]}
        description="How well each vehicle's figures are sourced, least verified first. A figure is verified when its section names a source and an editor has recorded when it was last checked against it."
      />
      {overview === null ? (
        <Notice tone="error">Provenance could not be loaded.</Notice>
      ) : (
        <>
          <p className="mb-4 text-sm text-ink-300">
            {totals.verified} of {totals.figures} recorded figures are verified;{" "}
            <span className={totals.unsourced ? "text-signal-negative" : ""}>
              {totals.unsourced} have no source
            </span>
            .
          </p>
          <TableFrame
            label="Vehicles by verification"
            className="max-h-[calc(100dvh-8rem)]"
          >
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Vehicle
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Figures
                  </th>
                  <th scope="col" className={TH}>
                    Verified
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Source only
                  </th>
                  <th scope="col" className={`${TH} text-right`}>
                    Unsourced
                  </th>
                  <th scope="col" className={TH}>
                    Sections without a source
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {overview.map((entry) => {
                  const share = entry.summary.verifiedShare;
                  return (
                    <tr key={entry.id} className="hover:bg-surface-2/40">
                      <td className={TD}>
                        <Link
                          href={`/admin/vehicles/${entry.id}/sources`}
                          className="text-ink-50 hover:text-gold-300"
                        >
                          {entry.title}
                        </Link>
                        {!entry.isPublished ? (
                          <Badge className="ml-2">Draft</Badge>
                        ) : null}
                      </td>
                      <td className={TD_NUM}>{entry.summary.total}</td>
                      <td className={TD}>
                        {share === null ? (
                          <span
                            className="font-mono text-xs text-ink-400"
                            aria-label="No figures recorded"
                            title="No figures recorded"
                          >
                            {EM_DASH}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-1 w-24 overflow-hidden rounded-full bg-surface-3"
                              role="img"
                              aria-label={`${Math.round(share * 100)}% verified`}
                            >
                              <div
                                className="h-full bg-signal-positive"
                                style={{ width: `${share * 100}%` }}
                              />
                            </div>
                            <span className="tabular font-mono text-xs text-ink-300">
                              {entry.summary.verified} · {Math.round(share * 100)}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className={TD_NUM}>{entry.summary.sourced}</td>
                      <td
                        className={`${TD_NUM} ${entry.summary.unsourced ? "text-signal-negative" : ""}`}
                      >
                        {entry.summary.unsourced}
                      </td>
                      <td className={`${TD} text-xs`}>
                        {entry.unsourcedSections.length ? (
                          entry.unsourcedSections.map(sectionTitle).join(", ")
                        ) : (
                          <span className="text-ink-500">—</span>
                        )}
                      </td>
                      <td className={`${TD} text-right`}>
                        <Link
                          href={`/admin/vehicles/${entry.id}/sources`}
                          className="text-xs whitespace-nowrap text-gold-300 hover:text-gold-200"
                        >
                          Provenance
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableFrame>
        </>
      )}
    </>
  );
}
