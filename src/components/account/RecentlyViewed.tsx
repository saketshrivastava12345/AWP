"use client";

import Link from "next/link";
import { useState } from "react";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName, distinctVariantName } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { carHref } from "@/components/cars/CarCard";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";
import { FavoriteToggle } from "@/components/cars/FavoriteButton";
import { useCatalogCards, useRecentlyViewed } from "@/lib/favorites/recent-hooks";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";

const TILE_SIZES =
  "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

function RecentTile({ id, car }: { id: string; car: CatalogCardRow }) {
  const name = carDisplayName(car.manufacturer_name, car.model_name, car.variant_name);
  const variant = distinctVariantName(car.model_name, car.variant_name);
  return (
    <article className="group/tile relative flex h-full flex-col overflow-hidden rounded-md border border-line bg-surface-1 transition-colors duration-(--duration-fast) focus-within:border-gold-600/80 hover:border-gold-700/70">
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
        {car.primary_image_url ? (
          <CarPhoto
            src={car.primary_image_url}
            alt=""
            sizes={TILE_SIZES}
            fallback={<Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />}
          />
        ) : (
          <Silhouette bodyType={car.body_type} fuelType={car.fuel_type} />
        )}
        <div className="absolute top-1.5 right-1.5 z-30">
          <FavoriteToggle variantId={id} carName={name} appearance="icon" />
        </div>
      </div>
      <div className="flex flex-1 flex-col px-4 pt-3 pb-4">
        <p className="truncate text-label text-nano">{car.manufacturer_name}</p>
        <h3 className="mt-1.5 truncate font-display text-xs tracking-[0.03em] text-ink-50">
          <Link
            href={carHref(car)}
            className={cn(
              "outline-none before:absolute before:inset-0 before:z-10 before:rounded-md",
              "focus-visible:before:ring-2 focus-visible:before:ring-gold-500 focus-visible:before:ring-inset",
            )}
          >
            <span className="sr-only">{car.manufacturer_name} </span>
            {car.model_name}
            {variant ? <span className="sr-only"> {variant}</span> : null}
          </Link>
        </h3>
        {variant ? <p className="mt-1 truncate text-xs text-ink-400">{variant}</p> : null}
      </div>
    </article>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4";

/**
 * Cars opened recently: this device's list, merged with the account's when
 * signed in (so a car looked at on a phone shows up on the laptop).
 */
export function RecentlyViewed({ className }: { className?: string }) {
  const { entries, loading, signedIn, clear } = useRecentlyViewed();
  const toast = useToast();
  const [clearing, setClearing] = useState(false);
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
      <div className="flex items-end justify-between gap-4 border-b border-line-subtle pb-4">
        <div>
          <p className="text-label">History</p>
          <h2
            id="recently-viewed-heading"
            className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
          >
            RECENTLY VIEWED
          </h2>
        </div>
        {entries.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            loading={clearing}
            onClick={onClear}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {loading && entries.length === 0 ? (
        <ul aria-hidden="true" className={cn(GRID, "mt-6")}>
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="aspect-[16/10] rounded-md" />
              <Skeleton className="mt-3 h-3 w-24" />
            </li>
          ))}
        </ul>
      ) : shown.length === 0 ? (
        <p className="mt-6 flex items-center gap-3 text-sm text-ink-400">
          <History className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
          Cars you open will appear here
          {signedIn ? ", on every device you sign in on" : ""}.
        </p>
      ) : (
        <ul aria-label="Recently viewed cars" className={cn(GRID, "mt-6")}>
          {shown.map(({ id, entry }) =>
            entry.status === "ready" ? (
              <li key={id}>
                <RecentTile id={id} car={entry.car} />
              </li>
            ) : (
              <li key={id} aria-hidden="true">
                <Skeleton className="aspect-[16/10] rounded-md" />
                <Skeleton className="mt-3 h-3 w-24" />
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}
