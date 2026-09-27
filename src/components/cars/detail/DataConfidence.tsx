import { ExternalLink } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import {
  buildProvenance,
  PROVENANCE_DESCRIPTIONS,
  PROVENANCE_LABELS,
  summarizeProvenance,
  type ProvenanceStatus,
} from "@/lib/detail/provenance";
import type { VariantDetail } from "@/types/domain";
import { DetailHeading } from "./DetailHeading";

/**
 * Data provenance: for each block of this car's data, whether it is sourced
 * and verified, straight from the `source`, `source_url` and
 * `last_verified_at` columns (lib/detail/provenance.ts).
 *
 * Props:
 *   detail        the variant
 *   headingLevel  default 3
 *
 * Only blocks the car has a row for are listed (an EV has no fuel row). A
 * source link opens in a new tab with rel="noopener noreferrer"; only http(s)
 * URLs are ever linked.
 */
export function DataConfidence({
  detail,
  headingLevel = 3,
  className,
}: {
  detail: VariantDetail;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const sections = buildProvenance(detail);
  const summary = summarizeProvenance(sections);
  const headingId = "data-provenance-heading";

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title="Data provenance"
        note={`${summary.sourced} of ${summary.total} sourced · ${summary.verified} verified`}
        description="Where each block of figures on this page comes from. A figure that is not published stays empty rather than estimated, so a block can be sourced and still have gaps."
      />

      <div className="mt-8 border-t border-line">
        <div aria-hidden="true" className={cn(COLUMNS, "hidden py-3 text-caption md:grid")}>
          <span>Block</span>
          <span>Status</span>
          <span>Source</span>
          <span>Verified</span>
          <span />
        </div>
        <ul className="divide-y divide-line-subtle border-b border-line-subtle md:border-t md:border-line-subtle">
          {sections.map((section) => (
            <li
              key={section.id}
              className={cn(
                COLUMNS,
                "grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 py-4",
              )}
            >
              <p>
                <span className="block text-body-s text-ink-100">{section.label}</span>
                <span className="mt-0.5 block font-mono text-xs text-ink-500">
                  {section.table}
                </span>
              </p>
              <p className="justify-self-end md:justify-self-start">
                <StatusBadge status={section.status} />
              </p>
              <p className="col-span-2 text-body-s text-ink-300 md:col-span-1">
                <span className="text-ink-400 md:sr-only">Source: </span>
                {section.source ?? <span className="text-ink-400">Not recorded</span>}
              </p>
              <p className="text-body-s text-ink-300 tabular-nums">
                <span className="text-ink-400 md:sr-only">Verified: </span>
                {section.verifiedAt ? (
                  <time dateTime={section.verifiedAt}>
                    {formatDate(section.verifiedAt)}
                  </time>
                ) : (
                  <>
                    <span aria-hidden="true" className="text-ink-400">
                      —
                    </span>
                    <span className="sr-only">not recorded</span>
                  </>
                )}
              </p>
              <p className="justify-self-end">
                {section.sourceUrl ? (
                  <a
                    href={section.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-3 inline-flex min-h-11 items-center gap-1.5 text-body-s text-ink-200 transition-colors hover:text-ink-50"
                  >
                    View source
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    <span className="sr-only">
                      {" "}
                      for {section.label.toLowerCase()} (opens in a new tab)
                    </span>
                  </a>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <dl className="mt-6 grid gap-3 text-caption md:grid-cols-3 md:gap-8">
        {(["verified", "source-recorded", "unsourced"] as const).map((status) => (
          <div key={status} className="flex items-start gap-3">
            <dt className="shrink-0">
              <StatusBadge status={status} />
            </dt>
            <dd>{PROVENANCE_DESCRIPTIONS[status]}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** One grid for the header and every row, from md up. */
const COLUMNS =
  "md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1.5fr)_7rem_7.5rem] md:gap-x-6";

const STATUS_TONES: Record<ProvenanceStatus, BadgeTone> = {
  verified: "positive",
  "source-recorded": "neutral",
  unsourced: "neutral",
};

function StatusBadge({ status }: { status: ProvenanceStatus }) {
  return (
    <Badge
      tone={STATUS_TONES[status]}
      className={cn(status === "unsourced" && "border-dashed text-ink-400")}
    >
      {PROVENANCE_LABELS[status]}
    </Badge>
  );
}
