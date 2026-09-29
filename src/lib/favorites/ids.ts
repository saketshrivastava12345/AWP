/**
 * Pure helpers for lists of variant ids: parsing what a browser stored,
 * serialising it back, and adding, removing and merging without duplicates.
 *
 * Everything here treats its input as untrusted. localStorage can hold
 * anything (another script, an old format, a hand edit), and a malformed
 * value must degrade to "nothing saved", never to a crash.
 */

import { MAX_GUEST_FAVORITES } from "./constants";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a canonical hyphenated uuid (any version, either case). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** A trimmed, lower-cased uuid, or null. Postgres prints uuids in lower case. */
export function normalizeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toLowerCase();
  return UUID.test(id) ? id : null;
}

/**
 * Valid, distinct ids from an unknown value, in their original order, capped
 * at `cap`. Anything that is not an array yields an empty list.
 */
export function sanitizeIds(value: unknown, cap: number = MAX_GUEST_FAVORITES): string[] {
  if (!Array.isArray(value) || cap <= 0) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const id = normalizeId(item);
    if (id && !seen.has(id)) {
      seen.add(id);
      if (seen.size >= cap) break;
    }
  }
  return [...seen];
}

/** Parse a stored JSON id list. Malformed JSON or a non-array is an empty list. */
export function parseIdList(
  raw: string | null | undefined,
  cap: number = MAX_GUEST_FAVORITES,
): string[] {
  if (!raw) return [];
  try {
    return sanitizeIds(JSON.parse(raw) as unknown, cap);
  } catch {
    return [];
  }
}

export function serializeIdList(ids: readonly string[]): string {
  return JSON.stringify(ids);
}

/** "a,b,c" from a query string, validated, de-duplicated and capped. */
export function parseIdsParam(param: string | null | undefined, cap: number): string[] {
  if (!param) return [];
  // Bound the work before splitting: a uuid is 36 characters plus a comma.
  return sanitizeIds(param.slice(0, cap * 40).split(","), cap);
}

export type AddResult = {
  ids: string[];
  /** False when the id was already present or the list is full. */
  added: boolean;
  /** True when the id could not be added because the list is at `cap`. */
  full: boolean;
};

/**
 * Add an id at the front (newest first). Adding one that is already present
 * is a no-op success, never a duplicate. A full list refuses rather than
 * silently dropping the oldest saved car.
 */
export function addId(
  ids: readonly string[],
  id: string,
  cap: number = MAX_GUEST_FAVORITES,
): AddResult {
  const normalized = normalizeId(id);
  if (!normalized) return { ids: [...ids], added: false, full: false };
  if (ids.includes(normalized)) return { ids: [...ids], added: false, full: false };
  if (ids.length >= cap) return { ids: [...ids], added: false, full: true };
  return { ids: [normalized, ...ids], added: true, full: false };
}

/** Remove an id. Removing one that is absent returns an equal list. */
export function removeId(ids: readonly string[], id: string): string[] {
  const normalized = normalizeId(id);
  return normalized ? ids.filter((item) => item !== normalized) : [...ids];
}

/**
 * Union of two lists: `primary` keeps its order, then whatever `secondary`
 * adds, capped at `cap`.
 */
export function mergeIdLists(
  primary: readonly string[],
  secondary: readonly string[],
  cap: number = Number.POSITIVE_INFINITY,
): string[] {
  const seen = new Set<string>();
  for (const id of [...primary, ...secondary]) {
    if (seen.size >= cap) break;
    const normalized = normalizeId(id);
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}

/** Items of `ids` that are not in `remove`. */
export function withoutIds(ids: readonly string[], remove: readonly string[]): string[] {
  const drop = new Set(remove);
  return ids.filter((id) => !drop.has(id));
}

/** Split a list into consecutive chunks of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

/** Same members in the same order. */
export function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}
