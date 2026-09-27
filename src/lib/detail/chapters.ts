/**
 * Which chapter of the car page the reader is in, from IntersectionObserver
 * readings. Pure, so the rule is testable without a browser.
 *
 * Each chapter is "above" the reading band (scrolled past), "in" it, or
 * "below" it (not reached). The active chapter is the last one in document
 * order that is in the band; between chapters (a gap the band sits in) it is
 * the last one scrolled past; above the first chapter there is none.
 */

export type Chapter = {
  /** The id of the section element the chapter links to. */
  id: string;
  /** Display number, e.g. "03". */
  number: string;
  label: string;
};

export type ChapterPlacement = "above" | "in" | "below";

export function activeChapterId(
  order: readonly string[],
  placements: ReadonlyMap<string, ChapterPlacement>,
): string | null {
  let lastIn: string | null = null;
  let lastAbove: string | null = null;
  for (const id of order) {
    const placement = placements.get(id);
    if (placement === "in") lastIn = id;
    else if (placement === "above") lastAbove = id;
  }
  return lastIn ?? lastAbove;
}

/**
 * Classify one observer entry. `bandTop` is the top of the observer's root
 * box (rootBounds) — an element whose bottom is at or above it has been
 * scrolled past.
 */
export function placementOf(
  isIntersecting: boolean,
  rectBottom: number,
  bandTop: number,
): ChapterPlacement {
  if (isIntersecting) return "in";
  return rectBottom <= bandTop ? "above" : "below";
}

/**
 * "03 / 07". Uses the chapters' own numbers — the ones printed in the page's
 * chapter headings — so the indicator and the headings always agree, even when
 * a chapter the car has no data for was left out.
 */
export function chapterPosition(
  chapters: readonly Chapter[],
  id: string | null,
): string | null {
  if (!id) return null;
  const current = chapters.find((chapter) => chapter.id === id);
  const last = chapters[chapters.length - 1];
  if (!current || !last) return null;
  return `${current.number} / ${last.number}`;
}
