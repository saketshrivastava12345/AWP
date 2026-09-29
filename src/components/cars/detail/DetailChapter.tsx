import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/fx/Reveal";

/**
 * One chapter of the car page: a <section> the sticky SubNav links to, opened
 * by one sentence-case h2 and, optionally, one lead sentence.
 *
 * Props:
 *   id          section id; the SubNav's "#id" item points here
 *   title       the h2
 *   description optional lead sentence under the title (max 60ch)
 *   code        decorative chapter code ("02"), printed in the HUD eyebrow
 *   header      false when the page renders <ChapterHeader> itself somewhere
 *               inside the section (e.g. over the blueprint's opening shot);
 *               the section is still labelled by it
 *   headerClassName  extra classes for the heading block (e.g. a container)
 *
 * The section element itself is never animated: the engineering chapter
 * contains the blueprint's sticky stage, and a transform on an ancestor
 * would break it. Only the header block reveals.
 */
export function DetailChapter({
  id,
  title,
  description,
  code,
  header = true,
  headerClassName,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  code?: string;
  header?: boolean;
  headerClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={chapterHeadingId(id)} className={className}>
      {header ? (
        <ChapterHeader
          id={id}
          title={title}
          description={description}
          code={code}
          className={cn("mb-10 lg:mb-14", headerClassName)}
        />
      ) : null}
      {children}
    </section>
  );
}

export function chapterHeadingId(id: string): string {
  return `${id}-heading`;
}

/** The h2 and lead sentence that open a chapter, under a HUD eyebrow. */
export function ChapterHeader({
  id,
  title,
  description,
  code,
  className,
}: {
  /** The chapter's section id; the h2 gets `${id}-heading`. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Decorative chapter code, e.g. "02". */
  code?: string;
  className?: string;
}) {
  return (
    <Reveal as="header" variant="rise" className={cn("max-w-3xl", className)}>
      <p aria-hidden="true" className="flex items-center gap-3 hud-label">
        <span className="inline-block h-px w-6 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]" />
        {code ? `Sec.${code} // ` : "Sec // "}
        {id.replace(/-/g, " ")}
      </p>
      <h2 id={chapterHeadingId(id)} className="mt-4 text-h2">
        {title}
      </h2>
      {description ? <p className="mt-4 max-w-[60ch] text-lead">{description}</p> : null}
    </Reveal>
  );
}
