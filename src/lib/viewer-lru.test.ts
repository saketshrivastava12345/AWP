import { describe, expect, it } from "vitest";
import { GENERIC_BUILD } from "./car-build";
import { LruCache, stableKey } from "./viewer-lru";

describe("LruCache", () => {
  it("evicts the least recently used entry", () => {
    const cache = new LruCache<string, number>(2);
    cache.set("a", 1).set("b", 2);
    expect(cache.get("a")).toBe(1); // a is now the most recent
    cache.set("c", 3);
    expect(cache.has("b")).toBe(false);
    expect(cache.keys()).toEqual(["a", "c"]);
  });

  it("creates each value once", () => {
    const cache = new LruCache<string, { built: number }>(4);
    let builds = 0;
    const make = () => ({ built: ++builds });
    const first = cache.getOrCreate("911", make);
    const second = cache.getOrCreate("911", make);
    expect(second).toBe(first);
    expect(builds).toBe(1);
  });

  it("rejects a zero capacity", () => {
    expect(() => new LruCache(0)).toThrow(RangeError);
  });
});

describe("stableKey", () => {
  it("ignores property order", () => {
    expect(stableKey({ a: 1, b: { c: 2, d: 3 } })).toBe(
      stableKey({ b: { d: 3, c: 2 }, a: 1 }),
    );
  });

  it("gives the same car build the same key however it was assembled", () => {
    const reordered = Object.fromEntries(Object.entries(GENERIC_BUILD).reverse());
    expect(stableKey(reordered)).toBe(stableKey(GENERIC_BUILD));
    expect(stableKey({ ...GENERIC_BUILD, cylinders: 6 })).not.toBe(
      stableKey(GENERIC_BUILD),
    );
  });
});
