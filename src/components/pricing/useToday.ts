"use client";

import { useSyncExternalStore } from "react";
import { todayUtc } from "@/lib/pricing/presentation";

const noSubscription = () => () => {};
const readToday = () => todayUtc();
const unknownOnServer = () => null;

/**
 * Today's UTC date ("YYYY-MM-DD") in the browser, and null while prerendering
 * and hydrating.
 *
 * The car page's static shell is rendered ahead of time, so "how many days
 * ago was this checked" must not be baked into it: the server's day and the
 * visitor's can differ, which would be both wrong and a hydration mismatch.
 * Relative wording therefore appears once the page is running in a browser.
 */
export function useToday(): string | null {
  return useSyncExternalStore(noSubscription, readToday, unknownOnServer);
}
