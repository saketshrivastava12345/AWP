"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { BASIS_PATHS, DRACO_PATHS } from "@/lib/viewer-assets";

/**
 * Warm a car's 3D model before the visitor opens it.
 *
 * For catalogue cards: spread the returned handlers on the card, and after
 * ~500 ms of hovering with a mouse the GLB (and the decoders it needs) are
 * fetched at low priority into the HTTP cache. Opening the car page then
 * reads the model from disk instead of the network.
 *
 * Deliberately does not import three.js or the loader: a listing page must
 * stay free of WebGL code, so this only issues plain fetches. Touch devices
 * and data-saver connections are skipped — there is no hover intent to act
 * on, and bandwidth may be precious.
 */

const warmed = new Set<string>();

type RequestInitWithPriority = RequestInit & { priority?: "high" | "low" | "auto" };

function warm(url: string): void {
  if (warmed.has(url)) return;
  warmed.add(url);
  const init: RequestInitWithPriority = { priority: "low", credentials: "same-origin" };
  fetch(url, init)
    .then((response) => response.arrayBuffer())
    .catch(() => {
      // A failed warm-up is harmless: the viewer will fetch it for real.
      warmed.delete(url);
    });
}

/** Fetch a model (and its decoders) into the HTTP cache. */
export function prefetchVehicleModel(
  url: string,
  compression: readonly string[] = [],
): void {
  const methods = compression.map((method) => method.toLowerCase());
  if (methods.some((method) => method.includes("draco"))) DRACO_PATHS.forEach(warm);
  if (methods.some((method) => method.includes("ktx2") || method.includes("basis")))
    BASIS_PATHS.forEach(warm);
  warm(url);
}

type Connection = { saveData?: boolean };

export function useVehicleModelPreload(
  url: string | null | undefined,
  {
    compression = [],
    delay = 500,
  }: { compression?: readonly string[]; delay?: number } = {},
): {
  onPointerEnter: (event: PointerEvent) => void;
  onPointerLeave: () => void;
} {
  const timer = useRef<number | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  useEffect(() => cancel, [cancel]);

  const key = compression.join(",");
  const onPointerEnter = useCallback(
    (event: PointerEvent) => {
      if (!url || event.pointerType !== "mouse") return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const connection = (navigator as Navigator & { connection?: Connection })
        .connection;
      if (connection?.saveData) return;
      cancel();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        prefetchVehicleModel(url, key ? key.split(",") : []);
      }, delay);
    },
    [url, key, delay, cancel],
  );

  return { onPointerEnter, onPointerLeave: cancel };
}
