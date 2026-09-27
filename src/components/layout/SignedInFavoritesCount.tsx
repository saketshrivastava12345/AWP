"use client";

import { useEffect, useState } from "react";
import { FAVORITES_CHANGED_EVENT } from "@/lib/favorites/constants";
import { CountBadge } from "./FavoritesLink";
import { readSignedInFavoritesCount } from "./favorites-count-action";

/** How long to wait for a burst of changes to settle before re-counting. */
const RECOUNT_DELAY_MS = 250;

type Detail = { count?: number; delta?: number };

/**
 * Optional payload on the favourites-changed event. The plain `Event` of the
 * guest contract carries none; a sender that already knows the new total (or
 * the step) can put it in a CustomEvent's detail for an instant update.
 */
function readDetail(event: Event): Detail {
  if (!(event instanceof CustomEvent)) return {};
  const detail: unknown = event.detail;
  if (typeof detail !== "object" || detail === null) return {};
  const { count, delta } = detail as { count?: unknown; delta?: unknown };
  return {
    count:
      typeof count === "number" && Number.isInteger(count) && count >= 0
        ? count
        : undefined,
    delta: typeof delta === "number" && Number.isInteger(delta) ? delta : undefined,
  };
}

/**
 * The navbar badge for a signed-in visitor.
 *
 * `count` is the server's figure, rendered inside the layout's Suspense hole.
 * The root layout does not re-render on client-side navigation, so without
 * help a car saved on a detail page would leave the badge stale until a full
 * reload. On every favourites-changed event this therefore:
 *
 *   - uses `detail.count` as the new total when the sender provides it, or
 *     applies `detail.delta` optimistically;
 *   - otherwise (and after a delta, to confirm it) re-counts in the database
 *     through a tiny server action, coalescing bursts.
 *
 * The override is remembered against the server figure it was made from, so
 * the moment a fresh server render arrives (router.refresh, a server action
 * calling refresh()) the server wins again with no effect to reset it.
 */
export function SignedInFavoritesCount({ count }: { count: number }) {
  const [override, setOverride] = useState<{ base: number; value: number } | null>(null);
  const shown = override !== null && override.base === count ? override.value : count;

  useEffect(() => {
    let sequence = 0;
    let timer = 0;

    const onChange = (event: Event) => {
      const detail = readDetail(event);
      if (detail.count !== undefined) {
        sequence += 1; // any recount already in flight is now stale
        window.clearTimeout(timer);
        setOverride({ base: count, value: detail.count });
        return;
      }
      if (detail.delta !== undefined) {
        const delta = detail.delta;
        setOverride((previous) => ({
          base: count,
          value: Math.max(
            0,
            (previous !== null && previous.base === count ? previous.value : count) +
              delta,
          ),
        }));
      }

      window.clearTimeout(timer);
      const mine = ++sequence;
      timer = window.setTimeout(() => {
        readSignedInFavoritesCount()
          .then((value) => {
            if (mine === sequence && value !== null) setOverride({ base: count, value });
          })
          .catch(() => {
            // Offline or the action failed: keep what is shown; the next
            // server render corrects it.
          });
      }, RECOUNT_DELAY_MS);
    };

    window.addEventListener(FAVORITES_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, onChange);
      window.clearTimeout(timer);
      sequence += 1;
    };
  }, [count]);

  return <CountBadge count={shown} />;
}
