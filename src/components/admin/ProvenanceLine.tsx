import { ExternalLink } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  provenanceStatus,
  STATUS_LABELS,
  type ProvenanceStatus,
} from "@/lib/admin/provenance";
import { daysSince, STALE_AFTER_DAYS } from "@/lib/pricing/engine";
import { formatDate } from "@/lib/format";

export const STATUS_TONES: Record<ProvenanceStatus, BadgeTone> = {
  verified: "positive",
  sourced: "gold",
  unsourced: "negative",
};

export function ProvenanceBadge({ status }: { status: ProvenanceStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

/** Hostname for a compact link label ("porsche.com"). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Where a section's figures come from and when they were last checked. */
export function ProvenanceLine({
  source,
  sourceUrl,
  lastVerified,
}: {
  source: string | null;
  sourceUrl: string | null;
  lastVerified: string | null;
}) {
  const status = provenanceStatus(source, lastVerified);
  const age = lastVerified ? daysSince(lastVerified) : null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <ProvenanceBadge status={status} />
      <p className="text-ink-200">
        {source ?? <span className="text-ink-500">No source recorded</span>}
      </p>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs break-all text-gold-300 hover:text-gold-200"
        >
          {hostOf(sourceUrl)}
          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
      <p className="text-xs text-ink-500">
        {lastVerified ? (
          <>
            Last verified {formatDate(lastVerified)}
            {age !== null
              ? ` · ${age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`}`
              : null}
            {age !== null && age > STALE_AFTER_DAYS ? " · due for a re-check" : null}
          </>
        ) : (
          "Never verified"
        )}
      </p>
    </div>
  );
}
