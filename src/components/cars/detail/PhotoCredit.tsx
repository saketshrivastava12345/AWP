import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryCredit } from "@/lib/detail/gallery";

/**
 * The visible attribution under a photograph: author, licence (linked to its
 * deed when it is a Creative Commons licence) and where it was published
 * (linked when a source URL is recorded). CC BY and CC BY-SA require exactly
 * this, so it is never hidden behind a hover.
 *
 * Shared by the server gallery and the client lightbox; no hooks.
 */
export function PhotoCredit({
  credit,
  className,
  tone = "muted",
}: {
  credit: GalleryCredit | null;
  className?: string;
  tone?: "muted" | "bright";
}) {
  const link =
    "inline-flex items-center gap-1 underline decoration-line-strong underline-offset-2 transition-colors hover:text-gold-300 hover:decoration-gold-600";
  const base = cn(
    "flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-micro leading-relaxed",
    tone === "bright" ? "text-ink-300" : "text-ink-500",
    className,
  );

  if (!credit) {
    return <p className={base}>No credit recorded for this photograph.</p>;
  }

  if (credit.text && !credit.author && !credit.license) {
    return (
      <p className={base}>
        <span className="text-hud text-ink-600">Credit</span>
        <span>{credit.text}</span>
      </p>
    );
  }

  return (
    <p className={base}>
      <span className="text-hud text-ink-600">Credit</span>
      {credit.author ? (
        <span className={tone === "bright" ? "text-ink-100" : "text-ink-300"}>
          {credit.author}
        </span>
      ) : null}
      {credit.license ? (
        <>
          <span aria-hidden="true" className="text-ink-600">
            ·
          </span>
          {credit.licenseUrl ? (
            <a
              href={credit.licenseUrl}
              target="_blank"
              rel="noopener noreferrer license"
              className={link}
            >
              {credit.license}
              <span className="sr-only"> (licence, opens in a new tab)</span>
            </a>
          ) : (
            <span>{credit.license}</span>
          )}
        </>
      ) : null}
      {credit.sourceName || credit.sourceUrl ? (
        <>
          <span aria-hidden="true" className="text-ink-600">
            ·
          </span>
          {credit.sourceUrl ? (
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={link}
            >
              {credit.sourceName ?? "Source"}
              <ExternalLink className="size-2.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <span>{credit.sourceName}</span>
          )}
        </>
      ) : null}
    </p>
  );
}
