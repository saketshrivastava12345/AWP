"use client";

import Image from "next/image";
import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * How eagerly to fetch: `preload` puts the image in the document head (the
 * likely LCP card), `eager` loads it straight away without jumping the queue
 * (the rest of the first row), `lazy` waits until it nears the viewport.
 */
export type PhotoLoading = "preload" | "eager" | "lazy";

/**
 * A car's photograph that degrades to a placeholder instead of breaking.
 *
 * A `car_media` row can outlive its file — a photograph fetched on one
 * machine and never committed, say — and next/image then renders an empty
 * frame with the alt text across it. That is worse than having no photograph
 * at all, so any load failure swaps in the fallback the card provides.
 *
 * The ref check covers the case the error event cannot: an image that failed
 * before React hydrated, whose `error` event has already fired unheard.
 */
export function CarPhoto({
  src,
  alt,
  sizes,
  loading = "lazy",
  className,
  fallback,
}: {
  src: string;
  alt: string;
  sizes: string;
  loading?: PhotoLoading;
  className?: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  const checkAlreadyFailed = useCallback((image: HTMLImageElement | null) => {
    if (image && image.complete && image.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <>{fallback}</>;

  return (
    <Image
      ref={checkAlreadyFailed}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      // `preload` and `loading` must not be combined (Next 16).
      {...(loading === "preload"
        ? { preload: true }
        : { loading: loading === "eager" ? ("eager" as const) : ("lazy" as const) })}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  );
}
