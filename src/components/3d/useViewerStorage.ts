"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { CarColor } from "@/types/domain";
import {
  QUALITY_STORAGE_KEY,
  parseQualitySetting,
  type QualitySetting,
} from "@/lib/viewer-quality";
import { sanitizeConfig, type ViewerConfig } from "@/lib/viewer-paint";

/**
 * The viewer's remembered choices.
 *
 *   quality       localStorage, for every car: it describes the device.
 *   configuration sessionStorage, per car: a paint chosen for one car should
 *                 not follow the visitor to the next, or outlive the visit.
 *
 * Storage can be unavailable (private windows, blocked site data), so every
 * access is guarded and falls back to memory for the rest of the page's life.
 * Read through useSyncExternalStore with a server snapshot, so the first
 * client render matches the server and the stored value follows.
 */

const CHANGE = "aurix:viewer-storage";
const memory = new Map<string, string | null>();

function read(area: "local" | "session", key: string): string | null {
  try {
    const storage = area === "local" ? window.localStorage : window.sessionStorage;
    return storage.getItem(key);
  } catch {
    return memory.get(`${area}:${key}`) ?? null;
  }
}

function write(area: "local" | "session", key: string, value: string | null): void {
  memory.set(`${area}:${key}`, value);
  try {
    const storage = area === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Memory holds it for this page.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE, callback);
  };
}

export function useStoredQuality(): [QualitySetting, (setting: QualitySetting) => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read("local", QUALITY_STORAGE_KEY),
    () => null,
  );
  const set = useCallback((setting: QualitySetting) => {
    write("local", QUALITY_STORAGE_KEY, setting);
  }, []);
  return [parseQualitySetting(raw), set];
}

export function useStoredConfig(
  key: string,
  defaults: ViewerConfig,
  colors: readonly CarColor[],
): [ViewerConfig, (config: ViewerConfig) => void, () => void] {
  const raw = useSyncExternalStore(
    subscribe,
    () => read("session", key),
    () => null,
  );
  const config = useMemo(() => {
    if (!raw) return defaults;
    try {
      return sanitizeConfig(JSON.parse(raw) as unknown, defaults, colors);
    } catch {
      return defaults;
    }
  }, [raw, defaults, colors]);
  const set = useCallback(
    (next: ViewerConfig) => write("session", key, JSON.stringify(next)),
    [key],
  );
  const reset = useCallback(() => write("session", key, null), [key]);
  return [config, set, reset];
}
