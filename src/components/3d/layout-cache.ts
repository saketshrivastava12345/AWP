import { useMemo } from "react";
import type { CarBuild } from "@/lib/car-build";
import { LruCache, stableKey } from "@/lib/viewer-lru";
import { computeLayout, type CarLayout } from "./car-layout";

/**
 * Car layouts, cached by the content of their build.
 *
 * The anatomy tour and the interactive viewer are handed equal builds; with
 * this cache they get the same layout object, and through it the same body
 * and systems geometry (geometry-cache.ts). A handful of entries is plenty:
 * a page shows one car, and client navigation visits a few.
 */
const layouts = new LruCache<string, CarLayout>(6);

export function carBuildKey(build: CarBuild): string {
  return stableKey(build);
}

export function getCarLayout(build: CarBuild): CarLayout {
  return layouts.getOrCreate(carBuildKey(build), () => computeLayout(build));
}

/** The layout for a build, identical across canvases showing the same car. */
export function useCarLayout(build: CarBuild): CarLayout {
  return useMemo(() => getCarLayout(build), [build]);
}
