import { useEffect, useMemo } from "react";

/**
 * Geometry shared between canvases and across remounts.
 *
 * The lofted body alone is ~20k triangles plus twenty-odd projected decals,
 * each found by raycasting the shell; building it takes a noticeable moment.
 * The anatomy tour and the interactive viewer show the same car, and a
 * viewer that is scrolled far away and back remounts. Both cases now reuse
 * one build.
 *
 * Entries are keyed by the owning layout object (itself cached by build, see
 * layout-cache.ts) and a string. Users are reference-counted from effects:
 * when the last one unmounts the GPU buffers are disposed, but the geometry
 * objects are kept — three.js re-uploads a disposed geometry the next time it
 * is drawn — so a remount costs an upload, not a rebuild. The whole entry is
 * dropped with its layout once the layout leaves its LRU cache.
 */

type Disposable = { dispose(): void };
type Entry = { value: Disposable; refs: number };

const store = new WeakMap<object, Map<string, Entry>>();

function entriesOf(owner: object): Map<string, Entry> {
  let entries = store.get(owner);
  if (!entries) {
    entries = new Map();
    store.set(owner, entries);
  }
  return entries;
}

/** The cached value for (owner, key), built on first request. */
export function cachedGeometry<T extends Disposable>(
  owner: object,
  key: string,
  build: () => T,
): T {
  const entries = entriesOf(owner);
  let entry = entries.get(key);
  if (!entry) {
    entry = { value: build(), refs: 0 };
    entries.set(key, entry);
  }
  return entry.value as T;
}

export function retainGeometry(owner: object, key: string): void {
  const entry = store.get(owner)?.get(key);
  if (entry) entry.refs += 1;
}

/** Drop a reference; the GPU copy is freed when none are left. */
export function releaseGeometry(owner: object, key: string): void {
  const entry = store.get(owner)?.get(key);
  if (!entry) return;
  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs === 0) entry.value.dispose();
}

/** Use a cached build for as long as the component is mounted. */
export function useCachedGeometry<T extends Disposable>(
  owner: object,
  key: string,
  build: () => T,
): T {
  const value = useMemo(() => cachedGeometry(owner, key, build), [owner, key, build]);
  useEffect(() => {
    retainGeometry(owner, key);
    return () => releaseGeometry(owner, key);
  }, [owner, key]);
  return value;
}
