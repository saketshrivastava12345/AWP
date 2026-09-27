"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { CarCard } from "@/components/cars/CarCard";
import { CarCardSkeleton } from "@/components/cars/CarCardSkeleton";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { useCatalogCards, useRecentlyViewed } from "@/lib/favorites/recent-hooks";

/** For the derived "Discontinued" line; computed once, not on every render. */
const CURRENT_YEAR = new Date().getUTCFullYear();

/*
 * A snap carousel of the same cards as the saved list. It bleeds to the
 * screen edge on phones so the next card peeks in, which is the cue that the
 * row scrolls; from 640px the cards fit more of the row.
 */
const TRACK = cn(
  "no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:gap-6",
  "max-sm:-mx-5 max-sm:scroll-px-5 max-sm:px-5",
);
const SLIDE =
  "w-[80%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2.4)] lg:w-[calc((100%-4.5rem)/4)]";

type Edges = { atStart: boolean; atEnd: boolean };

/**
 * Whether the track can scroll further either way, for the arrow buttons.
 * Updated from scroll, resize and child-list events (never synchronously in
 * the effect), so the arrows disable at the ends and hide when all fits.
 */
function useCarousel() {
  const [track, setTrack] = useState<HTMLUListElement | null>(null);
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: true });

  useEffect(() => {
    if (!track) return;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const atStart = track.scrollLeft <= 1;
      const atEnd = track.scrollLeft >= max - 1;
      setEdges((previous) =>
        previous.atStart === atStart && previous.atEnd === atEnd
          ? previous
          : { atStart, atEnd },
      );
    };
    const resize = new ResizeObserver(update);
    resize.observe(track);
    const mutation = new MutationObserver(update);
    mutation.observe(track, { childList: true });
    track.addEventListener("scroll", update, { passive: true });
    return () => {
      resize.disconnect();
      mutation.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, [track]);

  const scroll = (direction: 1 | -1) => {
    if (!track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.9,
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return [setTrack, edges, scroll] as const;
}

/**
 * Cars opened recently: this device's list, merged with the account's when
 * signed in (so a car looked at on a phone shows up on the laptop).
 */
export function RecentlyViewed({ className }: { className?: string }) {
  const { entries, loading, signedIn, clear } = useRecentlyViewed();
  const toast = useToast();
  const [clearing, setClearing] = useState(false);
  const [attachTrack, edges, scrollTrack] = useCarousel();
  const cards = useCatalogCards(entries.map((entry) => entry.id));
  // Cars that left the catalogue are simply not shown: a history list is
  // not the place to report them.
  const shown = cards.filter(
    ({ entry }) => entry.status === "ready" || entry.status === "loading",
  );

  const onClear = async () => {
    setClearing(true);
    const ok = await clear();
    setClearing(false);
    toast(
      ok
        ? {
            title: "Recently viewed cleared",
            description: signedIn ? "On this device and in your account." : undefined,
          }
        : {
            title: "Couldn’t clear your account’s history",
            description: "This device was cleared. Try again for the account.",
            tone: "error",
          },
    );
  };

  return (
    <section aria-labelledby="recently-viewed-heading" className={className}>
      <div className="flex items-end justify-between gap-4">
        <h2 id="recently-viewed-heading" className="scroll-mt-32 text-h2">
          Recently viewed
        </h2>
        <div className="flex items-center gap-2">
          {entries.length > 0 ? (
            <Button
              variant="link"
              size="sm"
              arrow={false}
              loading={clearing}
              onClick={onClear}
              className="text-ink-300"
            >
              Clear history
            </Button>
          ) : null}
          {edges.atStart && edges.atEnd ? null : (
            <div className="ml-4 hidden gap-2 sm:flex">
              <IconButton
                variant="outline"
                size="sm"
                label="Scroll back"
                disabled={edges.atStart}
                onClick={() => scrollTrack(-1)}
              >
                <ChevronLeft className="size-[18px]" aria-hidden="true" />
              </IconButton>
              <IconButton
                variant="outline"
                size="sm"
                label="Scroll forward"
                disabled={edges.atEnd}
                onClick={() => scrollTrack(1)}
              >
                <ChevronRight className="size-[18px]" aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </div>
      </div>

      {loading && entries.length === 0 ? (
        <ul aria-hidden="true" className={cn(TRACK, "mt-8 overflow-hidden")}>
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={SLIDE}>
              <CarCardSkeleton />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <p className="mt-6 flex items-center gap-3 text-body text-ink-400">
          <History className="size-5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
          Cars you open will appear here
          {signedIn ? ", on every device you sign in on" : ""}.
        </p>
      ) : (
        <ul
          ref={attachTrack}
          aria-label="Recently viewed cars"
          className={cn(TRACK, "mt-8")}
        >
          {shown.map(({ id, entry }) =>
            entry.status === "ready" ? (
              <li key={id} className={SLIDE}>
                <CarCard
                  car={entry.car}
                  variant="compact"
                  currentYear={CURRENT_YEAR}
                  actions={
                    <FavoriteToggle
                      variantId={id}
                      carName={carDisplayName(
                        entry.car.manufacturer_name,
                        entry.car.model_name,
                        entry.car.variant_name,
                      )}
                      appearance="icon"
                    />
                  }
                />
              </li>
            ) : (
              <li key={id} aria-hidden="true" className={SLIDE}>
                <CarCardSkeleton />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
