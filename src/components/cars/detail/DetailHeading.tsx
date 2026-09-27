import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The heading every detail-page block opens with: a mono eyebrow, a display
 * title and an optional right-aligned technical reference, over a hairline.
 *
 * Blocks sit inside the page's chapters, so the default level is h3; a block
 * used on its own at the top of a chapter can pass `level={2}`.
 */
export function DetailHeading({
  id,
  eyebrow,
  title,
  meta,
  description,
  level = 3,
  className,
}: {
  /** id of the heading element, for aria-labelledby. */
  id: string;
  eyebrow?: string;
  title: ReactNode;
  /** Short technical reference shown at the right, e.g. "SRC · performance_specs". */
  meta?: ReactNode;
  description?: ReactNode;
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("border-b border-line pb-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="text-hud text-gold-400">{eyebrow}</p> : null}
          <Heading
            id={id}
            className={cn(
              "font-display tracking-[0.16em] text-ink-50 uppercase",
              eyebrow && "mt-2",
              level === 2 ? "text-base sm:text-lg" : "text-sm",
            )}
          >
            {title}
          </Heading>
        </div>
        {meta ? (
          <p className="hidden shrink-0 text-hud text-ink-500 sm:block">{meta}</p>
        ) : null}
      </div>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}
