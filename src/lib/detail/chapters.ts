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

// ---------------------------------------------------------------------------
// The car page's sections, in reading order, for its sticky sub-navigation
// ---------------------------------------------------------------------------

export type DetailSectionId =
  | "overview"
  | "performance"
  | "engineering"
  | "design"
  | "features"
  | "technical-data"
  | "pricing"
  | "compare";

export type DetailSection = { id: DetailSectionId; label: string };

const DETAIL_SECTIONS: readonly DetailSection[] = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "features", label: "Features" },
  { id: "technical-data", label: "Technical data" },
  { id: "pricing", label: "Price" },
  { id: "compare", label: "Compare" },
];

/**
 * The sections the car page renders, in order, as sub-nav items
 * ({ label, href: "#id" }). A section the page leaves out (`present[id] ===
 * false`) is dropped, so the bar never links to a section that is not there.
 */
export function detailSubNav(
  present: Partial<Record<DetailSectionId, boolean>> = {},
): { id: DetailSectionId; label: string; href: string }[] {
  return DETAIL_SECTIONS.filter((section) => present[section.id] !== false).map(
    (section) => ({ ...section, href: `#${section.id}` }),
  );
}
