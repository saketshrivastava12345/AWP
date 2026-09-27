import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The heading a block inside a car-page chapter opens with: a sentence-case
 * title, an optional one-line caption beside it (a count, a population) and
 * an optional supporting sentence below. A lit cyan tick marks it as a data
 * block of the cockpit.
 *
 * Blocks sit inside the page's chapters, so the default level is h3; a block
 * used on its own at the top of a chapter can pass `level={2}`.
 */
export function DetailHeading({
  id,
  title,
  note,
  description,
  level = 3,
  className,
}: {
  /** id of the heading element, for aria-labelledby. */
  id: string;
  title: ReactNode;
  /** A short caption, e.g. "Against 51 catalogued cars". */
  note?: ReactNode;
  description?: ReactNode;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("max-w-3xl", className)}>
      <span
        aria-hidden="true"
        className="mb-3 block h-0.5 w-6 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
      />
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Heading id={id} className={level === 2 ? "text-h2" : "text-h3"}>
          {title}
        </Heading>
        {note ? (
          <p className="font-mono text-[11px] tracking-hud text-cyan-200/80 uppercase">
            {note}
          </p>
        ) : null}
      </div>
      {description ? (
        <p className="mt-3 max-w-[64ch] text-body-s text-ink-300">{description}</p>
      ) : null}
    </div>
  );
}
