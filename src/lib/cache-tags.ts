/**
 * Cache tags and lifetimes for public reads.
 *
 * Every public query goes through `createStaticClient`, which attaches Next's
 * fetch-cache options. Admin writes then invalidate the matching tag with
 * `updateTag` (read-your-own-writes), so an edit shows up on the next request
 * instead of up to an hour later.
 *
 * Client-safe: no server imports.
 */

export const CACHE_TAGS = {
  /** Specifications, models, makers, parts, media: changes rarely. */
  catalogue: "catalogue",
  /** Market prices: changes more often than specifications. */
  prices: "prices",
  /** Countries' regions and cities: almost never changes. */
  markets: "markets",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Seconds a cached read stays fresh before a background revalidation. */
export const CACHE_SECONDS: Record<CacheTag, number> = {
  catalogue: 3600,
  prices: 600,
  markets: 86_400,
};
