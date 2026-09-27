import { describe, expect, it } from "vitest";
import type { ComparePickerOption } from "@/lib/queries/compare";
import {
  editDistance,
  fold,
  quickStarts,
  searchOptions,
  SIMILAR_POWER,
  suggestFor,
} from "./picker-logic";

// Fixture catalogue. Power figures are arbitrary test numbers.
function option(
  slug: string,
  fields: Partial<ComparePickerOption> & {
    manufacturer: string;
    model: string;
    variant: string;
  },
): ComparePickerOption {
  const [manufacturerSlug = ""] = slug.split("/");
  return {
    slug,
    variantId: slug,
    manufacturerSlug,
    flag: null,
    category: null,
    categorySlug: null,
    bodyType: "coupe",
    fuelType: "petrol",
    powerHp: null,
    yearStart: 2024,
    generation: null,
    imageUrl: null,
    ...fields,
  };
}

const gt3 = option("porsche/911/gt3", {
  manufacturer: "Porsche",
  model: "911",
  variant: "GT3",
  category: "Sports car",
  categorySlug: "sports-car",
  powerHp: 500,
  generation: "992",
});
const turbo = option("porsche/911/turbo-s", {
  manufacturer: "Porsche",
  model: "911",
  variant: "Turbo S",
  category: "Sports car",
  categorySlug: "sports-car",
  powerHp: 650,
});
const taycan = option("porsche/taycan/turbo-s", {
  manufacturer: "Porsche",
  model: "Taycan",
  variant: "Turbo S",
  category: "EV",
  categorySlug: "ev",
  fuelType: "electric",
  powerHp: 750,
});
const supra = option("toyota/gr-supra/3-0-manual", {
  manufacturer: "Toyota",
  model: "GR Supra",
  variant: "3.0 Manual",
  category: "Sports car",
  categorySlug: "sports-car",
  powerHp: 380,
});
const typeR = option("honda/civic-type-r/type-r", {
  manufacturer: "Honda",
  model: "Civic Type R",
  variant: "Type R",
  category: "Sports car",
  categorySlug: "sports-car",
  powerHp: 320,
});
const m3 = option("bmw/m3/m3-competition", {
  manufacturer: "BMW",
  model: "M3",
  variant: "M3 Competition",
  category: "Sedan",
  categorySlug: "sedan",
  powerHp: 510,
});
const plaid = option("tesla/model-s/plaid", {
  manufacturer: "Tesla",
  model: "Model S",
  variant: "Plaid",
  category: "EV",
  categorySlug: "ev",
  fuelType: "electric",
  powerHp: 1000,
});
const coupe = option("mclaren/750s/coupe", {
  manufacturer: "McLaren",
  model: "750S",
  variant: "Coupé",
  category: "Supercar",
  categorySlug: "supercar",
  powerHp: null,
});

const CATALOGUE = [gt3, turbo, taycan, supra, typeR, m3, plaid, coupe];

describe("search", () => {
  it("matches every word by prefix, across name fields", () => {
    expect(searchOptions(CATALOGUE, "911 gt").map((o) => o.slug)).toEqual([gt3.slug]);
    expect(searchOptions(CATALOGUE, "turbo s").map((o) => o.slug)).toEqual([
      turbo.slug,
      taycan.slug,
    ]);
  });

  it("tolerates one typo in longer words", () => {
    expect(searchOptions(CATALOGUE, "porche").map((o) => o.manufacturer)).toEqual([
      "Porsche",
      "Porsche",
      "Porsche",
    ]);
    expect(searchOptions(CATALOGUE, "teslla").map((o) => o.slug)).toEqual([plaid.slug]);
  });

  it("does not fuzz short words into unrelated cars", () => {
    expect(searchOptions(CATALOGUE, "bmx")).toEqual([]);
  });

  it("searches category, generation and fuel too, ranking name matches first", () => {
    expect(searchOptions(CATALOGUE, "992").map((o) => o.slug)).toEqual([gt3.slug]);
    const electric = searchOptions(CATALOGUE, "electric").map((o) => o.slug);
    expect(electric.sort()).toEqual([plaid.slug, taycan.slug].sort());
  });

  it("ignores accents and case", () => {
    expect(fold("Coupé")).toBe("coupe");
    expect(searchOptions(CATALOGUE, "COUPE").map((o) => o.slug)).toEqual([coupe.slug]);
  });

  it("returns the catalogue in order for an empty query", () => {
    expect(searchOptions(CATALOGUE, "   ", 3)).toEqual(CATALOGUE.slice(0, 3));
  });

  it("measures edit distance with an early exit", () => {
    expect(editDistance("porche", "porsche")).toBe(1);
    expect(editDistance("abc", "abc")).toBe(0);
    expect(editDistance("abcdef", "uvwxyz", 1)).toBe(2);
  });
});

describe("suggestions", () => {
  it("offers the same category, closest published power first", () => {
    const groups = suggestFor(gt3, CATALOGUE, new Set([gt3.slug]));
    const category = groups.find((group) => group.id === "category");
    expect(category?.title).toBe("Same category · Sports car");
    // Supra (380, gap 24%) and Turbo S (650, gap 23%) are close; Type R (320) last.
    expect(category?.options.map((o) => o.slug)).toEqual([
      turbo.slug,
      supra.slug,
      typeR.slug,
    ]);
  });

  it("never repeats a car across groups or suggests a selected one", () => {
    const groups = suggestFor(gt3, CATALOGUE, new Set([gt3.slug, turbo.slug]));
    const slugs = groups.flatMap((group) => group.options.map((o) => o.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).not.toContain(turbo.slug);
    expect(slugs).not.toContain(gt3.slug);
    const maker = groups.find((group) => group.id === "maker");
    expect(maker?.options.map((o) => o.slug)).toEqual([taycan.slug]);
  });

  it("offers similar published power from other categories", () => {
    const groups = suggestFor(gt3, CATALOGUE, new Set([gt3.slug]));
    const power = groups.find((group) => group.id === "power");
    // The M3 (510) is within 15 % of 500; the Plaid (1000) is not.
    expect(power?.options.map((o) => o.slug)).toEqual([m3.slug]);
    expect(SIMILAR_POWER).toBe(0.15);
  });

  it("skips the power group when the anchor has no published power", () => {
    const groups = suggestFor(coupe, CATALOGUE, new Set([coupe.slug]));
    expect(groups.some((group) => group.id === "power")).toBe(false);
  });
});

describe("quick starts", () => {
  it("pairs the closest-powered cars from different makers in the largest categories", () => {
    const starts = quickStarts(CATALOGUE, 4);
    expect(starts[0]?.category).toBe("Sports car");
    // Different makers only: Supra (380) vs Type R (320) is the closest pair,
    // listed more powerful first.
    const pair = [starts[0]?.a.slug, starts[0]?.b.slug];
    expect(pair).toEqual([supra.slug, typeR.slug]);
    // EV has two makers (Porsche, Tesla); sedan and supercar have one car each.
    expect(starts.map((start) => start.category)).toEqual(["Sports car", "EV"]);
  });
});
