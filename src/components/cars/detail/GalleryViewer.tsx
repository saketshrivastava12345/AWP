"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { GalleryGroupId, GalleryItem } from "@/lib/detail/gallery";
import type { Silhouette } from "@/components/cars/car-silhouette";
import { GalleryLightbox } from "./GalleryLightbox";
import { PhotoCredit } from "./PhotoCredit";
import { SilhouetteArt } from "./SilhouetteArt";

/**
 * The interactive part of the gallery: shot-group tabs, a scroll-snap strip
 * (swipe on phones, arrow buttons from `sm` up) and the lightbox.
 *
 * Props (all prepared by the server Gallery):
 *   items    photographs in display order, each with its credit
 *   groups   groups that have photographs; tabs appear only for two or more
 *   carName  for labels
 *   shape    the body-style silhouette shown if a photograph fails to load
 *
 * A single photograph is shown large rather than as a one-item strip. A file
 * that fails to load is replaced by the silhouette, marked unavailable, and
 * skipped by the lightbox — a broken-image icon never appears.
 */
export function GalleryViewer({
  items,
  groups,
  carName,
  shape,
  className,
}: {
  items: GalleryItem[];
  groups: { id: GalleryGroupId; label: string; count: number }[];
  carName: string;
  shape: Silhouette;
  className?: string;
}) {
  const [activeGroup, setActiveGroup] = useState<GalleryGroupId>(
    groups[0]?.id ?? "exterior",
  );
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const stripRef = useRef<HTMLUListElement>(null);
  const tabRefs = useRef(new Map<GalleryGroupId, HTMLButtonElement>());
  const reduced = useReducedMotion();
  const baseId = useId();

  const markFailed = useCallback((id: string) => {
    setFailed((previous) => (previous.has(id) ? previous : new Set(previous).add(id)));
  }, []);
  const close = useCallback(() => setOpenId(null), []);

  const measure = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const start = strip.scrollLeft <= 2;
    const end = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 2;
    setEdges((previous) =>
      previous.start === start && previous.end === end ? previous : { start, end },
    );
  }, []);

  // The strip remounts per group (so it starts scrolled to the beginning);
  // observe whichever one is current. The observer fires once on observe.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(strip);
    return () => observer.disconnect();
  }, [activeGroup, measure]);

  const available = items.filter((item) => !failed.has(item.id));
  const openIndex = openId ? available.findIndex((item) => item.id === openId) : -1;
  const tabs = groups.length > 1;
  const shown = tabs ? items.filter((item) => item.group === activeGroup) : items;

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
      <div
        className={cn(
          "relative flex flex-col items-center overflow-hidden rounded-xs border border-dashed border-line-strong bg-surface-1/40 px-6 py-14 text-center",
          className,
        )}
      >
        <SilhouetteArt shape={shape} className="w-[min(70%,26rem)] opacity-70" />
        <p className="mt-8 font-display text-sm tracking-[0.14em] text-ink-100 uppercase">
          Photograph{items.length === 1 ? "" : "s"} unavailable
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
          {items.length === 1
            ? "The catalogued photograph"
            : "The catalogued photographs"}{" "}
          of the {carName} could not be loaded. The drawing shows the body style, not the
          car itself.
        </p>
      </div>
    );
  }

  // --------------------------------------------------------- one photograph
  const only = items.length === 1 ? items[0] : undefined;
  if (only) {
    return (
      <figure className={className}>
        <div className="relative aspect-[16/9] overflow-hidden rounded-xs border border-line bg-surface-2/60">
          <Tile
            item={only}
            failed={failed.has(only.id)}
            onFail={markFailed}
            onOpen={() => setOpenId(only.id)}
            label={`Open the photograph of the ${carName} full screen`}
            sizes="(min-width: 1280px) 1216px, 100vw"
            shape={shape}
          />
        </div>
        <figcaption className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
          <PhotoCredit credit={only.credit} />
          <span className="shrink-0 text-hud text-ink-600">
            {only.shot}
            {only.scope === "model" ? " · model photograph" : ""}
          </span>
        </figcaption>
        {lightbox}
      </figure>
    );
  }

  // ------------------------------------------------------------- the strip
  const selectGroup = (id: GalleryGroupId, focus = false) => {
    setActiveGroup(id);
    setEdges({ start: true, end: true });
    if (focus) tabRefs.current.get(id)?.focus();
  };

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = groups.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    const group = groups[next];
    if (group) selectGroup(group.id, true);
  };

  const scroll = (direction: 1 | -1) => {
    const strip = stripRef.current;
    if (!strip) return;
    strip.scrollBy({
      left: direction * strip.clientWidth * 0.9,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const overflowing = !(edges.start && edges.end);
  const panelId = `${baseId}-panel`;

  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-4 border-b border-line">
        {tabs ? (
          <div
            role="tablist"
            aria-label="Photograph groups"
            className="-mb-px flex min-w-0 [scrollbar-width:none] gap-1 overflow-x-auto"
          >
            {groups.map((group, index) => {
              const selected = group.id === activeGroup;
              return (
                <button
                  key={group.id}
                  ref={(node) => {
                    if (node) tabRefs.current.set(group.id, node);
                    else tabRefs.current.delete(group.id);
                  }}
                  id={`${baseId}-tab-${group.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectGroup(group.id)}
                  onKeyDown={(event) => onTabKey(event, index)}
                  className={cn(
                    "flex h-11 shrink-0 items-center gap-2 border-b px-3.5 font-display text-[10px] tracking-[0.18em] uppercase transition-colors duration-(--duration-fast)",
                    selected
                      ? "border-gold-500 text-gold-300"
                      : "border-transparent text-ink-400 hover:text-ink-100",
                  )}
                >
                  {group.label}
                  <span className="font-mono text-micro tracking-normal text-ink-500">
                    {group.count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="flex h-11 items-center gap-2 text-hud text-ink-400">
            {groups[0]?.label ?? "Photographs"}
            <span className="text-ink-600">{items.length}</span>
          </p>
        )}

        <div
          className={cn(
            "hidden shrink-0 gap-1 pb-1.5 sm:flex",
            !overflowing && "sm:invisible",
          )}
        >
          <IconButton
            label="Scroll to previous photographs"
            size="sm"
            variant="outline"
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Scroll to next photographs"
            size="sm"
            variant="outline"
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div
        {...(tabs
          ? {
              role: "tabpanel",
              id: panelId,
              "aria-labelledby": `${baseId}-tab-${activeGroup}`,
            }
          : {})}
        className="pt-5"
      >
        <ul
          key={activeGroup}
          ref={stripRef}
          onScroll={measure}
          className="-mx-1 flex snap-x snap-mandatory [scrollbar-width:thin] gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3"
        >
          {shown.map((item) => {
            const position = available.findIndex((entry) => entry.id === item.id);
            return (
              <li
                key={item.id}
                className="w-[84%] shrink-0 snap-start sm:w-[46%] lg:w-[31.8%]"
              >
                <figure>
                  <div className="relative aspect-[3/2] overflow-hidden rounded-xs border border-line bg-surface-2/60">
                    <Tile
                      item={item}
                      failed={failed.has(item.id)}
                      onFail={markFailed}
                      onOpen={() => setOpenId(item.id)}
                      label={`Open photograph ${position + 1} of ${available.length}: ${item.alt}`}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 46vw, 84vw"
                      shape={shape}
                    />
                  </div>
                  <figcaption className="mt-2.5 space-y-1">
                    <p className="text-hud text-ink-600">
                      {item.shot}
                      {item.scope === "model" ? " · model photograph" : ""}
                    </p>
                    <PhotoCredit credit={item.credit} />
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
      {lightbox}
    </div>
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
}: {
  item: GalleryItem;
  failed: boolean;
  onFail: (id: string) => void;
  onOpen: () => void;
  label: string;
  sizes: string;
  shape: Silhouette;
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-surface-2/40 to-surface-1/80">
        <SilhouetteArt shape={shape} className="w-[58%] max-w-72 opacity-70" />
        <span className="text-hud text-ink-500">Photograph unavailable</span>
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
        className="object-cover transition-transform duration-700 ease-cinematic group-hover/tile:scale-[1.03]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-void/70 to-transparent opacity-0 transition-opacity duration-(--duration-fast) group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
      />
      <span
        aria-hidden="true"
        className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full border border-line-strong bg-void/70 text-ink-100 opacity-0 backdrop-blur-sm transition-opacity duration-(--duration-fast) group-hover/tile:opacity-100 group-focus-visible/tile:opacity-100"
      >
        <Maximize2 className="size-3.5" />
      </span>
    </button>
  );
}
