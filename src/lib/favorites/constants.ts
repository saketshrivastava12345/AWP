/**
 * Shared names and limits for saved cars and recently viewed.
 *
 * Client-safe (no imports). The navbar's saved-cars badge imports the first
 * two (src/components/layout/GuestFavoritesCount.tsx and
 * SignedInFavoritesCount.tsx): guests' ids live under GUEST_FAVORITES_KEY, and
 * every change dispatches FAVORITES_CHANGED_EVENT — a CustomEvent whose
 * `detail.count` is the new total.
 */

/** localStorage: JSON string[] of variant ids a guest has saved, newest first. */
export const GUEST_FAVORITES_KEY = "aurix-favorites";
/** Dispatched on window after any change to saved cars, guest or account; `detail: { count }`. */
export const FAVORITES_CHANGED_EVENT = "aurix:favorites-changed";

/** Dispatch on window after signing in or out, so the store re-reads the session. */
export const AUTH_CHANGED_EVENT = "aurix:auth-changed";

/**
 * A non-secret cookie the auth server actions rotate on every sign-in and
 * sign-out. The store compares it on mount and focus, which is how it notices
 * a session change made by a form post, a redirect or another tab — none of
 * which can run client code at the right moment.
 */
export const AUTH_EPOCH_COOKIE = "aurix-auth-epoch";

/** localStorage: JSON [{ id, at }] of recently viewed variants, most recent first. */
export const RECENT_KEY = "aurix-recently-viewed";
/** Dispatched on window after the recently viewed list changes. */
export const RECENT_CHANGED_EVENT = "aurix:recent-changed";
/** sessionStorage: { [variantId]: epoch ms } of views already sent to the account. */
export const RECENT_SYNC_KEY = "aurix-recent-synced";

/** Most cars a guest can keep on one device (and the most a merge accepts). */
export const MAX_GUEST_FAVORITES = 200;
/** Length of the recently viewed list. */
export const MAX_RECENT = 12;
/** Rows kept per account in public.recently_viewed. */
export const MAX_RECENT_STORED = 50;
/** Most ids GET /api/cars resolves in one request. */
export const MAX_CARS_PER_REQUEST = 50;

/** A view of the same car is sent to the account at most this often. */
export const RECENT_SYNC_INTERVAL_MS = 10 * 60 * 1000;
/** On window focus, re-read the session if the last read is older than this. */
export const SESSION_STALE_MS = 60 * 1000;

/** BroadcastChannel name used to tell other tabs an account list changed. */
export const FAVORITES_CHANNEL = "aurix-favorites";
