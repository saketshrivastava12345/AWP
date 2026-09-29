"use client";

import { AI_ILLUSTRATION_BADGE, AI_ILLUSTRATION_NOTE } from "@/lib/media-kind";
import Image from "next/image";
import { useCallback, useState, type CSSProperties } from "react";
import { Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "@/lib/detail/gallery";
import type { Silhouette } from "@/components/cars/car-silhouette";
import { GalleryLightbox } from "./GalleryLightbox";
import { PhotoCredit } from "./PhotoCredit";
import { SilhouetteArt } from "./SilhouetteArt";

/**
 * The interactive part of the gallery: a small mosaic and the lightbox.
 *
 * Props (all prepared by the server Gallery):
 *   items    photographs in display order, each with its credit
 *   carName  for labels
 *   shape    the body-style silhouette shown if a photograph fails to load
 *
 * One photograph: a 4:3 frame, never wider than the file itself (a small
 * photograph is centred, not upscaled). Two: side by side. Three or more: one
 * large over two small, the last small tile offering the rest ("+4") in the
 * lightbox. A file that fails to load is replaced by the silhouette, marked
 * unavailable, and skipped by the lightbox — a broken-image icon never appears.
 */
export function GalleryViewer({
  items,
  carName,
  shape,
  className,
}: {
  items: GalleryItem[];
  carName: string;
  shape: Silhouette;
  className?: string;
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);

  const markFailed = useCallback((id: string) => {
    setFailed((previous) => (previous.has(id) ? previous : new Set(previous).add(id)));
  }, []);
  const close = useCallback(() => setOpenId(null), []);

  const available = items.filter((item) => !failed.has(item.id));
  const openIndex = openId ? available.findIndex((item) => item.id === openId) : -1;

  const lightbox =
    openIndex >= 0 ? (
      <GalleryLightbox
        items={available}
        index={openIndex}
        onIndexChange={(index) => setOpenId(available[index]?.id ?? null)}
        onClose={close}
        carName={carName}
      />
    ) : null;

  // ---------------------------------------------------- nothing would load
  if (available.length === 0 && failed.size > 0) {
    return (
      <figure className={className}>
        <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-surface-1 px-6">
          <SilhouetteArt shape={shape} className="w-[min(78%,30rem)] opacity-70" />
        </div>
        <figcaption className="mt-3 text-caption">
          Drawing · {items.length === 1 ? "the catalogued photograph" : "the photographs"}{" "}
          of the {carName} could not be loaded. The drawing shows the body style, not the
          car itself.
        </figcaption>
      </figure>
    );
  }

  const label = (item: GalleryItem) => {
    const position = available.findIndex((entry) => entry.id === item.id);
    return available.length > 1
      ? `Open photograph ${position + 1} of ${available.length}: ${item.alt}`
      : `Open the photograph of the ${carName} full screen`;
  };

  // --------------------------------------------------------- one photograph
  const only = items.length === 1 ? items[0] : undefined;
  if (only) {
    return (
      <figure className={cn("mx-auto w-full", className)} style={capWidth(only)}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-1">
          <Tile
            item={only}
            failed={failed.has(only.id)}
            onFail={markFailed}
            onOpen={() => setOpenId(only.id)}
            label={label(only)}
            sizes="(min-width: 1024px) 720px, 100vw"
            shape={shape}
          />
        </div>
        <Caption item={only} />
        {lightbox}
      </figure>
    );
  }

  // ------------------------------------------------------------- the mosaic
  const lead = items.length >= 3 ? items[0] : undefined;
  const small = lead ? items.slice(1, 3) : items.slice(0, 2);
  const rest = items.length - (lead ? 3 : 2);

  return (
    <div className={className}>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {lead ? (
          <li className="col-span-2">
            <figure>
              <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-surface-1">
                <Tile
                  item={lead}
                  failed={failed.has(lead.id)}
                  onFail={markFailed}
                  onOpen={() => setOpenId(lead.id)}
                  label={label(lead)}
                  sizes="(min-width: 1024px) 720px, 100vw"
                  shape={shape}
                />
              </div>
              <Caption item={lead} />
            </figure>
          </li>
        ) : null}
        {small.map((item, index) => {
          const more = index === small.length - 1 && rest > 0 ? rest : 0;
          return (
            <li key={item.id}>
              <figure>
                <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-1">
                  <Tile
                    item={item}
                    failed={failed.has(item.id)}
                    onFail={markFailed}
                    onOpen={() => setOpenId(item.id)}
                    label={
                      more > 0
                        ? `${label(item)}. ${more} more photograph${more === 1 ? "" : "s"} in the viewer`
                        : label(item)
                    }
                    sizes="(min-width: 1024px) 360px, 50vw"
                    shape={shape}
                    more={more}
                  />
                </div>
                <Caption item={item} />
              </figure>
            </li>
          );
        })}
      </ul>
      {lightbox}
    </div>
  );
}

/** Never show a photograph wider than its own pixels. */
function capWidth(item: GalleryItem): CSSProperties | undefined {
  return item.width && item.width > 0 ? { maxWidth: `${item.width}px` } : undefined;
}

function Caption({ item }: { item: GalleryItem }) {
  return (
    <figcaption className="mt-2.5 space-y-0.5">
      <p className="text-caption text-ink-300">
        {item.shot}
        {item.scope === "model" ? " · model photograph" : ""}
      </p>
      <PhotoCredit credit={item.credit} />
    </figcaption>
  );
}

/** One photograph (or its unavailable state), filling its frame. */
function Tile({
  item,
  failed,
  onFail,
  onOpen,
  label,
  sizes,
  shape,
  more = 0,
}: {
  item: GalleryItem;
  failed: boolean;
  onFail: (id: string) => void;
  onOpen: () => void;
  label: string;
  sizes: string;
  shape: Silhouette;
  /** Photographs beyond the mosaic, offered on this tile ("+4"). */
  more?: number;
}) {
  // Covers the error the event cannot: a file that failed before hydration.
  const checkAlreadyFailed = useCallback(
    (image: HTMLImageElement | null) => {
      if (image && image.complete && image.naturalWidth === 0) onFail(item.id);
    },
    [item.id, onFail],
  );

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-1">
        <SilhouetteArt shape={shape} className="w-[58%] max-w-72 opacity-70" />
        <span className="text-caption">Photograph unavailable</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="group/tile absolute inset-0 block cursor-zoom-in focus-visible:outline-offset-[-2px]"
    >
      <Image
        ref={checkAlreadyFailed}
        src={item.url}
        alt={item.alt}
        fill
        sizes={sizes}
        unoptimized={!item.optimize}
        onError={() => onFail(item.id)}
        className={cn(
          // A very wide image (a panoramic crop) is letterboxed rather than
          // cropped to the frame and blown up past its resolution.
          isPanoramic(item) ? "object-contain" : "object-cover",
          "transition-transform duration-(--duration-normal) ease-standard group-hover/tile:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/tile:scale-100",
        )}
      />
      {item.credit?.aiGenerated ? (
        <span
          title={AI_ILLUSTRATION_NOTE}
          className="pointer-events-none absolute bottom-2 left-2 z-[3] rounded-[3px] border border-violet-400/50 bg-void/85 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-ink-50 uppercase"
        >
          {AI_ILLUSTRATION_BADGE}
        </span>
      ) : null}
      {more > 0 ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-void/60 text-h3 text-ink-50"
        >
          +{more}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-void/70 text-ink-100 opacity-0 backdrop-blur-sm transition-opacity duration-(--duration-fast) group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
        >
          <Maximize2 className="size-3.5" />
        </span>
      )}
    </button>
  );
}

/** Wider than about 2:1, where cropping to a 4:3 or 16:10 frame loses most of the car. */
function isPanoramic(item: { width: number | null; height: number | null }): boolean {
  return item.width !== null && item.height !== null && item.width / item.height > 1.9;
}
