import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/Button";

/**
 * The standard section header: an optional eyebrow, a sentence-case title,
 * an optional lead sentence and a trailing action.
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
        {overline ? <p className="mb-3 text-eyebrow">{overline}</p> : null}
        <Heading id={id} className={Heading === "h3" ? "text-h3" : "text-h2"}>
          {title}
        </Heading>
        {description ? (
          <p className="mt-4 max-w-[60ch] text-lead">{description}</p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
