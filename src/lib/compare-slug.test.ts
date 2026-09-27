import { describe, expect, it } from "vitest";
import {
  compareHref,
  MAX_COMPARE,
  MAX_LOOKUPS,
  parseCompareSlug,
  prepareCompareSlugs,
  readCompareParam,
  readDiffParam,
  settleCompareSlugs,
  summariseDropped,
  toCompareSlug,
  withCar,
  withoutCar,
} from "./compare-slug";

describe("parseCompareSlug", () => {
  it("parses manufacturer/model/variant", () => {
    expect(parseCompareSlug("porsche/911/gt3")).toEqual({
      manufacturer: "porsche",
      model: "911",
      variant: "gt3",
    });
  });

  it("forgives what a person might paste", () => {
    const expected = { manufacturer: "porsche", model: "911", variant: "gt3" };
    expect(parseCompareSlug(" /Porsche/911/GT3/ ")).toEqual(expected);
    expect(parseCompareSlug("/cars/porsche/911/gt3")).toEqual(expected);
    expect(
      parseCompareSlug("https://aurix.example/cars/porsche/911/gt3?x=1#top"),
    ).toEqual(expected);
  });

  it("rejects anything that is not three valid slugs", () => {
    expect(parseCompareSlug("")).toBeNull();
    expect(parseCompareSlug("porsche/911")).toBeNull();
    expect(parseCompareSlug("porsche/911/gt3/extra")).toBeNull();
    expect(parseCompareSlug("porsche/911/gt 3")).toBeNull();
    expect(parseCompareSlug("porsche/911/gt3--rs")).toBeNull();
    expect(parseCompareSlug("porsche/9%11/gt3")).toBeNull();
    expect(parseCompareSlug("porsche/911/-gt3")).toBeNull();
    expect(parseCompareSlug("porsche/911/gt3,rs")).toBeNull();
  });
});

describe("toCompareSlug", () => {
  it("joins the three slugs, or returns null when one is missing", () => {
    expect(
      toCompareSlug({ manufacturer_slug: "bmw", model_slug: "m3", variant_slug: "m3" }),
    ).toBe("bmw/m3/m3");
    expect(
      toCompareSlug({ manufacturer_slug: "bmw", model_slug: null, variant_slug: "m3" }),
    ).toBeNull();
  });
});

describe("readCompareParam / readDiffParam", () => {
  it("accepts repeated and comma-separated values, dropping blanks", () => {
    expect(readCompareParam(undefined)).toEqual([]);
    expect(readCompareParam("a/b/c")).toEqual(["a/b/c"]);
    expect(readCompareParam(["a/b/c", " d/e/f ", ""])).toEqual(["a/b/c", "d/e/f"]);
    expect(readCompareParam("a/b/c,d/e/f")).toEqual(["a/b/c", "d/e/f"]);
  });

  it("only an explicit on turns differences-only on", () => {
    expect(readDiffParam("1")).toBe(true);
    expect(readDiffParam("true")).toBe(true);
    expect(readDiffParam(["1", "0"])).toBe(true);
    expect(readDiffParam("0")).toBe(false);
    expect(readDiffParam("yes please")).toBe(false);
    expect(readDiffParam(undefined)).toBe(false);
  });
});

describe("prepareCompareSlugs", () => {
  it("canonicalises, dedupes and reports invalid values", () => {
    const { candidates, dropped } = prepareCompareSlugs([
      "porsche/911/gt3",
      "Porsche/911/GT3",
      "not a car",
      "bmw/m3/m3-competition",
    ]);
    expect(candidates).toEqual(["porsche/911/gt3", "bmw/m3/m3-competition"]);
    expect(dropped).toEqual([
      { value: "Porsche/911/GT3", reason: "duplicate" },
      { value: "not a car", reason: "invalid" },
    ]);
  });

  it("does not let invalid or duplicate values count toward the limit", () => {
    const { candidates } = prepareCompareSlugs([
      "x",
      "a/a/a",
      "a/a/a",
      "y",
      "b/b/b",
      "c/c/c",
      "d/d/d",
    ]);
    expect(candidates).toEqual(["a/a/a", "b/b/b", "c/c/c", "d/d/d"]);
  });

  it("caps lookups and reports the overflow", () => {
    const values = Array.from({ length: MAX_LOOKUPS + 2 }, (_, i) => `m/model/v${i}`);
    const { candidates, dropped } = prepareCompareSlugs(values);
    expect(candidates).toHaveLength(MAX_LOOKUPS);
    expect(dropped.map((entry) => entry.reason)).toEqual(["over-limit", "over-limit"]);
  });

  it("shortens very long values before echoing them", () => {
    const long = "x".repeat(200);
    const { dropped } = prepareCompareSlugs([long]);
    expect(dropped[0]?.value.length).toBeLessThanOrEqual(64);
    expect(dropped[0]?.value.endsWith("…")).toBe(true);
  });
});

describe("settleCompareSlugs", () => {
  it("drops unresolvable cars before applying the limit", () => {
    const candidates = ["gone/gone/gone", "a/a/a", "b/b/b", "c/c/c", "d/d/d", "e/e/e"];
    const { selected, dropped } = settleCompareSlugs(candidates, (slug) =>
      slug.startsWith("gone") ? "not-found" : "found",
    );
    // A stale first entry does not push a real car out.
    expect(selected).toEqual(["a/a/a", "b/b/b", "c/c/c", "d/d/d"]);
    expect(selected).toHaveLength(MAX_COMPARE);
    expect(dropped).toEqual([
      { value: "gone/gone/gone", reason: "not-found" },
      { value: "e/e/e", reason: "over-limit" },
    ]);
  });

  it("reports cars that could not be loaded separately from missing ones", () => {
    const { selected, dropped } = settleCompareSlugs(["a/a/a", "b/b/b"], (slug) =>
      slug === "b/b/b" ? "unavailable" : "found",
    );
    expect(selected).toEqual(["a/a/a"]);
    expect(dropped).toEqual([{ value: "b/b/b", reason: "unavailable" }]);
  });
});

describe("compareHref / withCar / withoutCar", () => {
  it("builds readable addresses", () => {
    expect(compareHref([])).toBe("/compare");
    expect(compareHref(["porsche/911/gt3", "bmw/m3/m3"])).toBe(
      "/compare?car=porsche/911/gt3&car=bmw/m3/m3",
    );
    expect(compareHref(["porsche/911/gt3", "bmw/m3/m3"], { diff: true })).toBe(
      "/compare?car=porsche/911/gt3&car=bmw/m3/m3&diff=1",
    );
    // The flag means nothing without cars.
    expect(compareHref([], { diff: true })).toBe("/compare");
  });

  it("round-trips through URLSearchParams", () => {
    const href = compareHref(["porsche/911/gt3", "tesla/model-s/plaid"]);
    const params = new URL(href, "https://aurix.example").searchParams;
    expect(params.getAll("car")).toEqual(["porsche/911/gt3", "tesla/model-s/plaid"]);
  });

  it("adds and removes without duplicating or overfilling", () => {
    const two = ["a/a/a", "b/b/b"];
    expect(withCar(two, "c/c/c")).toBe("/compare?car=a/a/a&car=b/b/b&car=c/c/c");
    expect(withCar(two, "a/a/a")).toBe("/compare?car=a/a/a&car=b/b/b");
    const full = ["a/a/a", "b/b/b", "c/c/c", "d/d/d"];
    expect(withCar(full, "e/e/e")).toBe(compareHref(full));
    expect(withoutCar(two, "a/a/a", { diff: true })).toBe("/compare?car=b/b/b&diff=1");
  });
});

describe("summariseDropped", () => {
  it("groups by reason in a stable order and de-duplicates values", () => {
    const summary = summariseDropped([
      { value: "x", reason: "invalid" },
      { value: "a/a/a", reason: "not-found" },
      { value: "x", reason: "invalid" },
      { value: "e/e/e", reason: "over-limit" },
    ]);
    expect(summary.map((group) => group.reason)).toEqual([
      "not-found",
      "invalid",
      "over-limit",
    ]);
    expect(summary[1]?.values).toEqual(["x"]);
    expect(summary[2]?.label).toContain(`${MAX_COMPARE}-car limit`);
  });
});
