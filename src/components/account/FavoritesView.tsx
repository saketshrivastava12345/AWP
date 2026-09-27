"use client";

import { useState } from "react";
import { CloudOff, Heart, MonitorSmartphone, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { Reveal } from "@/components/fx/Reveal";
import { CarCard } from "@/components/cars/CarCard";
import { CarCardSkeleton } from "@/components/cars/CarCardSkeleton";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { useFavorites } from "@/lib/favorites/hooks";
import { retryCatalogCards, useCatalogCards } from "@/lib/favorites/recent-hooks";
import { removeFavorites } from "@/lib/favorites/store";

/** For the derived "Discontinued" badge; computed once, not on every render. */
const CURRENT_YEAR = new Date().getUTCFullYear();

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6";

/*
 * A bay of the garage: the card sits in a rounded frame that lights up cyan
 * and glows on hover/focus (the card's own hover stays inside). The glow is a
 * box-shadow on this wrapper, not on the reveal element, so the stagger
 * transition and the hover transition never fight.
 */
const BAY =
  "rounded-card transition-[box-shadow,translate] duration-(--duration-base) ease-standard " +
  "hover:shadow-glow-cyan focus-within:shadow-glow-cyan motion-safe:hover:-translate-y-0.5";

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
      {/* One readout: the count as telemetry; the empty state below says the rest. */}
      <p className="flex min-h-6 items-baseline gap-3 empty:min-h-0" aria-live="polite">
        {!ready ? (
          <span className="text-lead text-ink-300">Loading your saved cars…</span>
        ) : ids.length === 0 ? null : (
          <>
            <span className="text-figure text-ink-50 glow-text">{ids.length}</span>
            <span className="text-label">
              saved{signedIn ? " to your account" : " in this browser"}
            </span>
          </>
        )}
      </p>

      {ready && !signedIn && ids.length > 0 ? (
        <aside
          aria-label="Saved in this browser"
          className="relative mt-8 flex flex-col gap-x-6 gap-y-1 rounded-card py-2 pr-4 pl-4 hud-panel sm:flex-row sm:items-center sm:justify-between sm:pl-5"
        >
          <span aria-hidden="true" className="hud-brackets -m-px [--hud-l:10px]" />
          <p className="flex items-start gap-3 py-2 text-body-s text-ink-300 sm:items-center">
            <MonitorSmartphone
              className="mt-0.5 size-[18px] shrink-0 text-cyan-300 drop-shadow-[0_0_6px_oklch(0.8_0.14_210/60%)] sm:mt-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>
              <span className="text-ink-100">Saved in this browser only.</span> Sign in to
              keep them on every device.
            </span>
          </p>
          <ButtonLink
            href="/login?next=%2Ffavorites"
            variant="link"
            size="sm"
            className="ml-[30px] shrink-0 self-start sm:ml-0 sm:self-auto"
          >
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
        <>
          <h2 className="sr-only">Your saved cars</h2>
          <EmptyState
            className="mt-10"
            icon={<Heart className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="No saved cars yet"
            description="Press the heart on any car to keep it here, ready to compare or come back to."
            action={
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                <ButtonLink href="/cars" magnetic>
                  Browse cars
                </ButtonLink>
                {signedIn ? null : (
                  <ButtonLink href="/login?next=%2Ffavorites" variant="link">
                    Sign in to see your account’s cars
                  </ButtonLink>
                )}
              </div>
            }
          />
        </>
      ) : (
        <>
          <h2 className="sr-only">Your saved cars</h2>
          {visible.length > 0 ? (
            <Reveal as="ul" stagger aria-label="Saved cars" className={cn(GRID, "mt-10")}>
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
                        BAY,
                        "flex-1 transition-opacity duration-(--duration-normal)",
                        removed && "opacity-45 hover:shadow-none",
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
                      <p className="mt-3 text-caption">
                        Removed. Press the heart to save it again.
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </Reveal>
          ) : null}

          {missing.length > 0 ? (
            <div className="mt-8 flex flex-col gap-3 rounded-card border border-line bg-surface-1/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-body-s text-ink-300">
                {missing.length === 1
                  ? "1 saved car is no longer in the catalogue."
                  : `${missing.length} saved cars are no longer in the catalogue.`}
              </p>
              <Button variant="ghost" size="sm" onClick={removeMissing}>
                Remove {missing.length === 1 ? "it" : "them"}
              </Button>
            </div>
          ) : null}

          {failed.length > 0 ? (
            <div
              role="alert"
              className="mt-8 flex flex-col gap-3 rounded-card border border-signal-negative/40 bg-surface-1/80 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-center gap-3 text-body-s text-ink-200">
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
                onClick={() => retryCatalogCards(failed)}
              >
                <RotateCw aria-hidden="true" />
                Try again
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
