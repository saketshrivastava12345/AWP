import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One chapter of the car page: a <section> the sticky SubNav links to, opened
 * by one sentence-case h2 and, optionally, one lead sentence.
 *
 * Props:
 *   id          section id; the SubNav's "#id" item points here
 *   title       the h2
 *   description optional lead sentence under the title (max 60ch)
 *   header      false when the page renders <ChapterHeader> itself somewhere
 *               inside the section (e.g. over the blueprint's opening shot);
 *               the section is still labelled by it
 *   headerClassName  extra classes for the heading block (e.g. a container)
 */
export function DetailChapter({
  id,
  title,
  description,
  header = true,
  headerClassName,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
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

/** The h2 and lead sentence that open a chapter. */
export function ChapterHeader({
  id,
  title,
  description,
  className,
}: {
  /** The chapter's section id; the h2 gets `${id}-heading`. */
  id: string;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("max-w-3xl", className)}>
      <h2 id={chapterHeadingId(id)} className="text-h2">
        {title}
      </h2>
      {description ? <p className="mt-4 max-w-[60ch] text-lead">{description}</p> : null}
    </header>
  );
}
