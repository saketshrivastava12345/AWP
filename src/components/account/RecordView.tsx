"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/favorites/recent-store";

/**
 * Records that this car was opened, for "Recently viewed". Renders nothing.
 *
 * Always on this device (localStorage, newest first, twelve cars); also on
 * the account when signed in, at most once per car per ten minutes. Mount it
 * once on a car's detail page; it needs no server-provided state, so the
 * page stays static.
 */
export function RecordView({ variantId }: { variantId: string }) {
  useEffect(() => {
    recordView(variantId);
  }, [variantId]);
  return null;
}
