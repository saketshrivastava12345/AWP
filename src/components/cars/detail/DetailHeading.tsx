import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The heading a block inside a car-page chapter opens with: a sentence-case
 * title, an optional one-line caption beside it (a count, a population) and
 * an optional supporting sentence below.
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
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <Heading id={id} className={level === 2 ? "text-h2" : "text-h3"}>
          {title}
        </Heading>
        {note ? <p className="text-caption">{note}</p> : null}
      </div>
      {description ? (
        <p className="mt-3 max-w-[64ch] text-body-s text-ink-300">{description}</p>
      ) : null}
    </div>
  );
}
