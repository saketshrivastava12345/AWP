import { cacheLife } from "next/cache";

/**
 * The current calendar year (UTC), for "production ended" badges.
 *
 * Reading the clock while prerendering is an error under Cache Components, so
 * the value is cached: a prerendered page carries the year it was rendered in,
 * refreshed daily.
 */
export async function catalogueYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getUTCFullYear();
}
