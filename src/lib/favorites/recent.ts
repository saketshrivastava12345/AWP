/**
 * Pure helpers for the recently viewed list.
 *
 * Stored as [{ id, at }] (epoch milliseconds), most recent first. The time
 * is what lets this device's list merge honestly with the account's list
 * from another device: order by when each car was actually last opened.
 */

import { normalizeId } from "./ids";
import { MAX_RECENT } from "./constants";

export type RecentEntry = { id: string; at: number };

function toEntry(value: unknown): RecentEntry | null {
  // A bare id string is accepted (older or hand-written data) with no time.
  if (typeof value === "string") {
    const id = normalizeId(value);
    return id ? { id, at: 0 } : null;
  }
  if (typeof value !== "object" || value === null) return null;
  const record = value as { id?: unknown; at?: unknown };
  const id = normalizeId(record.id);
  if (!id) return null;
  const at =
    typeof record.at === "number" && Number.isFinite(record.at) && record.at > 0
      ? record.at
      : 0;
  return { id, at };
}

/** Valid, distinct entries from an unknown value, in stored order, capped. */
export function sanitizeRecent(value: unknown, max: number = MAX_RECENT): RecentEntry[] {
  if (!Array.isArray(value) || max <= 0) return [];
  const seen = new Set<string>();
  const out: RecentEntry[] = [];
  for (const item of value) {
    const entry = toEntry(item);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);
    out.push(entry);
    if (out.length >= max) break;
  }
  return out;
}

/** Parse the stored JSON. Anything malformed is an empty list. */
export function parseRecentList(
  raw: string | null | undefined,
  max: number = MAX_RECENT,
): RecentEntry[] {
  if (!raw) return [];
  try {
    return sanitizeRecent(JSON.parse(raw) as unknown, max);
  } catch {
    return [];
  }
}

export function serializeRecentList(entries: readonly RecentEntry[]): string {
  return JSON.stringify(entries);
}

/** Record a view: the id moves to the front, any earlier entry for it goes. */
export function pushRecent(
  entries: readonly RecentEntry[],
  id: string,
  at: number,
  max: number = MAX_RECENT,
): RecentEntry[] {
  const normalized = normalizeId(id);
  if (!normalized || max <= 0) return entries.slice(0, Math.max(0, max));
  return [
    { id: normalized, at },
    ...entries.filter((entry) => entry.id !== normalized),
  ].slice(0, max);
}

/**
 * Merge two lists, most recent first. A car in both keeps its latest time.
 * Ties (including untimed entries) keep `a` before `b`, then stored order.
 */
export function mergeRecent(
  a: readonly RecentEntry[],
  b: readonly RecentEntry[],
  max: number = MAX_RECENT,
): RecentEntry[] {
  const byId = new Map<string, { entry: RecentEntry; rank: number }>();
  let rank = 0;
  for (const entry of [...a, ...b]) {
    const current = byId.get(entry.id);
    if (!current) byId.set(entry.id, { entry, rank: rank++ });
    else if (entry.at > current.entry.at)
      byId.set(entry.id, { entry, rank: current.rank });
  }
  return [...byId.values()]
    .sort((x, y) => y.entry.at - x.entry.at || x.rank - y.rank)
    .slice(0, Math.max(0, max))
    .map((item) => item.entry);
}

/** Parse the sessionStorage map of { id: last sent at }. */
export function parseSyncLog(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    const out: Record<string, number> = {};
    for (const [key, at] of Object.entries(value)) {
      const id = normalizeId(key);
      if (id && typeof at === "number" && Number.isFinite(at)) out[id] = at;
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Whether a view should be written to the account now: not if the same car
 * was sent within `interval`. A clock that went backwards counts as stale.
 */
export function shouldSyncView(
  log: Readonly<Record<string, number>>,
  id: string,
  now: number,
  interval: number,
): boolean {
  const last = log[id];
  if (last === undefined) return true;
  return now - last >= interval || now < last;
}

/** Drop log entries older than `interval`, so the log cannot grow without bound. */
export function pruneSyncLog(
  log: Readonly<Record<string, number>>,
  now: number,
  interval: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, at] of Object.entries(log)) {
    if (now - at < interval && at <= now) out[id] = at;
  }
  return out;
}
