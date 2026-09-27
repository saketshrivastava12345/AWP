"use client";

import { useState } from "react";
import { CloudOff, Heart, LogIn, MonitorSmartphone, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { CarCard } from "@/components/cars/CarCard";
import { CarCardSkeleton } from "@/components/cars/CarCardSkeleton";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { useFavorites } from "@/lib/favorites/hooks";
import { retryCatalogCards, useCatalogCards } from "@/lib/favorites/recent-hooks";
import { removeFavorites } from "@/lib/favorites/store";

/** For the derived "Discontinued" badge; computed once, not on every render. */
const CURRENT_YEAR = new Date().getUTCFullYear();

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3";

/**
 * The saved-cars list: the account's when signed in, this browser's for a
 * guest. A static page shell renders around it, so no cookie is read on the
 * server and the route stays prerendered.
 *
 * A car removed here stays on screen, dimmed, until the visitor leaves — the
 * heart puts it back — so a slip of the finger is never a lost favourite.
 */
export function FavoritesView() {
  const { ready, signedIn, ids } = useFavorites();
  const toast = useToast();

  // What is on screen: everything saved, plus anything removed during this
  // visit. Reset when the list changes owner (sign-in or sign-out).
  const owner = ready ? (signedIn ? "account" : "device") : "unknown";
  const [shownFor, setShownFor] = useState(owner);
  const [shown, setShown] = useState<readonly string[]>(ids);
  const [seenIds, setSeenIds] = useState(ids);
  if (owner !== shownFor) {
    setShownFor(owner);
    setShown(ids);
    setSeenIds(ids);
  } else if (ids !== seenIds) {
    setSeenIds(ids);
    const added = ids.filter((id) => !shown.includes(id));
    if (added.length > 0) setShown([...added, ...shown]);
  }

  const cards = useCatalogCards(shown);
  const saved = new Set(ids);
  const missing = cards
    .filter(({ id, entry }) => entry.status === "missing" && saved.has(id))
    .map(({ id }) => id);
  const failed = cards
    .filter(({ entry }) => entry.status === "error")
    .map(({ id }) => id);
  const visible = cards.filter(
    ({ entry }) => entry.status === "loading" || entry.status === "ready",
  );

  const removeMissing = async () => {
    const ok = await removeFavorites(missing);
    toast(
      ok
        ? { title: "Removed cars that left the catalogue" }
        : {
            title: "Couldn’t remove them just now",
            description: "Check your connection and try again.",
            tone: "error",
          },
    );
  };

  return (
    <div className="mt-6">
      <p className="min-h-5 text-sm text-ink-400" aria-live="polite">
        {!ready
          ? "Loading your saved cars…"
          : `${ids.length === 0 ? "Nothing" : ids.length} saved${
              signedIn ? " to your account" : " on this device"
            }`}
      </p>

      {ready && !signedIn ? (
        <aside
          aria-label="Saved on this device"
          className="mt-8 flex flex-col gap-4 rounded-md border border-line bg-surface-1 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-4">
            <MonitorSmartphone
              className="mt-0.5 size-5 shrink-0 text-gold-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm text-ink-100">
                These cars are saved in this browser only.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                Clearing site data or switching devices loses them. Sign in and they move
                to your account, where they follow you everywhere.
              </p>
            </div>
          </div>
          <ButtonLink
            href="/login?next=%2Ffavorites"
            variant="secondary"
            size="sm"
            className="h-11 shrink-0 self-start sm:self-auto"
          >
            <LogIn className="size-3.5" aria-hidden="true" />
            Sign in
          </ButtonLink>
        </aside>
      ) : null}

      {!ready ? (
        <ul aria-hidden="true" className={cn(GRID, "mt-10")}>
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index}>
              <CarCardSkeleton />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={<Heart className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="No saved cars yet"
          description="Press the heart on any car to keep it here, ready to compare or come back to."
          action={
            <ButtonLink href="/cars" variant="secondary" size="sm" className="h-11">
              Browse the collection
            </ButtonLink>
          }
        />
      ) : (
        <>
          {visible.length > 0 ? (
            <ul aria-label="Saved cars" className={cn(GRID, "mt-10")}>
              {visible.map(({ id, entry }, index) => {
                if (entry.status !== "ready") {
                  return (
                    <li key={id} aria-hidden="true">
                      <CarCardSkeleton />
                    </li>
                  );
                }
                const car = entry.car;
                const name = carDisplayName(
                  car.manufacturer_name,
                  car.model_name,
                  car.variant_name,
                );
                const removed = !saved.has(id);
                return (
                  <li key={id} className="flex flex-col">
                    <div
                      className={cn(
                        "flex-1 transition-opacity duration-(--duration-normal)",
                        removed && "opacity-45",
                      )}
                    >
                      <CarCard
                        car={car}
                        currentYear={CURRENT_YEAR}
                        loading={index < 3 ? "eager" : "lazy"}
                        sizes="(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        actions={
                          <FavoriteToggle
                            variantId={id}
                            carName={name}
                            appearance="icon"
                          />
                        }
                      />
                    </div>
                    {removed ? (
                      <p className="mt-2 text-xs text-ink-400">
                        Removed. Press the heart to save it again.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : null}

          {missing.length > 0 ? (
            <div className="mt-8 flex flex-col gap-3 rounded-md border border-dashed border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-300">
                {missing.length === 1
                  ? "1 saved car is no longer in the catalogue."
                  : `${missing.length} saved cars are no longer in the catalogue.`}
              </p>
              <Button variant="ghost" size="sm" className="h-11" onClick={removeMissing}>
                Remove {missing.length === 1 ? "it" : "them"}
              </Button>
            </div>
          ) : null}

          {failed.length > 0 ? (
            <div
              role="alert"
              className="mt-8 flex flex-col gap-3 rounded-md border border-signal-negative/40 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-center gap-3 text-sm text-ink-200">
                <CloudOff
                  className="size-4 shrink-0 text-signal-negative"
                  aria-hidden="true"
                />
                {failed.length === 1
                  ? "1 saved car could not be loaded."
                  : `${failed.length} saved cars could not be loaded.`}
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="h-11"
                onClick={() => retryCatalogCards(failed)}
              >
                <RotateCw className="size-3.5" aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
