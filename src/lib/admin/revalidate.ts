import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { CACHE_TAGS, type CacheTag } from "@/lib/cache-tags";

/**
 * After a successful admin write: expire the public caches the write touched,
 * so the next visitor sees the change (read-your-own-writes for the admin),
 * and refresh the admin screens themselves.
 *
 * Server actions only — updateTag throws anywhere else. Route handlers use
 * revalidateTag(tag, { expire: 0 }) instead.
 */
export function afterWrite(...tags: CacheTag[]): void {
  for (const tag of new Set(tags)) updateTag(tag);
  revalidatePath("/admin", "layout");
}

export { CACHE_TAGS };
