import { BadgeCheck, CircleDashed, ExternalLink, FileText } from "lucide-react";
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
        eyebrow="Data confidence"
        title="Data provenance"
        meta={`${summary.sourced} / ${summary.total} sourced · ${summary.verified} verified`}
      />

      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-ink-400">
        Where each block of figures on this page comes from. A figure that is not
        published stays empty rather than estimated, so a block can be sourced and still
        have gaps.
      </p>

      <div className="mt-6 overflow-hidden rounded-xs border border-line">
        <div
          aria-hidden="true"
          className={cn(
            COLUMNS,
            "hidden bg-surface-1/80 px-5 py-3 text-hud text-ink-500 md:grid",
          )}
        >
          <span>Block</span>
          <span>Status</span>
          <span>Source</span>
          <span>Verified</span>
          <span />
        </div>
        <ul className="divide-y divide-line-subtle md:border-t md:border-line-subtle">
          {sections.map((section) => (
            <li
              key={section.id}
              className={cn(
                COLUMNS,
                "grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 bg-surface-1/40 px-5 py-4",
              )}
            >
              <p>
                <span className="block text-sm text-ink-100">{section.label}</span>
                <span className="mt-0.5 block font-mono text-micro text-ink-600">
                  {section.table}
                </span>
              </p>
              <p className="justify-self-end md:justify-self-start">
                <StatusChip status={section.status} />
              </p>
              <p className="col-span-2 text-sm text-ink-300 md:col-span-1">
                <span className="text-hud text-ink-600 md:sr-only">Source · </span>
                {section.source ?? (
                  <span className="text-ink-500 italic">Not recorded</span>
                )}
              </p>
              <p className="font-mono text-xs text-ink-400 tabular-nums md:pt-0.5">
                <span className="text-hud font-sans text-ink-600 md:sr-only">
                  Verified ·{" "}
                </span>
                {section.verifiedAt ? (
                  <time dateTime={section.verifiedAt}>
                    {formatDate(section.verifiedAt)}
                  </time>
                ) : (
                  <>
                    <span aria-hidden="true" className="text-ink-500">
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
                    className="-my-3 inline-flex min-h-11 items-center gap-1.5 font-display text-[9px] tracking-[0.18em] text-ink-300 uppercase transition-colors hover:text-gold-300"
                  >
                    View source
                    <ExternalLink className="size-3" aria-hidden="true" />
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

      <dl className="mt-5 grid gap-3 text-xs leading-relaxed text-ink-500 md:grid-cols-3 md:gap-6">
        {(["verified", "source-recorded", "unsourced"] as const).map((status) => (
          <div key={status} className="flex gap-3">
            <dt className="shrink-0">
              <StatusChip status={status} />
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

function StatusChip({ status }: { status: ProvenanceStatus }) {
  const Icon =
    status === "verified"
      ? BadgeCheck
      : status === "source-recorded"
        ? FileText
        : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xs border px-2 py-1 font-mono text-nano tracking-hud whitespace-nowrap uppercase",
        status === "verified" && "border-signal-positive/40 text-signal-positive",
        status === "source-recorded" && "border-line-strong text-ink-200",
        status === "unsourced" && "border-dashed border-line-strong text-ink-500",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {PROVENANCE_LABELS[status]}
    </span>
  );
}
