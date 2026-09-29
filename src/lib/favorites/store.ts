/**
 * The saved-cars store: one per browser tab, shared by every heart button,
 * the navbar count and the /favorites page.
 *
 * - Guests: the list lives in localStorage ("aurix-favorites"). Other tabs
 *   stay in sync through the `storage` event.
 * - Signed in: the `favorites` table is the source of truth. The session and
 *   the list are read once per page load from GET /api/favorites (one shared
 *   promise), and read again when the auth epoch cookie changes, when an
 *   "aurix:auth-changed" event fires, or on focus if the last read is over a
 *   minute old.
 * - Signing in with a non-empty guest list moves it into the account through
 *   a server action, and clears the guest list only once that succeeded.
 *
 * Toggles are optimistic: the heart changes at once and reverts only if the
 * write fails. Each toggle names the state it wants (save or remove), so a
 * repeated or stale click is harmless.
 *
 * Framework-free on purpose (React binds to it through useSyncExternalStore),
 * and inert on the server: nothing touches `window` until a component
 * subscribes.
 */

import {
  addFavorite,
  mergeGuestFavorites,
  removeFavorite,
  type FavoriteFailure,
} from "@/app/favorites/actions";
import {
  AUTH_CHANGED_EVENT,
  AUTH_EPOCH_COOKIE,
  FAVORITES_CHANGED_EVENT,
  FAVORITES_CHANNEL,
  GUEST_FAVORITES_KEY,
  MAX_GUEST_FAVORITES,
  SESSION_STALE_MS,
} from "./constants";
import {
  addId,
  normalizeId,
  parseIdList,
  removeId,
  sameIds,
  sanitizeIds,
  serializeIdList,
  withoutIds,
} from "./ids";
import { readCookie, readStorage, writeStorage } from "./storage";

export type FavoritesSnapshot = {
  /** The session has been read at least once on this page. */
  ready: boolean;
  signedIn: boolean;
  /** Saved variant ids, newest first: the account's, or this device's. */
  ids: readonly string[];
};

/** Where a successful change was kept. "memory": storage refused; this visit only. */
export type SavedWhere = "account" | "device" | "memory";

export type ToggleFailure = FavoriteFailure | "full" | "network";

export type ToggleResult =
  | { ok: true; saved: boolean; where: SavedWhere }
  | { ok: false; saved: boolean; reason: ToggleFailure };

const NO_IDS: readonly string[] = Object.freeze([]);
const SERVER_SNAPSHOT: FavoritesSnapshot = Object.freeze({
  ready: false,
  signedIn: false,
  ids: NO_IDS,
});

let started = false;
let snapshot: FavoritesSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

let ready = false;
let signedIn = false;
/** The account's list (server truth) when signed in, this device's otherwise. */
let base: readonly string[] = NO_IDS;
/** Optimistic overrides for ids with a write in flight: id -> wanted state. */
const wanted = new Map<string, boolean>();
const inFlight = new Map<string, number>();
const chains = new Map<string, Promise<unknown>>();
/** Set once the browser refused a write; the list then lives here for the visit. */
let guestMemory: string[] | null = null;

let sessionRequest: Promise<void> | null = null;
let sessionGeneration = 0;
let sessionLoading = false;
let lastSessionAt = 0;
/** The epoch cookie's value when the session was last requested. */
let sessionEpoch: string | null = null;
let mergeRequest: Promise<void> | null = null;
let channel: BroadcastChannel | null = null;

// ------------------------------------------------------------------ state --

function compose(): readonly string[] {
  if (wanted.size === 0) return base;
  const kept = base.filter((id) => wanted.get(id) !== false);
  const added = [...wanted]
    .filter(([id, want]) => want && !kept.includes(id))
    .map(([id]) => id);
  return added.length ? [...added.reverse(), ...kept] : kept;
}

function publish(): void {
  const ids = compose();
  if (
    snapshot.ready === ready &&
    snapshot.signedIn === signedIn &&
    sameIds(snapshot.ids, ids)
  ) {
    return;
  }
  snapshot = { ready, signedIn, ids };
  for (const listener of [...listeners]) listener();
}

function readGuest(): string[] {
  if (guestMemory) return [...guestMemory];
  return parseIdList(
    readStorage("localStorage", GUEST_FAVORITES_KEY),
    MAX_GUEST_FAVORITES,
  );
}

function writeGuest(ids: readonly string[]): SavedWhere {
  const stored = writeStorage(
    "localStorage",
    GUEST_FAVORITES_KEY,
    ids.length ? serializeIdList(ids) : null,
  );
  if (stored) {
    guestMemory = null;
    return "device";
  }
  guestMemory = [...ids];
  return "memory";
}

/**
 * Tell this tab (and, for account changes, the others) that saved cars
 * changed. The event carries the new total as `detail.count` (the account's
 * confirmed count when signed in, this device's otherwise), so the navbar
 * badge can update without a round trip; listeners that only need the signal
 * can ignore it.
 */
function announce(accountChanged: boolean): void {
  try {
    const count = signedIn ? base.length : readGuest().length;
    window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT, { detail: { count } }));
  } catch {
    // Nothing is listening in a context without events.
  }
  if (accountChanged) {
    try {
      channel?.postMessage("changed");
    } catch {
      // A closed channel only costs other tabs their live update.
    }
  }
}

// ---------------------------------------------------------------- session --

type SessionPayload = { signedIn: boolean; ids: string[] };

async function fetchSession(): Promise<SessionPayload | null> {
  try {
    const response = await fetch("/api/favorites", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null) return null;
    const { signedIn: isSignedIn, ids } = body as { signedIn?: unknown; ids?: unknown };
    if (typeof isSignedIn !== "boolean") return null;
    return {
      signedIn: isSignedIn,
      ids: isSignedIn ? sanitizeIds(ids, Number.MAX_SAFE_INTEGER) : [],
    };
  } catch {
    return null;
  }
}

function loadSession(): Promise<void> {
  const generation = ++sessionGeneration;
  sessionEpoch = readCookie(AUTH_EPOCH_COOKIE);
  sessionLoading = true;

  const request = (async () => {
    const result = await fetchSession();
    // A newer read started meanwhile: it owns the outcome.
    if (generation !== sessionGeneration) return;
    sessionLoading = false;
    // A failed read retries on the next focus; until then, act as a guest so
    // saving still works — anything saved is merged once the session is back.
    lastSessionAt = result ? Date.now() : 0;
    signedIn = result?.signedIn ?? false;
    base = signedIn && result ? result.ids : readGuest();
    ready = true;
    publish();
    if (signedIn) await mergeGuest();
  })();

  sessionRequest = request;
  return request;
}

/** Move a non-empty guest list into the account. Safe to call repeatedly. */
function mergeGuest(): Promise<void> {
  if (!signedIn) return Promise.resolve();
  if (mergeRequest) return mergeRequest;
  const guest = readGuest();
  if (guest.length === 0) return Promise.resolve();

  mergeRequest = (async () => {
    try {
      const result = await mergeGuestFavorites(guest);
      if (!result.ok) return;
      // Clear only what was sent: something saved meanwhile stays for next time.
      writeGuest(withoutIds(readGuest(), guest));
      if (signedIn) {
        base = result.ids;
        publish();
      }
      announce(true);
    } catch (error) {
      console.warn("Saved cars could not be moved into the account yet:", error);
    } finally {
      mergeRequest = null;
    }
  })();
  return mergeRequest;
}

/** Re-read the session if it changed or went stale. */
function revalidate(): void {
  if (!started) return;
  if (readCookie(AUTH_EPOCH_COOKIE) !== sessionEpoch) {
    void loadSession();
    return;
  }
  if (!sessionLoading && Date.now() - lastSessionAt > SESSION_STALE_MS)
    void loadSession();
}

// ----------------------------------------------------------------- events --

function onStorage(event: StorageEvent): void {
  if (event.key !== null && event.key !== GUEST_FAVORITES_KEY) return;
  onGuestListChanged();
}

function onGuestListChanged(): void {
  if (signedIn) {
    void mergeGuest();
    return;
  }
  base = readGuest();
  publish();
}

function onVisibility(): void {
  if (document.visibilityState === "visible") revalidate();
}

function start(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  base = readGuest();
  publish();

  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVORITES_CHANGED_EVENT, onGuestListChanged);
  window.addEventListener(AUTH_CHANGED_EVENT, () => void loadSession());
  window.addEventListener("focus", revalidate);
  window.addEventListener("pageshow", revalidate);
  document.addEventListener("visibilitychange", onVisibility);
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(FAVORITES_CHANNEL);
      channel.onmessage = () => {
        if (signedIn) void loadSession();
      };
    }
  } catch {
    channel = null;
  }

  void loadSession();
}

// ------------------------------------------------------------ public API --

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) start();
  // A component mounting after a navigation is the moment to notice that a
  // sign-in or sign-out happened since the session was read.
  else if (readCookie(AUTH_EPOCH_COOKIE) !== sessionEpoch) void loadSession();
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): FavoritesSnapshot {
  return snapshot;
}

export function getServerSnapshot(): FavoritesSnapshot {
  return SERVER_SNAPSHOT;
}

/** Resolves once the session (and any sign-in merge) has settled. */
export async function whenSettled(): Promise<FavoritesSnapshot> {
  start();
  let current: Promise<void> | null;
  do {
    current = sessionRequest;
    if (current) await current;
  } while (current !== sessionRequest);
  return snapshot;
}

/** Ask the store to read the session again (after signing in or out). */
export function notifyAuthChanged(): void {
  try {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  } catch {
    // Not in a browser: nothing to notify.
  }
}

function queue<T>(id: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(id) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  chains.set(id, next);
  void next
    .catch(() => undefined)
    .finally(() => {
      if (chains.get(id) === next) chains.delete(id);
    });
  return next;
}

function writeDevice(id: string, save: boolean): ToggleResult {
  const current = readGuest();
  if (save) {
    const result = addId(current, id, MAX_GUEST_FAVORITES);
    if (result.full) return { ok: false, saved: false, reason: "full" };
    const where = result.added
      ? writeGuest(result.ids)
      : guestMemory
        ? "memory"
        : "device";
    base = readGuest();
    return { ok: true, saved: true, where };
  }
  const next = removeId(current, id);
  const where =
    next.length !== current.length ? writeGuest(next) : guestMemory ? "memory" : "device";
  base = readGuest();
  return { ok: true, saved: false, where };
}

async function writeAccount(id: string, save: boolean): Promise<ToggleResult> {
  const result = await queue(id, () => (save ? addFavorite(id) : removeFavorite(id)));
  if (result.ok) {
    base = save
      ? [id, ...base.filter((item) => item !== id)]
      : base.filter((item) => item !== id);
    return { ok: true, saved: save, where: "account" };
  }
  if (result.reason === "signed_out") {
    // The session ended under us. Keep the visitor's intent on this device
    // (it is merged back on the next sign-in) and re-read the session.
    signedIn = false;
    const fallback = writeDevice(id, save);
    void loadSession();
    return fallback;
  }
  return { ok: false, saved: base.includes(id), reason: result.reason };
}

/**
 * Save (`save: true`) or remove a car. Idempotent: asking for the state it is
 * already in succeeds without a write.
 */
export async function setFavorite(
  variantId: string,
  save: boolean,
): Promise<ToggleResult> {
  const id = normalizeId(variantId);
  if (!id) return { ok: false, saved: false, reason: "invalid" };

  start();
  wanted.set(id, save);
  inFlight.set(id, (inFlight.get(id) ?? 0) + 1);
  publish();

  let result: ToggleResult;
  try {
    await whenSettled();
    result = signedIn ? await writeAccount(id, save) : writeDevice(id, save);
  } catch {
    result = { ok: false, saved: base.includes(id), reason: "network" };
  } finally {
    const left = (inFlight.get(id) ?? 1) - 1;
    if (left > 0) {
      inFlight.set(id, left);
    } else {
      inFlight.delete(id);
      wanted.delete(id);
    }
    publish();
  }

  if (result.ok) announce(result.where === "account");
  return result;
}

/** Remove several at once (e.g. cars that left the catalogue). */
export async function removeFavorites(variantIds: readonly string[]): Promise<boolean> {
  const results = await Promise.all(variantIds.map((id) => setFavorite(id, false)));
  return results.every((result) => result.ok);
}
