/**
 * Catalogue card rows for a list of variant ids, fetched from GET /api/cars
 * and cached for the life of the page, so the saved list and the recently
 * viewed list never ask for the same car twice.
 */

import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { MAX_CARS_PER_REQUEST } from "./constants";
import { chunk } from "./ids";

export type CardEntry =
  | { status: "loading" }
  | { status: "ready"; car: CatalogCardRow }
  /** Not a published catalogue variant (removed, unpublished or unknown). */
  | { status: "missing" }
  | { status: "error" };

const LOADING: CardEntry = Object.freeze({ status: "loading" });
const MISSING: CardEntry = Object.freeze({ status: "missing" });
const FAILED: CardEntry = Object.freeze({ status: "error" });

const cache = new Map<string, CardEntry>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version++;
  for (const listener of [...listeners]) listener();
}

export function subscribeCards(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Increments on every change; a cheap snapshot for useSyncExternalStore. */
export function getCardsVersion(): number {
  return version;
}

export function getCard(id: string): CardEntry {
  return cache.get(id) ?? LOADING;
}

function isCardRow(value: unknown): value is CatalogCardRow {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { variant_id?: unknown }).variant_id === "string"
  );
}

async function fetchGroup(ids: readonly string[]): Promise<void> {
  try {
    const response = await fetch(`/api/cars?ids=${ids.join(",")}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`GET /api/cars ${response.status}`);
    const body: unknown = await response.json();
    const cars = (body as { cars?: unknown } | null)?.cars;
    if (!Array.isArray(cars)) throw new Error("GET /api/cars: malformed body");

    const found = new Map(cars.filter(isCardRow).map((car) => [car.variant_id, car]));
    for (const id of ids) {
      const car = found.get(id);
      cache.set(id, car ? { status: "ready", car } : MISSING);
    }
  } catch (error) {
    console.warn("Could not load saved cars:", error);
    for (const id of ids) cache.set(id, FAILED);
  }
  emit();
}

/**
 * Make sure these ids are loaded or loading. With `retry`, ids whose last
 * fetch failed are asked for again.
 */
export function requestCards(ids: readonly string[], retry = false): void {
  const needed = ids.filter((id) => {
    const entry = cache.get(id);
    return !entry || (retry && entry.status === "error");
  });
  if (needed.length === 0) return;
  for (const id of needed) cache.set(id, LOADING);
  emit();
  for (const group of chunk(needed, MAX_CARS_PER_REQUEST)) void fetchGroup(group);
}
