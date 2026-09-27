import type { ComparePickerOption } from "@/lib/queries/compare";

/**
 * The picker's search and suggestions. Pure, so it runs in the browser
 * against the catalogue the server already sent, and so it is unit-tested.
 *
 * Suggestions are derived only from catalogue facts — same category, same
 * maker, similar published power. Nothing here ranks cars by popularity or
 * any other figure the catalogue does not hold.
 */

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Lower-case, accents stripped ("Coupé" -> "coupe"). */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function words(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Levenshtein distance, early-exiting once it exceeds `limit`. */
export function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        (previous[j] ?? Infinity) + 1,
        (current[j - 1] ?? Infinity) + 1,
        (previous[j - 1] ?? Infinity) + cost,
      );
      current.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length] ?? limit + 1;
}

/**
 * How well one query token matches one word: 3 exact, 2 prefix, 1 typo, 0 none.
 * Typos are only considered when `fuzzy` is set — see searchOptions.
 */
function tokenScore(token: string, word: string, fuzzy: boolean): number {
  if (word === token) return 3;
  if (word.startsWith(token)) return 2;
  // One typo against the start of the word ("porche" finds Porsche,
  // "ferari" finds Ferrari) — only for tokens of four letters or more, where
  // a single slip is unlikely to turn one real word into another.
  if (fuzzy && token.length >= 4) {
    for (const length of [token.length - 1, token.length, token.length + 1]) {
      if (length > word.length) continue;
      if (editDistance(token, word.slice(0, length), 1) <= 1) return 1;
    }
  }
  return 0;
}

function haystack(option: ComparePickerOption): {
  primary: string[];
  secondary: string[];
} {
  return {
    primary: words(`${option.manufacturer} ${option.model} ${option.variant}`),
    secondary: words(
      [option.category, option.generation, option.yearStart, option.fuelType]
        .filter((part) => part !== null && part !== undefined)
        .join(" "),
    ),
  };
}

/**
 * Search the catalogue. Every query word must match a word of the car
 * (name first, then category, generation, year or fuel) by prefix. A word
 * that matches nothing anywhere in the catalogue is then allowed one typo, so
 * "porche" finds Porsche while "coupe" does not also drag in "competition".
 * "911 gt" finds the GT3; "ev suv" finds electric SUVs.
 */
export function searchOptions(
  options: readonly ComparePickerOption[],
  query: string,
  limit = 50,
): ComparePickerOption[] {
  const tokens = words(query);
  if (tokens.length === 0) return options.slice(0, limit);

  const fields = options.map(haystack);
  const scoreToken = (index: number, token: string, fuzzy: boolean) => {
    const field = fields[index];
    if (!field) return 0;
    return Math.max(
      ...field.primary.map((word) => tokenScore(token, word, fuzzy) * 2),
      ...field.secondary.map((word) => tokenScore(token, word, fuzzy)),
      0,
    );
  };
  // Typo tolerance only for words with no exact or prefix match at all.
  const fuzzy = tokens.map(
    (token) => !options.some((_, index) => scoreToken(index, token, false) > 0),
  );

  const scored: { option: ComparePickerOption; score: number; index: number }[] = [];
  options.forEach((option, index) => {
    let score = 0;
    for (const [position, token] of tokens.entries()) {
      const best = scoreToken(index, token, fuzzy[position] ?? false);
      if (best === 0) return;
      score += best;
    }
    scored.push({ option, score, index });
  });

  return scored
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.option);
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export type SuggestionGroup = {
  id: "category" | "maker" | "power";
  title: string;
  options: ComparePickerOption[];
};

/** Relative gap between two power figures, or Infinity when either is unknown. */
function powerGap(a: number | null, b: number | null): number {
  if (a === null || b === null || a <= 0 || b <= 0) return Infinity;
  return Math.abs(a - b) / Math.max(a, b);
}

/** Within this relative gap, two cars count as "similar power". */
export const SIMILAR_POWER = 0.15;

/**
 * What to compare `anchor` with: the same category (closest power first),
 * the same maker, and cars of similar published power in other categories.
 * Cars in `exclude` (already selected) never appear, and no car appears in
 * two groups.
 */
export function suggestFor(
  anchor: ComparePickerOption,
  options: readonly ComparePickerOption[],
  exclude: ReadonlySet<string>,
  perGroup = 4,
): SuggestionGroup[] {
  const used = new Set<string>([...exclude, anchor.slug]);
  const take = (list: ComparePickerOption[]) => {
    const picked = list.filter((option) => !used.has(option.slug)).slice(0, perGroup);
    picked.forEach((option) => used.add(option.slug));
    return picked;
  };

  const byCloseness = (a: ComparePickerOption, b: ComparePickerOption) =>
    powerGap(anchor.powerHp, a.powerHp) - powerGap(anchor.powerHp, b.powerHp) ||
    // Rivals from other makers before the anchor's own siblings.
    Number(a.manufacturerSlug === anchor.manufacturerSlug) -
      Number(b.manufacturerSlug === anchor.manufacturerSlug) ||
    a.manufacturer.localeCompare(b.manufacturer) ||
    a.model.localeCompare(b.model);

  const category = anchor.categorySlug
    ? take(
        options
          .filter((option) => option.categorySlug === anchor.categorySlug)
          .sort(byCloseness),
      )
    : [];

  const maker = take(
    options.filter((option) => option.manufacturerSlug === anchor.manufacturerSlug),
  );

  const power =
    anchor.powerHp !== null
      ? take(
          options
            .filter((option) => powerGap(anchor.powerHp, option.powerHp) <= SIMILAR_POWER)
            .sort(byCloseness),
        )
      : [];

  const groups: SuggestionGroup[] = [
    {
      id: "category",
      title: anchor.category ? `Same category · ${anchor.category}` : "Same category",
      options: category,
    },
    { id: "maker", title: `Also from ${anchor.manufacturer}`, options: maker },
    {
      id: "power",
      title: "Similar published power (±15 %)",
      options: power,
    },
  ];
  return groups.filter((group) => group.options.length > 0);
}

export type QuickStart = {
  category: string;
  a: ComparePickerOption;
  b: ComparePickerOption;
};

/**
 * Ready-made comparisons for an empty page: in each of the largest
 * categories, the two cars from different makers whose published power is
 * closest — natural rivals, chosen by a rule anyone can check.
 */
export function quickStarts(
  options: readonly ComparePickerOption[],
  limit = 4,
): QuickStart[] {
  const byCategory = new Map<string, ComparePickerOption[]>();
  for (const option of options) {
    if (!option.categorySlug || option.powerHp === null) continue;
    const list = byCategory.get(option.categorySlug) ?? [];
    list.push(option);
    byCategory.set(option.categorySlug, list);
  }

  const starts: (QuickStart & { size: number; gap: number })[] = [];
  for (const list of byCategory.values()) {
    let best: { a: ComparePickerOption; b: ComparePickerOption; gap: number } | null =
      null;
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (!a || !b || a.manufacturerSlug === b.manufacturerSlug) continue;
        const gap = powerGap(a.powerHp, b.powerHp);
        if (best === null || gap < best.gap) best = { a, b, gap };
      }
    }
    if (best) {
      const [a, b] =
        (best.a.powerHp ?? 0) >= (best.b.powerHp ?? 0)
          ? [best.a, best.b]
          : [best.b, best.a];
      starts.push({ category: a.category ?? "", a, b, size: list.length, gap: best.gap });
    }
  }

  return starts
    .sort((x, y) => y.size - x.size || x.category.localeCompare(y.category))
    .slice(0, limit)
    .map(({ category, a, b }) => ({ category, a, b }));
}
