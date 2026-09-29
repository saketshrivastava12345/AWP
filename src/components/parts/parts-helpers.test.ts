import { describe, expect, it } from "vitest";
import {
  firstSentence,
  matchesQuery,
  normalizeSearch,
  partsRouteSlugs,
  pickPartsRoute,
  usageLabel,
} from "./parts-helpers";

describe("pickPartsRoute", () => {
  const category = { slug: "braking" };
  const part = { slug: "brake-disc" };

  it("prefers the category when a slug resolves to both", () => {
    expect(pickPartsRoute(category, part)).toEqual({ kind: "category", category });
  });

  it("falls through to the part", () => {
    expect(pickPartsRoute(null, part)).toEqual({ kind: "part", part });
  });

  it("is null when neither exists, so the page can 404", () => {
    expect(pickPartsRoute(null, undefined)).toBeNull();
  });
});

describe("partsRouteSlugs", () => {
  it("lists categories first and never repeats a slug", () => {
    expect(partsRouteSlugs(["braking", "engine"], ["brake-disc", "engine"])).toEqual([
      "braking",
      "engine",
      "brake-disc",
    ]);
  });
});

describe("firstSentence", () => {
  it("takes the first sentence only", () => {
    expect(
      firstSentence("Converts heat into motion. It is made of iron. Very durable."),
    ).toBe("Converts heat into motion.");
  });

  it("does not split on decimals or abbreviations", () => {
    expect(firstSentence("A 3.5 litre unit, e.g. the EcoBoost. Next.")).toBe(
      "A 3.5 litre unit, e.g. the EcoBoost.",
    );
  });

  it("shortens a very long sentence at a word boundary", () => {
    const long = `${"word ".repeat(60)}end.`;
    const out = firstSentence(long, 40) ?? "";
    expect(out.length).toBeLessThanOrEqual(41);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/ …$/);
  });

  it("returns null for empty input", () => {
    expect(firstSentence(null)).toBeNull();
    expect(firstSentence("   ")).toBeNull();
  });
});

describe("text filter", () => {
  const haystack = normalizeSearch(
    "Carbon-Ceramic Brake Disc — Braking · Silicon carbide",
  );

  it("normalises case, accents and punctuation", () => {
    expect(normalizeSearch("Coil-Over  Damper")).toBe("coil over damper");
    expect(normalizeSearch("Huracán")).toBe("huracan");
  });

  it("matches every word in any order", () => {
    expect(matchesQuery(haystack, "disc carbon")).toBe(true);
    expect(matchesQuery(haystack, "CERAMIC")).toBe(true);
    expect(matchesQuery(haystack, "disc steel")).toBe(false);
  });

  it("treats an empty query as matching everything", () => {
    expect(matchesQuery(haystack, "   ")).toBe(true);
  });
});

describe("usageLabel", () => {
  it("only speaks when at least one car records the part", () => {
    expect(usageLabel(0)).toBeNull();
    expect(usageLabel(1)).toBe("Used by 1 catalogued car");
    expect(usageLabel(3)).toBe("Used by 3 catalogued cars");
  });
});
