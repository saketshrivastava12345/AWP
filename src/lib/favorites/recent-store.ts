/**
 * Recently viewed cars: this device's list in localStorage, plus — for a
 * signed-in visitor — the account's list in public.recently_viewed, which
 * follows them across devices.
 *
 * Views are written to the account at most once per car per ten minutes
 * (tracked in sessionStorage), because opening a car is not worth a database
 * write every time someone scrolls back to it.
 */

import { clearRecentlyViewed, recordRecentView } from "@/app/favorites/actions";
import {
  AUTH_EPOCH_COOKIE,
  MAX_RECENT,
  MAX_RECENT_STORED,
  RECENT_CHANGED_EVENT,
  RECENT_KEY,
  RECENT_SYNC_INTERVAL_MS,
  RECENT_SYNC_KEY,
} from "./constants";
import { normalizeId } from "./ids";
import {
  parseRecentList,
  parseSyncLog,
  pruneSyncLog,
  pushRecent,
  serializeRecentList,
  shouldSyncView,
  type RecentEntry,
} from "./recent";
import { readCookie, readStorage, writeStorage } from "./storage";
import { whenSettled } from "./store";

const NONE: readonly RecentEntry[] = Object.freeze([]);

function sameEntries(a: readonly RecentEntry[], b: readonly RecentEntry[]): boolean {
  return (
    a.length === b.length &&
    a.every((entry, index) => entry.id === b[index]?.id && entry.at === b[index]?.at)
  );
}

// ------------------------------------------------------ this device's list --

let localStarted = false;
let localSnapshot: readonly RecentEntry[] = NONE;
/** Set once the browser refused a write; the list then lives here. */
let localMemory: RecentEntry[] | null = null;
const localListeners = new Set<() => void>();

function readLocal(): RecentEntry[] {
  if (localMemory) return [...localMemory];
  return parseRecentList(readStorage("localStorage", RECENT_KEY), MAX_RECENT);
}

function writeLocal(entries: readonly RecentEntry[]): void {
  const stored = writeStorage(
    "localStorage",
    RECENT_KEY,
    entries.length ? serializeRecentList(entries) : null,
  );
  localMemory = stored ? null : [...entries];
  try {
    window.dispatchEvent(new Event(RECENT_CHANGED_EVENT));
  } catch {
    // No window: nothing to tell.
  }
  refreshLocal();
}

function refreshLocal(): void {
  const next = readLocal();
  if (sameEntries(next, localSnapshot)) return;
  localSnapshot = next;
  for (const listener of [...localListeners]) listener();
}

function startLocal(): void {
  if (localStarted || typeof window === "undefined") return;
  localStarted = true;
  localSnapshot = readLocal();
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === RECENT_KEY) refreshLocal();
  });
  window.addEventListener(RECENT_CHANGED_EVENT, refreshLocal);
}

export function subscribeLocalRecent(listener: () => void): () => void {
  localListeners.add(listener);
  startLocal();
  return () => {
    localListeners.delete(listener);
  };
}

export function getLocalRecent(): readonly RecentEntry[] {
  return localSnapshot;
}

export function getServerLocalRecent(): readonly RecentEntry[] {
  return NONE;
}

// ------------------------------------------------------- account's list --

export type AccountRecent = {
  status: "idle" | "loading" | "ready" | "error";
  entries: readonly RecentEntry[];
  /** The auth epoch the list was read under; a new sign-in invalidates it. */
  epoch: string | null;
};

const IDLE: AccountRecent = Object.freeze({ status: "idle", entries: NONE, epoch: null });
let account: AccountRecent = IDLE;
const accountListeners = new Set<() => void>();

function setAccount(next: AccountRecent): void {
  account = next;
  for (const listener of [...accountListeners]) listener();
}

export function subscribeAccountRecent(listener: () => void): () => void {
  accountListeners.add(listener);
  return () => {
    accountListeners.delete(listener);
  };
}

export function getAccountRecent(): AccountRecent {
  return account;
}

export function getServerAccountRecent(): AccountRecent {
  return IDLE;
}

function parseAccountItems(body: unknown): RecentEntry[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { signedIn, items } = body as { signedIn?: unknown; items?: unknown };
  if (signedIn !== true) return [];
  if (!Array.isArray(items)) return null;
  const out: RecentEntry[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const { id, viewedAt } = item as { id?: unknown; viewedAt?: unknown };
    const variantId = normalizeId(id);
    const at = typeof viewedAt === "string" ? Date.parse(viewedAt) : Number.NaN;
    if (variantId && Number.isFinite(at)) out.push({ id: variantId, at });
  }
  return out;
}

/** Read the account's list, once per sign-in. Call freely; it de-duplicates. */
export function loadAccountRecent(): void {
  if (typeof window === "undefined") return;
  const epoch = readCookie(AUTH_EPOCH_COOKIE);
  if (
    account.epoch === epoch &&
    (account.status === "loading" || account.status === "ready")
  ) {
    return;
  }
  setAccount({
    status: "loading",
    entries: account.epoch === epoch ? account.entries : NONE,
    epoch,
  });

  void (async () => {
    let entries: RecentEntry[] | null = null;
    try {
      const response = await fetch("/api/recently-viewed", {
        cache: "no-store",
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
      if (response.ok) entries = parseAccountItems(await response.json());
    } catch {
      entries = null;
    }
    if (account.epoch !== epoch) return; // signed in or out meanwhile
    setAccount(
      entries === null
        ? { status: "error", entries: account.entries, epoch }
        : { status: "ready", entries, epoch },
    );
  })();
}

// ------------------------------------------------------------- actions --

function readSyncLog(now: number): Record<string, number> {
  return pruneSyncLog(
    parseSyncLog(readStorage("sessionStorage", RECENT_SYNC_KEY)),
    now,
    RECENT_SYNC_INTERVAL_MS,
  );
}

function writeSyncLog(log: Record<string, number>): void {
  writeStorage(
    "sessionStorage",
    RECENT_SYNC_KEY,
    Object.keys(log).length ? JSON.stringify(log) : null,
  );
}

async function syncView(id: string, at: number): Promise<void> {
  const session = await whenSettled();
  if (!session.signedIn) return;

  const log = readSyncLog(at);
  if (!shouldSyncView(log, id, at, RECENT_SYNC_INTERVAL_MS)) return;
  // Marked before sending, so a double mount or a quick reload sends once.
  writeSyncLog({ ...log, [id]: at });

  let ok = false;
  try {
    ok = (await recordRecentView(id)).ok;
  } catch {
    ok = false;
  }
  if (!ok) {
    const { [id]: _unsent, ...rest } = readSyncLog(Date.now());
    writeSyncLog(rest);
    return;
  }
  if (account.status === "ready") {
    setAccount({
      ...account,
      entries: pushRecent(account.entries, id, at, MAX_RECENT_STORED),
    });
  }
}

/** Record that this car was opened: on this device, and on the account when signed in. */
export function recordView(variantId: string): void {
  const id = normalizeId(variantId);
  if (!id || typeof window === "undefined") return;
  startLocal();
  const at = Date.now();
  writeLocal(pushRecent(readLocal(), id, at, MAX_RECENT));
  void syncView(id, at).catch(() => undefined);
}

/** Forget recently viewed cars on this device and, when signed in, on the account. */
export async function clearRecent(): Promise<boolean> {
  startLocal();
  writeLocal([]);
  writeStorage("sessionStorage", RECENT_SYNC_KEY, null);

  const session = await whenSettled();
  if (!session.signedIn) return true;

  const previous = account;
  setAccount({ ...account, entries: NONE });
  try {
    if ((await clearRecentlyViewed()).ok) return true;
  } catch {
    // Reported below.
  }
  setAccount(previous);
  return false;
}
