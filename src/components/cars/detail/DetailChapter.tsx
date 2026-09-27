import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One chapter of the car page: a <section> the ChapterIndicator can track,
 * opened by a numbered heading ("03 — Engineering").
 *
 * Props:
 *   id          section id; the ChapterIndicator links to it (e.g. "engineering")
 *   number      "03" — printed here and in the indicator, so they always agree
 *   label       short chapter name, e.g. "Engineering"
 *   title       the h2 (defaults to `label`)
 *   description optional supporting line under the title
 *   lead        content placed before the chapter heading, inside the section
 *               (the page's hero opens chapter 01 above its heading)
 *   header      false when the page renders <ChapterHeader> itself somewhere
 *               inside the section (e.g. over the anatomy tour's opening shot);
 *               the section is still labelled by it
 *   headerClassName  extra classes for the heading block (e.g. a container)
 */
export function DetailChapter({
  id,
  number,
  label,
  title,
  description,
  lead,
  header = true,
  headerClassName,
  children,
  className,
}: {
  id: string;
  number: string;
  label: string;
  title?: ReactNode;
  description?: ReactNode;
  lead?: ReactNode;
  header?: boolean;
  headerClassName?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={chapterHeadingId(id)}
      // Anchors land below the fixed navbar and the mobile chapter pill.
      className={cn("scroll-mt-16 lg:scroll-mt-4", className)}
    >
      {lead}
      {header ? (
        <ChapterHeader
          id={id}
          number={number}
          label={label}
          title={title}
          description={description}
          className={cn("mb-10 sm:mb-12", headerClassName)}
        />
      ) : null}
      {children}
    </section>
  );
}

export function chapterHeadingId(id: string): string {
  return `${id}-heading`;
}

/** The numbered overline and h2 that open a chapter. */
export function ChapterHeader({
  id,
  number,
  label,
  title,
  description,
  className,
}: {
  /** The chapter's section id; the h2 gets `${id}-heading`. */
  id: string;
  number: string;
  label: string;
  title?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <header className={className}>
      <p className="flex items-center gap-3 font-mono text-micro tracking-hud uppercase">
        <span className="text-gold-400">{number}</span>
        <span
          aria-hidden="true"
          className="h-px w-10 bg-gradient-to-r from-gold-600 to-transparent"
        />
        <span className="text-ink-400">{label}</span>
      </p>
      <h2
        id={chapterHeadingId(id)}
        className="mt-4 font-display text-2xl leading-tight tracking-[0.04em] text-balance text-ink-50 sm:text-3xl"
      >
        {title ?? label}
      </h2>
      {description ? (
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
          {description}
        </p>
      ) : null}
    </header>
  );
}
