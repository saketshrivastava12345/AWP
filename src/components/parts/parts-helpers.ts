/**
 * Pure helpers for the parts encyclopedia: slug resolution for /parts/[slug],
 * the one-line summaries on cards, and the instant text filter.
 *
 * Client-safe and dependency-free, so the explorer can filter in the browser
 * and the tests can run without a database.
 */

// ---------------------------------------------------------------------------
// /parts/[slug] resolution
// ---------------------------------------------------------------------------

export type PartsRoute<C, P> =
  { kind: "category"; category: C } | { kind: "part"; part: P } | null;

/**
 * /parts/[slug] serves both category pages (/parts/braking) and part pages
 * (/parts/brake-disc). Category wins when a slug is both, so a category page
 * can never be shadowed by a part that happens to share its name.
 */
export function pickPartsRoute<C, P>(
  category: C | null | undefined,
  part: P | null | undefined,
): PartsRoute<C, P> {
  if (category) return { kind: "category", category };
  if (part) return { kind: "part", part };
  return null;
}

/** Category and part slugs for generateStaticParams, categories first, no duplicates. */
export function partsRouteSlugs(
  categorySlugs: readonly string[],
  partSlugs: readonly string[],
): string[] {
  return [...new Set([...categorySlugs, ...partSlugs])];
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

/**
 * The first sentence of a paragraph, for a card's one-line summary. Falls back
 * to a word-boundary cut with an ellipsis when the sentence is very long.
 */
export function firstSentence(text: string | null | undefined, max = 150): string | null {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  // A full stop followed by a space and a capital (or the end) ends a
  // sentence; "e.g. the" or "3.5 litres" does not.
  const match = /^(.+?[.!?])(?=\s+[A-Z(“"']|$)/.exec(clean);
  const sentence = match?.[1] ?? clean;
  if (sentence.length <= max) return sentence;
  const cut = sentence.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, "")}…`;
}

// ---------------------------------------------------------------------------
// Text filter
// ---------------------------------------------------------------------------

/** Lower case, accents removed, punctuation to spaces: "Coil-over" ~ "coil over". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * True when every word of the query appears in the (pre-normalised)
 * haystack, in any order: "disc carbon" finds "Carbon-Ceramic Brake Disc".
 * An empty query matches everything.
 */
export function matchesQuery(normalizedHaystack: string, query: string): boolean {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return words.every((word) => normalizedHaystack.includes(word));
}

/** How many catalogued cars, as a phrase; null when none record the part. */
export function usageLabel(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return `Used by ${count} catalogued ${count === 1 ? "car" : "cars"}`;
}
