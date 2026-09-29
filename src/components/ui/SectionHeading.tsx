import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";
import { ScrambleText } from "@/components/fx/ScrambleText";

/**
 * The standard section header: an optional mono eyebrow (cyan, with a lit
 * tick and an optional decorative index code), a sentence-case title that
 * can "decode" into place (`scramble`, string titles only), an optional lead
 * sentence and a trailing action.
 *
 * `action` takes any node; for the common "See all →" case pass `actionHref`
 * and `actionLabel` instead and it renders a `ButtonLink variant="link"`.
 * No numbered prefixes ("01 ——") and no second label under the title.
 */
export function SectionHeading({
  overline,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  as: Heading = "h2",
  id,
  scramble = false,
  code,
  className,
}: {
  /** Eyebrow above the title. At most one per section, never gold. */
  overline?: string;
  title: ReactNode;
  /** One lead sentence, capped at 60ch. */
  description?: ReactNode;
  action?: ReactNode;
  /** With `actionLabel`: renders a link-variant button as the action. */
  actionHref?: string;
  actionLabel?: string;
  /** The heading level, for a heading hierarchy without skips. */
  as?: "h2" | "h3";
  /** id on the heading, for a section's aria-labelledby. */
  id?: string;
  /** Decode the title from random glyphs when it first scrolls into view. */
  scramble?: boolean;
  /** Decorative index shown after the eyebrow, e.g. "01" (aria-hidden). */
  code?: string;
  className?: string;
}) {
  const trailing =
    action ??
    (actionHref && actionLabel ? (
      <ButtonLink href={actionHref} variant="link">
        {actionLabel}
      </ButtonLink>
    ) : null);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="max-w-3xl min-w-0">
        {overline ? (
          <p className="mb-4 flex items-center gap-3 text-eyebrow">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
            />
            <span className="min-w-0">{overline}</span>
            {code ? (
              <span aria-hidden="true" className="hud-label text-ink-600">
                {"// "}
                {code}
              </span>
            ) : null}
          </p>
        ) : null}
        <Heading id={id} className={Heading === "h3" ? "text-h3" : "text-h2"}>
          {scramble && typeof title === "string" ? <ScrambleText text={title} /> : title}
        </Heading>
        {description ? (
          <p className="mt-4 max-w-[60ch] text-lead">{description}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
