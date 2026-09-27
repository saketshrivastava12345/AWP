"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import type { PowertrainKind } from "@/types/domain";
import { CarSilhouette } from "./CarSilhouette";

/**
 * A car's photograph in a fixed frame, with its credit, falling back to the
 * body-style silhouette when there is no photograph or the file fails to
 * load. The credit is only shown while the photograph it credits is.
 *
 * A `car_media` row can outlive its file, so a load failure swaps in the
 * silhouette rather than leaving an empty frame. The ref check covers an
 * image that failed before hydration, whose error event already fired
 * unheard (the same approach as the catalogue's CarPhoto).
 */
export function CarThumb({
  src,
  alt,
  bodyType,
  powertrain,
  sizes,
  credit = null,
  caption = false,
  eager = false,
  reserveCredit = false,
  className,
  frameClassName,
}: {
  src: string | null;
  alt: string;
  bodyType: string | null;
  powertrain: PowertrainKind;
  sizes: string;
  /** Photo credit, shown under the frame while the photograph is shown. */
  credit?: string | null;
  /** "Drawing · no photograph" under the silhouette, when there is room for it. */
  caption?: boolean;
  /** Load immediately (the page's largest image, above the fold). */
  eager?: boolean;
  /** Keep two lines under the frame even without a credit, so a row of frames lines up. */
  reserveCredit?: boolean;
  /** Classes for the outer element (width, margins). */
  className?: string;
  /** Classes for the photo frame (aspect, size, border, radius). */
  frameClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const checkAlreadyFailed = useCallback((image: HTMLImageElement | null) => {
    if (image && image.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  const showPhoto = src !== null && !failed;

  return (
    <div className={className}>
      <div className={cn("relative overflow-hidden bg-surface-2", frameClassName)}>
        {showPhoto ? (
          <Image
            ref={checkAlreadyFailed}
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            onError={() => setFailed(true)}
            className="object-cover"
          />
        ) : (
          <CarSilhouette bodyType={bodyType} powertrain={powertrain} caption={caption} />
        )}
      </div>
      {showPhoto && credit ? (
        <p
          className={cn(
            "mt-2 line-clamp-2 text-nano leading-snug text-ink-500",
            reserveCredit && "h-[2lh]",
          )}
        >
          {credit}
        </p>
      ) : reserveCredit ? (
        <p aria-hidden="true" className="mt-2 h-[2lh] text-nano leading-snug" />
      ) : null}
    </div>
  );
}
